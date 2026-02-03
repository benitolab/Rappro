import React, { useState, useEffect, useMemo } from 'react';
import { Upload, ArrowRight, CheckCircle, AlertCircle, FileText, RefreshCw, Download, Settings, ChevronRight, Check, Layers, X, Search, FileSpreadsheet, Trash2 } from 'lucide-react';

// --- Utilitaires ---

// Fonction de parsing CSV corrigée et robuste (State Machine)
const parseCSV = (text: string) => {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim() !== '');

  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';

  const parseLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

  return lines.slice(1).map((line, index) => {
    const matches = parseLine(line);
    const row: any = {};
    let hasData = false;

    headers.forEach((header, i) => {
      const val = matches[i] || '';
      row[header] = val;
      if (val.replace(/[";]/g, '').trim() !== '') hasData = true;
    });

    row._id = `row-${index}`;
    return hasData ? row : null;
  }).filter(row => row !== null);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

// --- Composants ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", disabled = false, icon: Icon }: { children: React.ReactNode, onClick?: () => void, variant?: string, disabled?: boolean, icon?: any }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-1";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400 disabled:opacity-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const FileUploader = ({ label, onDataLoaded, colorClass }: { label: string, onDataLoaded: (data: any[], name: string) => void, colorClass?: string }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const result = evt.target?.result as string;
          const data = parseCSV(result);
          onDataLoaded(data, file.name);
        } catch (err) {
          console.error("Erreur parsing", err);
          alert("Erreur lors de la lecture du fichier. Vérifiez le format CSV.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${fileName ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
      <input type="file" accept=".csv" onChange={handleFile} className="hidden" id={`file-${label}`} />
      <label htmlFor={`file-${label}`} className="cursor-pointer flex flex-col items-center gap-3">
        {fileName ? (
          <CheckCircle className="text-emerald-600" size={48} />
        ) : (
          <Upload className="text-slate-400" size={48} />
        )}
        <div>
          <h3 className="font-semibold text-slate-800">{label}</h3>
          <p className="text-sm text-slate-500">{fileName || "Glissez votre fichier CSV ou cliquez ici"}</p>
        </div>
      </label>
    </div>
  );
};

const ColumnMapper = ({ title, data, mapping, setMapping }: { title: string, data: any[], mapping: any, setMapping: Function }) => {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]).filter(k => k !== '_id');

  const updateMapping = (field: string, value: any) => {
    setMapping((prev: any) => ({ ...prev, [field]: value }));
  };

  const getPreviewAmount = () => {
    const row = data[0];
    if (mapping.mode === 'split') {
      const deb = row[mapping.debit] || '0';
      const cred = row[mapping.credit] || '0';
      return `Débit: ${deb} | Crédit: ${cred}`;
    }
    return row[mapping.amount] || '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
          <Settings size={18} /> Configuration : {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Colonne Date <span className="text-red-500">*</span></label>
          <select
            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            value={mapping.date}
            onChange={(e) => updateMapping('date', e.target.value)}
          >
            <option value="">-- Choisir --</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Colonne Libellé <span className="text-slate-400 font-normal text-xs">(Optionnel)</span></label>
          <select
            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            value={mapping.label}
            onChange={(e) => updateMapping('label', e.target.value)}
          >
            <option value="">-- Ignorer --</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            id={`split-${title}`}
            checked={mapping.mode === 'split'}
            onChange={(e) => updateMapping('mode', e.target.checked ? 'split' : 'single')}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor={`split-${title}`} className="text-sm font-semibold text-slate-700 cursor-pointer">
            Colonnes Débit / Crédit séparées ?
          </label>
        </div>

        {mapping.mode === 'single' ? (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Colonne Montant Unique</label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              value={mapping.amount}
              onChange={(e) => updateMapping('amount', e.target.value)}
            >
              <option value="">-- Choisir --</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Colonne Débit</label>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                value={mapping.debit}
                onChange={(e) => updateMapping('debit', e.target.value)}
              >
                <option value="">-- Choisir --</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Colonne Crédit</label>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                value={mapping.credit}
                onChange={(e) => updateMapping('credit', e.target.value)}
              >
                <option value="">-- Choisir --</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-200 mt-2">
        <p className="font-medium text-slate-600 mb-2">Aperçu de la première ligne :</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-500">
          <div><span className="font-bold">Date :</span> {data[0][mapping.date] || '-'}</div>
          <div><span className="font-bold">Libellé :</span> {mapping.label ? data[0][mapping.label] : '(Non mappé)'}</div>
          <div className="truncate"><span className="font-bold">Montant :</span> {getPreviewAmount()}</div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function RapprochementApp() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Results

  // Raw Data
  const [bankData, setBankData] = useState<any[]>([]);
  const [accData, setAccData] = useState<any[]>([]);
  const [bankFileName, setBankFileName] = useState("");
  const [accFileName, setAccFileName] = useState("");

  // Configuration Mappings
  const [bankMapping, setBankMapping] = useState({ date: '', label: '', amount: '', debit: '', credit: '', mode: 'single' });
  const [accMapping, setAccMapping] = useState({ date: '', label: '', amount: '', debit: '', credit: '', mode: 'single' });

  const [settings, setSettings] = useState({
    dayTolerance: 3,
    invertAccSign: true
  });

  // Results
  const [results, setResults] = useState<{
    matches: any[],
    unmatchedBank: any[],
    unmatchedAcc: any[]
  }>({
    matches: [],
    unmatchedBank: [],
    unmatchedAcc: []
  });

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set()); // NEW: Track ignored items

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  const handleBankLoad = (data: any[], name: string) => { setBankData(data); setBankFileName(name); };
  const handleAccLoad = (data: any[], name: string) => { setAccData(data); setAccFileName(name); };

  const cleanAmount = (val: any) => {
    if (typeof val !== 'string') return typeof val === 'number' ? val : 0;
    let clean = val.replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const partsFR = dateStr.split('/');
    if (partsFR.length === 3) return new Date(parseInt(partsFR[2]), parseInt(partsFR[1]) - 1, parseInt(partsFR[0]));
    return new Date(dateStr);
  };

  const getRowAmount = (row: any, mapping: any) => {
    if (mapping.mode === 'split') {
      const debit = cleanAmount(row[mapping.debit]);
      const credit = cleanAmount(row[mapping.credit]);
      return credit - debit;
    }
    return cleanAmount(row[mapping.amount]);
  };

  const runReconciliation = () => {
    setSelectedIds(new Set()); // Reset selection on new run
    setSearchQuery(""); // Reset search
    const matches: any[] = [];
    let unmatchedBank: any[] = [];
    let unmatchedAcc: any[] = [];

    // --- Préparation des données ---
    // On filtre les montants ~0 lors de la préparation
    const normBank = bankData.map(row => ({
      original: row,
      id: 'bank-' + row._id, // Préfixe pour unicité
      date: parseDate(row[bankMapping.date]),
      amount: getRowAmount(row, bankMapping),
      label: bankMapping.label ? row[bankMapping.label] : 'Sans libellé',
      matched: false
      label: bankMapping.label ? row[bankMapping.label] : 'Sans libellé',
      matched: false
    })).filter(item => Math.abs(item.amount) > 0.01 && !ignoredIds.has('bank-' + row._id));

    const normAcc = accData.map(row => ({
      original: row,
      id: 'acc-' + row._id, // Préfixe pour unicité
      date: parseDate(row[accMapping.date]),
      amount: getRowAmount(row, accMapping) * (settings.invertAccSign ? -1 : 1),
      label: accMapping.label ? row[accMapping.label] : 'Sans libellé',
      matched: false
    })).filter(item => Math.abs(item.amount) > 0.01 && !ignoredIds.has('acc-' + row._id));

    // --- PASSE 0 : Matches Spécifiques (EVI / Notre Virement) ---
    // Demande utilisateur : "FICHIER EVI REMISE EN BANQUE" correspond à "NOTRE VIREMENT"
    // Supporte 1-1 et 1-to-N avec tolérance 5 jours
    normBank.forEach(bItem => {
      if (bItem.matched) return;

      const isEvi = (l: string) => l.toUpperCase().includes('EVI') || l.toUpperCase().includes('REMISE');
      const isNotreVirement = (l: string) => l.toUpperCase().includes('NOTRE VIREMENT');

      const bLabel = bItem.label.toUpperCase();

      // On traite principalement Bank = EVI -> Compta = Notre Virement (ou inverse, mais focus EVI en banque)
      if (isEvi(bLabel) || isNotreVirement(bLabel)) {
        // Chercher les candidats en face (Notre Virement si EVI, EVI si Notre Virement)
        // Avec tolérance +/- 5 jours
        const TARGET_TOLERANCE = 5;

        const candidates = normAcc.filter(aItem => {
          if (aItem.matched) return false;
          const aLabel = aItem.label.toUpperCase();
          // Si Banque est EVI, on veut Notre Virement en face, et vice versa
          const isCompatible = (isEvi(bLabel) && isNotreVirement(aLabel)) || (isNotreVirement(bLabel) && isEvi(aLabel));
          if (!isCompatible) return false;

          const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);
          return dateDiff <= TARGET_TOLERANCE;
        });

        // Tentative 1-1
        const exactMatch = candidates.find(c => Math.abs(c.amount - bItem.amount) < 0.005);
        if (exactMatch) {
          exactMatch.matched = true;
          bItem.matched = true;
          matches.push({
            type: 'Specifique (1-1)',
            bank: bItem,
            relatedBankIds: [bItem.id],
            bankItems: [bItem],
            accItems: [exactMatch],
            deltaDays: Math.floor(Math.abs(bItem.date.getTime() - exactMatch.date.getTime()) / (1000 * 60 * 60 * 24))
          });
          return;
        }

        // Tentative 1-N (Une ligne EVI banque = Somme de plusieurs lignes Compta)
        // On groupe les candidats par jour ou on essaie de sommer tous les candidats valides ?
        // L'user dit "plusieurs ecriture de la meme date a plus ou moins 5 jours".
        // Simplification: On tente de voir si la SOMME de tous les candidats (ou un sous-groupe par date) match.

        if (candidates.length > 1) {
          // Essayons de grouper par date côté comptable
          const groupsByDate: any = {};
          candidates.forEach(c => {
            const dateKey = c.date.toDateString();
            if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
            groupsByDate[dateKey].push(c);
          });

          for (const dateKey in groupsByDate) {
            const group = groupsByDate[dateKey];
            const groupSum = group.reduce((sum: number, item: any) => sum + item.amount, 0);
            if (Math.abs(groupSum - bItem.amount) < 0.005) {
              bItem.matched = true;
              group.forEach((g: any) => g.matched = true);
              matches.push({
                type: 'Specifique (1-N)',
                bank: bItem,
                relatedBankIds: [bItem.id],
                bankItems: [bItem],
                accItems: group,
                deltaDays: Math.floor(Math.abs(bItem.date.getTime() - group[0].date.getTime()) / (1000 * 60 * 60 * 24))
              });
              return;
            }
          }
        }
      }
    });

    // --- PASSE 0.5 : L'inverse (Si EVI est en compta et Notre Virement en banque - moins probable mais possible) ---
    // (Non implémenté pour simplifier, le code ci-dessus gère le matching symétrique 1-1 mais focus 1-N EVI Banque)


    // --- PASSE 1 : Matching 1 pour 1 (Exact) ---
    normBank.forEach(bItem => {
      if (bItem.matched) return;

      const matchIndex = normAcc.findIndex(aItem => {
        if (aItem.matched) return false;

        const amountDiff = Math.abs(bItem.amount - aItem.amount);
        const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);

        return amountDiff < 0.005 && dateDiff <= settings.dayTolerance;
      });

      if (matchIndex !== -1) {
        normAcc[matchIndex].matched = true;
        bItem.matched = true;
        matches.push({
          type: '1-1',
          bank: bItem,
          relatedBankIds: [bItem.id], // NEW: Track source ID
          bankItems: [bItem],
          accItems: [normAcc[matchIndex]],
          deltaDays: Math.floor(Math.abs(bItem.date.getTime() - normAcc[matchIndex].date.getTime()) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // --- PASSE 2 : Matching 1 pour N (Regroupement par date) ---
    normBank.forEach(bItem => {
      if (bItem.matched) return;

      const candidates = normAcc.filter(aItem => {
        if (aItem.matched) return false;
        const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);
        return dateDiff <= settings.dayTolerance;
      });

      if (candidates.length > 1) {
        const groupsByDate: any = {};
        candidates.forEach(c => {
          const dateKey = c.date.toDateString();
          if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
          groupsByDate[dateKey].push(c);
        });

        for (const dateKey in groupsByDate) {
          const group = groupsByDate[dateKey];
          const groupSum = group.reduce((sum: number, item: any) => sum + item.amount, 0);

          const amountDiff = Math.abs(bItem.amount - groupSum);

          if (amountDiff < 0.005) {
            bItem.matched = true;
            group.forEach((g: any) => g.matched = true);

            matches.push({
              type: '1-N',
              bank: bItem,
              relatedBankIds: [bItem.id], // NEW: Track source ID
              bankItems: [bItem],
              accItems: group,
              deltaDays: Math.floor(Math.abs(bItem.date.getTime() - group[0].date.getTime()) / (1000 * 60 * 60 * 24))
            });
            break;
          }
        }
      }
    });

    // Finalisation
    unmatchedBank = normBank.filter(b => !b.matched);
    unmatchedAcc = normAcc.filter(a => !a.matched);

    setResults({ matches, unmatchedBank, unmatchedAcc });
    setStep(3);
    setResults({ matches, unmatchedBank, unmatchedAcc });
    setStep(3);
  };

  const handleIncrementalMatch = () => {
    // Copie profonde pour ne pas muter l'état directement pendant le calcul
    // On utilise JSON parse/stringify pour simplicité sur des objets simples, mais attention aux Dates.
    // Mieux vaut reconstruire proprement ou juste traiter comme des objets.
    // Ici, on va iterer sur les tableaux existants `results.unmatchedBank` et `results.unmatchedAcc`.

    // IMPORTANT: Les objets dans unmatchedBank/Acc ont déjà des Dates parsées.
    // Si on clone via JSON, on perd les Dates. On va cloner via map.

    let currentUnmatchedBank = results.unmatchedBank.map(item => ({ ...item, matched: false }));
    let currentUnmatchedAcc = results.unmatchedAcc.map(item => ({ ...item, matched: false }));

    const newMatches: any[] = [];

    // --- LOGIQUE DE MATCHING (Répliquée/Adaptée) ---

    // PASSE 0 : Matches Spécifiques (Updated for Incremental)
    currentUnmatchedBank.forEach(bItem => {
      if (bItem.matched) return;

      const isEvi = (l: string) => l.toUpperCase().includes('EVI') || l.toUpperCase().includes('REMISE');
      const isNotreVirement = (l: string) => l.toUpperCase().includes('NOTRE VIREMENT');

      const bLabel = bItem.label.toUpperCase();

      if (isEvi(bLabel) || isNotreVirement(bLabel)) {
        const TARGET_TOLERANCE = 5;

        const candidates = currentUnmatchedAcc.filter(aItem => {
          if (aItem.matched) return false;
          const aLabel = aItem.label.toUpperCase();
          const isCompatible = (isEvi(bLabel) && isNotreVirement(aLabel)) || (isNotreVirement(bLabel) && isEvi(aLabel));
          if (!isCompatible) return false;

          const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);
          return dateDiff <= TARGET_TOLERANCE;
        });

        // 1-1
        const exactMatch = candidates.find(c => Math.abs(c.amount - bItem.amount) < 0.005);
        if (exactMatch) {
          exactMatch.matched = true;
          bItem.matched = true;
          newMatches.push({
            type: 'Specifique (Relance 1-1)',
            bank: bItem,
            relatedBankIds: [bItem.id],
            bankItems: [bItem],
            accItems: [exactMatch],
            deltaDays: Math.floor(Math.abs(bItem.date.getTime() - exactMatch.date.getTime()) / (1000 * 60 * 60 * 24))
          });
          return;
        }

        // 1-N
        if (candidates.length > 1) {
          const groupsByDate: any = {};
          candidates.forEach(c => {
            const dateKey = c.date.toDateString();
            if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
            groupsByDate[dateKey].push(c);
          });

          for (const dateKey in groupsByDate) {
            const group = groupsByDate[dateKey];
            const groupSum = group.reduce((sum: number, item: any) => sum + item.amount, 0);
            if (Math.abs(groupSum - bItem.amount) < 0.005) {
              bItem.matched = true;
              group.forEach((g: any) => g.matched = true);
              newMatches.push({
                type: 'Specifique (Relance 1-N)',
                bank: bItem,
                relatedBankIds: [bItem.id],
                bankItems: [bItem],
                accItems: group,
                deltaDays: Math.floor(Math.abs(bItem.date.getTime() - group[0].date.getTime()) / (1000 * 60 * 60 * 24))
              });
              return;
            }
          }
        }
      }
    });

    // PASSE 1 : Exact 1-1
    currentUnmatchedBank.forEach(bItem => {
      if (bItem.matched) return;
      const matchIndex = currentUnmatchedAcc.findIndex(aItem => {
        if (aItem.matched) return false;
        const amountDiff = Math.abs(bItem.amount - aItem.amount);
        const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);
        return amountDiff < 0.005 && dateDiff <= settings.dayTolerance;
      });
      if (matchIndex !== -1) {
        currentUnmatchedAcc[matchIndex].matched = true;
        bItem.matched = true;
        newMatches.push({
          type: '1-1 (Relance)',
          bank: bItem,
          relatedBankIds: [bItem.id],
          bankItems: [bItem],
          accItems: [currentUnmatchedAcc[matchIndex]],
          deltaDays: Math.floor(Math.abs(bItem.date.getTime() - currentUnmatchedAcc[matchIndex].date.getTime()) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // PASSE 2 : Groupé
    currentUnmatchedBank.forEach(bItem => {
      if (bItem.matched) return;
      const candidates = currentUnmatchedAcc.filter(aItem => {
        if (aItem.matched) return false;
        const dateDiff = Math.abs(bItem.date.getTime() - aItem.date.getTime()) / (1000 * 60 * 60 * 24);
        return dateDiff <= settings.dayTolerance;
      });
      if (candidates.length > 1) {
        const groupsByDate: any = {};
        candidates.forEach(c => {
          const dateKey = c.date.toDateString();
          if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
          groupsByDate[dateKey].push(c);
        });
        for (const dateKey in groupsByDate) {
          const group = groupsByDate[dateKey];
          const groupSum = group.reduce((sum: number, item: any) => sum + item.amount, 0);
          const amountDiff = Math.abs(bItem.amount - groupSum);
          if (amountDiff < 0.005) {
            bItem.matched = true;
            group.forEach((g: any) => g.matched = true);
            newMatches.push({
              type: '1-N (Relance)',
              bank: bItem,
              relatedBankIds: [bItem.id],
              bankItems: [bItem],
              accItems: group,
              deltaDays: Math.floor(Math.abs(bItem.date.getTime() - group[0].date.getTime()) / (1000 * 60 * 60 * 24))
            });
            break;
          }
        }
      }
    });

    if (newMatches.length === 0) {
      alert("Aucun nouveau rapprochement trouvé avec ces paramètres.");
      return;
    }

    setResults(prev => ({
      matches: [...newMatches, ...prev.matches],
      unmatchedBank: currentUnmatchedBank.filter(b => !b.matched),
      unmatchedAcc: currentUnmatchedAcc.filter(a => !a.matched)
    }));
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type;Source;Date;Libelle;Montant;Note\n";

    results.matches.forEach(m => {
      csvContent += `Rapproche (${m.type});Banque;${m.bank.date.toLocaleDateString()};"${m.bank.label}";${m.bank.amount};${m.type === '1-N' ? 'Regroupement' : 'Unique'}\n`;
      m.accItems.forEach((acc: any) => {
        csvContent += `Rapproche (${m.type});Compta;${acc.date.toLocaleDateString()};"${acc.label}";${acc.amount};${m.type === '1-N' ? 'Detail du regroupement' : 'Unique'}\n`;
      });
    });

    results.unmatchedBank.forEach(i => {
      csvContent += `Ecart;Banque;${i.date.toLocaleDateString()};"${i.label}";${i.amount};Non trouvé en compta\n`;
    });
    results.unmatchedAcc.forEach(i => {
      csvContent += `Ecart;Compta;${i.date.toLocaleDateString()};"${i.label}";${i.amount};Non trouvé en banque\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resultat_rapprochement.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBankXLS = () => {
    const reconciledIds = new Set<string>();
    results.matches.forEach(m => {
      if (m.relatedBankIds) {
        m.relatedBankIds.forEach((id: string) => reconciledIds.add(id));
      } else if (m.bank && m.bank.id) {
        reconciledIds.add(m.bank.id);
      }
    });

    const headers = bankData.length > 0 ? Object.keys(bankData[0]).filter(k => k !== '_id') : [];

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(h => `<th style="background-color:#f3f4f6; border:1px solid #ccc;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
    `;

    bankData.forEach(row => {
      const rowId = 'bank-' + row._id;
      const isReconciled = reconciledIds.has(rowId);
      // Green background for reconciled rows (light green)
      const bgStyle = isReconciled ? 'background-color:#d1fae5;' : '';

      html += `<tr style="${bgStyle}">`;
      headers.forEach(h => {
        html += `<td style="border:1px solid #eee; mso-number-format:\@;">${row[h]}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `banque_rapprochee_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isMappingValid = (mapping: any) => {
    if (!mapping.date) return false;
    if (mapping.mode === 'single') return !!mapping.amount;
    return !!mapping.debit && !!mapping.credit;
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getSelectionTotals = () => {
    const selectedBank = results.unmatchedBank.filter(t => selectedIds.has(t.id));
    const selectedAcc = results.unmatchedAcc.filter(t => selectedIds.has(t.id));
    const totalBank = selectedBank.reduce((sum, t) => sum + t.amount, 0);
    const totalAcc = selectedAcc.reduce((sum, t) => sum + t.amount, 0);
    return { totalBank, totalAcc, countBank: selectedBank.length, countAcc: selectedAcc.length };
  };

  const selectionTotals = getSelectionTotals();

  const handleManualMatch = () => {
    const selectedBank = results.unmatchedBank.filter(t => selectedIds.has(t.id));
    const selectedAcc = results.unmatchedAcc.filter(t => selectedIds.has(t.id));

    const { totalBank, totalAcc } = selectionTotals;

    if (Math.abs(totalBank - totalAcc) > 0.005) return;

    // Création de la transaction banque représentative
    let representativeBank = selectedBank[0];
    if (selectedBank.length > 1) {
      representativeBank = {
        ...selectedBank[0],
        label: `Manuel: ${selectedBank.map(b => b.label).join(' + ').substring(0, 40)}...`,
        amount: totalBank
      };
    } else if (selectedBank.length === 0) {
      representativeBank = {
        id: `manual-${Date.now()}`,
        date: selectedAcc[0]?.date || new Date(),
        label: "Ajustement Manuel",
        amount: 0,
        matched: true,
        original: null
      } as any;
    }

    const relatedBankIds = selectedBank.map(b => b.id);

    const newMatch = {
      type: 'Manuel',
      bank: representativeBank,
      relatedBankIds: relatedBankIds, // NEW: Track all involved bank IDs
      bankItems: selectedBank,
      accItems: selectedAcc,
      deltaDays: 0
    };

    setResults(prev => ({
      matches: [newMatch, ...prev.matches],
      unmatchedBank: prev.unmatchedBank.filter(t => !selectedIds.has(t.id)),
      unmatchedAcc: prev.unmatchedAcc.filter(t => !selectedIds.has(t.id))
    }));
    setSelectedIds(new Set());
    setResults(prev => ({
      matches: [newMatch, ...prev.matches],
      unmatchedBank: prev.unmatchedBank.filter(t => !selectedIds.has(t.id)),
      unmatchedAcc: prev.unmatchedAcc.filter(t => !selectedIds.has(t.id))
    }));
    setSelectedIds(new Set());
  };

  const handleIgnore = () => {
    const newIgnored = new Set(ignoredIds);
    selectedIds.forEach(id => newIgnored.add(id));
    setIgnoredIds(newIgnored);

    // Remove from unmatched lists directly
    setResults(prev => ({
      ...prev,
      unmatchedBank: prev.unmatchedBank.filter(t => !selectedIds.has(t.id)),
      unmatchedAcc: prev.unmatchedAcc.filter(t => !selectedIds.has(t.id))
    }));
    setSelectedIds(new Set());
  };

  const handleUnmatch = (match: any) => {
    const bankItemsToRestore = match.bankItems || (match.bank ? [match.bank] : []);

    bankItemsToRestore.forEach((i: any) => i.matched = false);
    match.accItems.forEach((i: any) => i.matched = false);

    setResults(prev => ({
      matches: prev.matches.filter(m => m !== match),
      unmatchedBank: [...prev.unmatchedBank, ...bankItemsToRestore].sort((a: any, b: any) => a.date.getTime() - b.date.getTime()),
      unmatchedAcc: [...prev.unmatchedAcc, ...match.accItems].sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
    }));
  };

  // --- Filtering Logic ---
  const filteredMatches = useMemo(() => {
    if (!searchQuery) return results.matches;
    const lower = searchQuery.toLowerCase();
    return results.matches.filter(m =>
      m.bank.label.toLowerCase().includes(lower) ||
      m.bank.amount.toString().includes(lower) ||
      m.bank.date.toLocaleDateString().includes(lower) ||
      m.accItems.some((acc: any) =>
        acc.label.toLowerCase().includes(lower) ||
        acc.amount.toString().includes(lower)
      )
    );
  }, [results.matches, searchQuery]);

  const filteredUnmatchedBank = useMemo(() => {
    if (!searchQuery) return results.unmatchedBank;
    const lower = searchQuery.toLowerCase();
    return results.unmatchedBank.filter(item =>
      item.label.toLowerCase().includes(lower) ||
      item.amount.toString().includes(lower) ||
      item.date.toLocaleDateString().includes(lower)
    );
  }, [results.unmatchedBank, searchQuery]);

  const filteredUnmatchedAcc = useMemo(() => {
    if (!searchQuery) return results.unmatchedAcc;
    const lower = searchQuery.toLowerCase();
    return results.unmatchedAcc.filter(item =>
      item.label.toLowerCase().includes(lower) ||
      item.amount.toString().includes(lower) ||
      item.date.toLocaleDateString().includes(lower)
    );
  }, [results.unmatchedAcc, searchQuery]);

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="RAPPRO FACILE Logo" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-indigo-900">Rapprochement Bancaire</h1>
              <p className="text-slate-500 mt-1">Outil autonome (1-1 et Regroupements)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm">
            <span className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
            Étape {step} / 3
          </div>
        </header>

        {/* STEP 1: IMPORT */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <FileUploader label="Fichier Banque (.csv)" onDataLoaded={handleBankLoad} />
              <FileUploader label="Fichier Comptable (.csv)" onDataLoaded={handleAccLoad} />
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!bankData.length || !accData.length}
                onClick={() => setStep(2)}
                icon={ArrowRight}
              >
                Configurer les colonnes
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: MAPPING & CONFIG */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <ColumnMapper
                  title="Fichier Banque"
                  data={bankData}
                  mapping={bankMapping}
                  setMapping={setBankMapping}
                />
              </Card>
              <Card className="p-6 border-l-4 border-l-orange-500">
                <ColumnMapper
                  title="Fichier Comptable"
                  data={accData}
                  mapping={accMapping}
                  setMapping={setAccMapping}
                />
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Settings size={18} /> Paramètres de lettrage</h3>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-500 flex-shrink-0" />
                  <p><strong>Passe 1 :</strong> Rapprochement exact (1 ligne Banque = 1 ligne Compta)</p>
                </div>
                <div className="flex items-start gap-2">
                  <Layers size={16} className="mt-0.5 text-indigo-500 flex-shrink-0" />
                  <p><strong>Passe 2 (Nouveau) :</strong> Regroupement par date (1 ligne Banque = Somme des lignes Compta du même jour)</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Tolérance Date (jours)</label>
                  <input
                    type="number"
                    value={settings.dayTolerance}
                    onChange={(e) => setSettings({ ...settings, dayTolerance: parseInt(e.target.value) })}
                    className="w-20 p-2 border border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="invertSign"
                    checked={settings.invertAccSign}
                    onChange={(e) => setSettings({ ...settings, invertAccSign: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <label htmlFor="invertSign" className="text-sm font-medium cursor-pointer">
                    Inverser le signe Comptable (Crédit = +)
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Retour</Button>
              <Button
                disabled={!isMappingValid(bankMapping) || !isMappingValid(accMapping)}
                onClick={runReconciliation}
                icon={RefreshCw}
              >
                Lancer le Rapprochement
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par date, libellé ou montant..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Incremental Matching Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-900 font-medium">
                <RefreshCw size={20} />
                <span>Options de Rapprochement :</span>
              </div>
              <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
                <label className="text-sm font-medium text-slate-600">Tolérance Date (jours)</label>
                <input
                  type="number"
                  value={settings.dayTolerance}
                  onChange={(e) => setSettings({ ...settings, dayTolerance: parseInt(e.target.value) || 0 })}
                  className="w-16 p-2 border border-slate-300 rounded text-center"
                />
              </div>
              <Button variant="primary" onClick={handleIncrementalMatch} icon={Layers}>
                Relancer sur les écarts restants
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 flex items-center justify-between bg-emerald-50 border-emerald-200">
                <div>
                  <p className="text-emerald-700 font-medium">Écritures lettrées</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-emerald-800">{results.matches.length}</p>
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-1 rounded-full">
                      dont {results.matches.filter(m => m.type === '1-N').length} groupés
                    </span>
                  </div>
                </div>
                <CheckCircle className="text-emerald-500 opacity-50" size={40} />
              </Card>
              <Card className="p-6 flex items-center justify-between bg-white">
                <div>
                  <p className="text-slate-500 font-medium">Reste en Banque</p>
                  <p className="text-3xl font-bold text-slate-800">{results.unmatchedBank.length}</p>
                  <p className="text-xs text-slate-400">Non trouvé en compta</p>
                </div>
                <AlertCircle className="text-orange-400 opacity-50" size={40} />
              </Card>
              <Card className="p-6 flex items-center justify-between bg-white">
                <div>
                  <p className="text-slate-500 font-medium">Reste en Compta</p>
                  <p className="text-3xl font-bold text-slate-800">{results.unmatchedAcc.length}</p>
                  <p className="text-xs text-slate-400">Non débité en banque</p>
                </div>
                <AlertCircle className="text-blue-400 opacity-50" size={40} />
              </Card>
            </div>

            {/* Tables */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Ecarts Banque */}
              <Card className="flex flex-col h-96">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Écarts Banque ({filteredUnmatchedBank.length})</h3>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">À justifier</span>
                </div>
                <div className="overflow-auto flex-1 p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Libellé</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnmatchedBank.map((item, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedIds.has(item.id) ? 'bg-indigo-50' : ''}`}>
                          <td className="px-4 py-2">
                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">{item.date.toLocaleDateString()}</td>
                          <td className="px-4 py-2 truncate max-w-xs" title={item.label}>{item.label}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                      {filteredUnmatchedBank.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun résultat.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Ecarts Compta */}
              <Card className="flex flex-col h-96">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Écarts Comptabilité ({filteredUnmatchedAcc.length})</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">En attente</span>
                </div>
                <div className="overflow-auto flex-1 p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Libellé</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnmatchedAcc.map((item, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedIds.has(item.id) ? 'bg-indigo-50' : ''}`}>
                          <td className="px-4 py-2">
                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer" />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">{item.date.toLocaleDateString()}</td>
                          <td className="px-4 py-2 truncate max-w-xs" title={item.label}>{item.label}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                      {filteredUnmatchedAcc.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun résultat.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Matched Table (With Grouping) */}
            <Card>
              <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <h3 className="font-bold text-slate-700">Détail des Rapprochements ({filteredMatches.length})</h3>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Date Bq</th>
                      <th className="px-4 py-3">Libellé Banque</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3">Détail Compta</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map((m, idx) => (
                      <tr key={idx} className={`border-b border-slate-100 ${m.type === '1-N' ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-emerald-50/30'}`}>
                        <td className="px-4 py-2 text-slate-500 align-top pt-3">{m.bank.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-slate-700 align-top pt-3 truncate max-w-[200px]" title={m.bank.label}>{m.bank.label}</td>
                        <td className="px-4 py-2 text-center align-top pt-3">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {m.type === '1-N' ? (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Layers size={10} /> Groupé
                              </span>
                            ) : (
                              <span className="text-emerald-400"><Check size={14} /></span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {/* Affichage intelligent du détail comptable */}
                          {m.accItems.length === 1 ? (
                            <div className="truncate max-w-[250px] pt-1" title={m.accItems[0].label}>{m.accItems[0].label}</div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-500 border-b border-slate-200 pb-1 mb-1">
                                Total de {m.accItems.length} écritures :
                              </p>
                              {m.accItems.map((acc: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs text-slate-600">
                                  <span className="truncate max-w-[150px]">{acc.label}</span>
                                  <span className="font-mono">{formatCurrency(acc.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium text-emerald-700 align-top pt-3">{formatCurrency(m.bank.amount)}</td>
                        <td className="px-4 py-2 text-center align-top pt-2">
                          <button onClick={() => handleUnmatch(m)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Supprimer ce rapprochement">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredMatches.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun rapprochement correspondant à votre recherche.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>Revoir la config</Button>
              <div className="flex gap-2">
                <Button variant="success" onClick={exportBankXLS} icon={FileSpreadsheet}>Fichier Banque Vert (.xls)</Button>
                <Button variant="primary" onClick={exportCSV} icon={Download}>Rapport complet (.csv)</Button>
              </div>
            </div>

            {/* Sticky Selection Bar */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Banque ({selectionTotals.countBank})</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(selectionTotals.totalBank)}</span>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Compta ({selectionTotals.countAcc})</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(selectionTotals.totalAcc)}</span>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="flex flex-col mr-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Écart</span>
                  <span className={`font-mono font-bold text-lg ${Math.abs(selectionTotals.totalBank - selectionTotals.totalAcc) < 0.005 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {formatCurrency(selectionTotals.totalBank - selectionTotals.totalAcc)}
                  </span>
                </div>

                <button
                  onClick={handleManualMatch}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors animate-in zoom-in"
                >
                  <Check size={18} />
                  Rapprocher
                </button>
                )}

                <button
                  onClick={handleIgnore}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ml-2"
                  title="Retirer ces lignes du rapprochement (ignorer)"
                >
                  <Trash2 size={18} />
                  Ignorer
                </button>

                <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div >
  );
}