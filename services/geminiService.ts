import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction, MatchGroup, TransactionSource } from "../types";

// Schema definition for the model output
const matchResultSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      bankTransactionId: { type: Type.STRING, description: "ID of the bank transaction matched (if any)" },
      accountingTransactionIds: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of accounting transaction IDs that match the bank transaction"
      },
      matchType: { type: Type.STRING, enum: ["GROUPED", "FUZZY"], description: "Type of match found" },
      reasoning: { type: Type.STRING, description: "Brief explanation of why these match (e.g. 'Sum of checks matches deposit')" },
      confidence: { type: Type.NUMBER, description: "Confidence score 0.0 to 1.0" }
    },
    required: ["accountingTransactionIds", "matchType", "confidence"]
  }
};

export const findSmartMatches = async (
  unmatchedBank: Transaction[], 
  unmatchedAccounting: Transaction[]
): Promise<MatchGroup[]> => {
  if (unmatchedBank.length === 0 || unmatchedAccounting.length === 0) {
    return [];
  }

  // To save tokens, we minimize the data sent.
  const bankData = unmatchedBank.map(t => ({ id: t.id, dt: t.date, desc: t.description, amt: t.amount }));
  const accData = unmatchedAccounting.map(t => ({ id: t.id, dt: t.date, desc: t.description, amt: t.amount }));

  const prompt = `
    Tu es un expert comptable. Effectue le rapprochement bancaire sur ces écritures restantes.
    
    Données Banque: ${JSON.stringify(bankData)}
    Données Compta: ${JSON.stringify(accData)}

    Règles:
    1. Trouve les correspondances où les descriptions sont différentes mais le sens est le même (ex: "CHQ 502" vs "Cheque client").
    2. Trouve les REGROUPEMENTS (Important): Plusieurs écritures comptables dont la SOMME est égale à une écriture bancaire (ou inversement), à une date proche (+/- 5 jours).
    3. Ignore les écarts minimes (< 0.05).
    
    Retourne uniquement un tableau JSON respectant le schema fourni.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: matchResultSchema,
        temperature: 0.1, // Low temp for logic
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const rawMatches = JSON.parse(jsonText);
    const matches: MatchGroup[] = [];

    for (const raw of rawMatches) {
        // Hydrate data back to full objects
        const bankTx = unmatchedBank.find(t => t.id === raw.bankTransactionId);
        const accTxs = unmatchedAccounting.filter(t => raw.accountingTransactionIds.includes(t.id));

        if (accTxs.length > 0) {
            let totalAcc = accTxs.reduce((sum, t) => sum + t.amount, 0);
            let diff = bankTx ? Math.abs(bankTx.amount - totalAcc) : 0;

            matches.push({
                id: `ai-match-${Math.random()}`,
                bankTransaction: bankTx,
                accountingTransactions: accTxs,
                type: raw.matchType as 'GROUPED' | 'FUZZY',
                confidence: raw.confidence,
                reasoning: raw.reasoning,
                difference: diff
            });
        }
    }

    return matches;

  } catch (error) {
    console.error("Gemini Matching Error:", error);
    return [];
  }
};
