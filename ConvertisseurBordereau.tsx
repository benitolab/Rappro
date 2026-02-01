import React, { useState, useEffect } from 'react';
import { Upload, FileText, Printer, Download, PlusCircle, Trash2, Calendar, CreditCard, Landmark } from 'lucide-react';

const ConvertisseurBordereau = () => {
    const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
    const [bordereauDate, setBordereauDate] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [manualName, setManualName] = useState("");
    const [manualAmount, setManualAmount] = useState("");

    // Configuration Bancaire
    const [iban, setIban] = useState("FR7617807000113549686510995");
    const [bic, setBic] = useState("CCBPFRPPTLS");

    useEffect(() => {
        // Init date if not set
        if (!bordereauDate && parsedTransactions.length === 0) {
            // Wait for first interaction or sets it to today on load if preferred?
            // User code sets it when parsing or when manual entry starts.
        }
    }, []);

    const totalSum = parsedTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            processBordereauV6(text);
        };
        reader.readAsText(file);
    };

    const processBordereauV6 = (text: string) => {
        const lines = text.split('\n');
        let newTransactions: any[] = [];
        let newLogs: string[] = [];
        let detectedDate = null;
        let ignoredCount = 0;

        // 1. DATE
        const dateRegex = /AL DU\s*:\s*(\d{1,2})\s+(\d{1,2})\s+(\d{4})/i;
        for (let line of lines) {
            const match = line.match(dateRegex);
            if (match) {
                detectedDate = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                break;
            }
        }

        if (!detectedDate) {
            const today = new Date();
            detectedDate = today.toISOString().split('T')[0];
        }
        setBordereauDate(detectedDate);

        // 2. PARSING
        let headerFound = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            if (line.includes("NOM DESTINATAIRE") && line.includes("MONTANT") && line.includes(":")) {
                headerFound = true;
                continue;
            }
            if (!headerFound) continue;

            if (line.match(/^[-_=]+$/) || line.includes("LOGEMENT/PRET")) continue;
            if (line.includes("TOTAL PAIEMENT") || line.includes("AUTRES RETENUES")) {
                newLogs.push(`Ligne de Total ignorée -> ${line.substring(0, 50)}...`);
                ignoredCount++;
                continue;
            }

            if (line.startsWith(":")) {
                const parts = line.split(":");
                let cleanParts = parts.map(p => p.trim());
                let rawName = cleanParts[3];

                if (!/[a-zA-Z]/.test(rawName)) {
                    newLogs.push(`Ignoré (Pas de lettres dans le nom) -> ${line.substring(0, 50)}...`);
                    ignoredCount++;
                    continue;
                }

                let rawAmount = null;
                for (let k = cleanParts.length - 1; k >= 0; k--) {
                    let val = cleanParts[k];
                    if (/^[\d\s,.]+$/.test(val) && val.length > 0) {
                        rawAmount = val;
                        break;
                    }
                }

                if (rawName && rawAmount && !rawName.includes("TOTAL") && !rawName.includes("RETENUES")) {
                    let amountStr = rawAmount.replace(/\s/g, '').replace(',', '.');
                    amountStr = amountStr.replace(/[^\d.-]/g, '');
                    const amount = parseFloat(amountStr);

                    if (!isNaN(amount) && amount > 0) {
                        const motif = `VIREMENT ${rawName.substring(0, 15)}`;
                        newTransactions.push({
                            name: rawName,
                            amount: amount,
                            motif: motif
                        });
                    } else {
                        newLogs.push(`Montant invalide: ${amountStr} -> ${line.substring(0, 50)}...`);
                        ignoredCount++;
                    }
                } else {
                    newLogs.push(`Nom ou Montant non trouvé -> ${line.substring(0, 50)}...`);
                    ignoredCount++;
                }
            }
        }

        setParsedTransactions(newTransactions); // Replace existing? User code says "généralement on remplace tout lors d'un nouvel upload"
        setDebugLogs(newLogs);
    };

    const addManualTransaction = () => {
        const name = manualName.trim().toUpperCase();
        const amount = parseFloat(manualAmount);

        if (name && !isNaN(amount) && amount > 0) {
            setParsedTransactions(prev => [...prev, {
                name: name,
                amount: amount,
                motif: `VIREMENT ${name.substring(0, 15)}`
            }]);
            setManualName("");
            setManualAmount("");

            if (!bordereauDate) {
                const today = new Date();
                setBordereauDate(today.toISOString().split('T')[0]);
            }
        } else {
            alert("Merci de remplir un Nom valide et un Montant supérieur à 0.");
        }
    };

    const removeTransaction = (index: number) => {
        setParsedTransactions(prev => prev.filter((_, i) => i !== index));
    };

    const downloadXML = () => {
        const now = new Date();
        const creationDateTime = now.toISOString().split('.')[0];
        const dateToUse = bordereauDate || now.toISOString().split('T')[0];
        const msgId = "GEN-" + Math.floor(Math.random() * 1000000);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.02">
<BkToCstmrDbtCdtNtfctn>
<GrpHdr>
<MsgId>${msgId}</MsgId>
<CreDtTm>${creationDateTime}</CreDtTm>
</GrpHdr>
<Ntfctn>
<Id>${msgId}-NTF</Id>
<CreDtTm>${creationDateTime}</CreDtTm>
<Acct>
<Id><IBAN>${iban}</IBAN></Id>
<Ccy>EUR</Ccy>
<Nm>SARL STARIMMO</Nm>
<Svcr><FinInstnId><BIC>${bic}</BIC></FinInstnId></Svcr>
</Acct>
<TxsSummry>
<TtlCdtNtries>
<NbOfNtries>${parsedTransactions.length}</NbOfNtries>
<Sum>${totalSum.toFixed(2)}</Sum>
</TtlCdtNtries>
<TtlDbtNtries><NbOfNtries>0</NbOfNtries><Sum>0</Sum></TtlDbtNtries>
</TxsSummry>`;

        parsedTransactions.forEach((tx) => {
            const refId = Math.random().toString(36).substring(2, 9).toUpperCase();

            xml += `
<Ntry>
<Amt Ccy="EUR">${tx.amount.toFixed(2)}</Amt>
<CdtDbtInd>CRDT</CdtDbtInd>
<Sts>BOOK</Sts>
<BookgDt><Dt>${dateToUse}</Dt></BookgDt>
<ValDt><Dt>${dateToUse}</Dt></ValDt>
<BkTxCd>
<Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
<Prtry><Cd>05</Cd><Issr>CFONB</Issr></Prtry>
</BkTxCd>
<NtryDtls>
<TxDtls>
<Refs>
<AcctSvcrRef>${refId}</AcctSvcrRef>
<EndToEndId>${escapeXml(tx.motif.substring(0, 35))}</EndToEndId>
</Refs>
<AmtDtls><InstdAmt><Amt Ccy="EUR">${tx.amount.toFixed(2)}</Amt></InstdAmt></AmtDtls>
<RltdPties><Dbtr><Nm>${escapeXml(tx.name.substring(0, 70))}</Nm></Dbtr></RltdPties>
<RmtInf><Ustrd>${escapeXml(tx.motif)}</Ustrd></RmtInf>
</TxDtls>
</NtryDtls>
</Ntry>`;
        });

        xml += `
</Ntfctn>
</BkToCstmrDbtCdtNtfctn>
</Document>`;

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BP_IMPORT_${dateToUse}_${msgId}.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const escapeXml = (unsafe: string) => {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "--/--/----";
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Print styles need to be globally injected or handled via CSS classes.
    // Since we are in React, we can use a class on the body or a specific print container.
    // However, window.print() prints the whole window. We need to hide everything else.
    // The user provided CSS: @media print { body * { visibility: hidden; } #printableArea, #printableArea * { visibility: visible; } ... }

    // In React SPA, this is tricky because 'body *' hides the App root. 
    // We can use a style tag injected into the component.

    return (
        <div className="bg-slate-100 min-h-screen text-slate-800 font-sans p-6">
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background-color: white;
                        padding: 20px;
                        color: black;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                `}
            </style>

            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden no-print">
                {/* Header */}
                <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="mr-2" /> Convertisseur Bordereau V7
                        </h1>
                        <p className="text-indigo-200 text-sm mt-1">Import CAF + Saisie Manuelle + Impression</p>
                    </div>
                    <div className="text-right text-xs text-indigo-300">
                        <p>IBAN: ...{iban.slice(-4)}</p>
                        <p>BIC: {bic.substring(0, 4)}...</p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Configuration */}
                    <div className="mb-6 border-b pb-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-700">1. Paramètres Bancaires</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">IBAN (Compte Créditeur)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={iban}
                                        onChange={(e) => setIban(e.target.value)}
                                        className="w-full pl-10 p-2 border rounded bg-slate-50 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">BIC (Banque)</label>
                                <div className="relative">
                                    <Landmark className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={bic}
                                        onChange={(e) => setBic(e.target.value)}
                                        className="w-full pl-10 p-2 border rounded bg-slate-50 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-2 text-slate-700">2. Importer le Fichier TXT (CAF)</h2>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="fileInput" className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-indigo-50 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="text-3xl text-indigo-400 mb-2" size={40} />
                                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Cliquez pour charger le fichier TXT</span></p>
                                </div>
                                <input id="fileInput" type="file" className="hidden" accept=".txt" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>

                    {/* Info Date Détectée */}
                    {bordereauDate && (
                        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center">
                                <Calendar className="text-yellow-600 mr-3" />
                                <div>
                                    <p className="text-sm text-yellow-700">
                                        Date du fichier : <strong className="text-lg text-yellow-900">{formatDate(bordereauDate)}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Manual Entry Section */}
                    <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-200">
                        <h2 className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-2">
                            <PlusCircle size={20} /> 3. Ajout Manuel de Virement (Optionnel)
                        </h2>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-blue-600 mb-1 uppercase">Nom du Destinataire</label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="EX: MME DUPONT JEANNE"
                                    className="w-full p-2 border rounded border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="w-40">
                                <label className="block text-xs font-bold text-blue-600 mb-1 uppercase">Montant Net (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-2 border rounded border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                                />
                            </div>
                            <button onClick={addManualTransaction} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition flex items-center gap-2">
                                <PlusCircle size={18} /> AJOUTER
                            </button>
                        </div>
                    </div>

                    {/* Debug Info */}
                    {debugLogs.length > 0 && (
                        <div className="mt-4 mb-4 p-4 bg-red-50 text-red-700 text-xs rounded font-mono max-h-40 overflow-auto">
                            <p className="font-bold">Lignes ignorées (Debug) :</p>
                            <ul className="list-disc pl-5 mt-1">
                                {debugLogs.map((log, idx) => <li key={idx}>{log}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section (Printable + Actions) */}
            {(parsedTransactions.length > 0) && (
                <div className="max-w-5xl mx-auto mt-6">
                    {/* Zone Imprimable */}
                    <div className="print-area bg-white p-8 rounded-xl shadow-lg mb-6 border border-slate-200">
                        <div className="flex justify-between items-end mb-4 border-b-2 border-slate-300 pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Liste des Virements à intégrer</h2>
                                <p className="text-sm text-slate-500">Date de valeur : <span>{formatDate(bordereauDate)}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-600">Nombre de lignes : <span className="font-bold text-indigo-600">{parsedTransactions.length}</span></p>
                                <p className="text-2xl font-bold text-green-700">{totalSum.toFixed(2)} €</p>
                            </div>
                        </div>

                        <div className="overflow-hidden border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-white uppercase bg-slate-600">
                                    <tr>
                                        <th className="px-4 py-3">Nom Destinataire</th>
                                        <th className="px-4 py-3">Référence (Motif)</th>
                                        <th className="px-4 py-3 text-right">Montant</th>
                                        <th className="px-4 py-3 text-center w-10 no-print">Act.</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {parsedTransactions.map((tx, index) => (
                                        <tr key={index} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium text-slate-900">{tx.name}</td>
                                            <td className="px-4 py-2 text-slate-500 text-xs">{tx.motif}</td>
                                            <td className="px-4 py-2 text-right font-mono font-bold">{tx.amount.toFixed(2)} €</td>
                                            <td className="px-4 py-2 text-center no-print">
                                                <button onClick={() => removeTransaction(index)} className="text-red-400 hover:text-red-600 transition" title="Supprimer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-400 text-center hidden print:block">
                            Document généré automatiquement - SARL STARIMMO
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 no-print">
                        <button onClick={() => window.print()} className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center gap-2 transition">
                            <Printer size={20} /> IMPRIMER LA LISTE
                        </button>
                        <button onClick={downloadXML} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded shadow flex items-center justify-center gap-2 transition transform hover:scale-[1.01]">
                            <Download size={20} /> TÉLÉCHARGER XML BANQUE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConvertisseurBordereau;
