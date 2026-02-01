import React from 'react';
import { MatchGroup, Transaction, TransactionSource } from '../types';

interface ResultsTableProps {
  matches: MatchGroup[];
  unmatchedBank: Transaction[];
  unmatchedAccounting: Transaction[];
}

const CurrencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const DateFormatter = new Intl.DateTimeFormat('fr-FR');

export const ResultsTable: React.FC<ResultsTableProps> = ({ matches, unmatchedBank, unmatchedAccounting }) => {
  
  return (
    <div className="space-y-8">
        
      {/* Matches Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-green-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Écritures Rapprochées ({matches.length})
            </h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Banque (Date / Libellé / Montant)</th>
                        <th className="px-6 py-3">Comptabilité (Date / Libellé / Montant)</th>
                        <th className="px-6 py-3 text-right">Écart</th>
                        <th className="px-6 py-3 text-center">Confiance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {matches.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 group">
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    m.type === 'EXACT' ? 'bg-blue-100 text-blue-800' : 
                                    m.type === 'GROUPED' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {m.type === 'EXACT' ? 'Exact' : m.type === 'GROUPED' ? 'Regroupé' : 'IA Fuzzy'}
                                </span>
                                {m.reasoning && (
                                    <p className="text-xs text-gray-500 mt-1 italic max-w-xs">{m.reasoning}</p>
                                )}
                            </td>
                            <td className="px-6 py-4 align-top">
                                {m.bankTransaction ? (
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{CurrencyFormatter.format(m.bankTransaction.amount)}</span>
                                        <span className="text-gray-500 text-xs">{m.bankTransaction.date} • {m.bankTransaction.description}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic">Aucune (N-to-0)</span>
                                )}
                            </td>
                            <td className="px-6 py-4 align-top">
                                <div className="space-y-2">
                                    {m.accountingTransactions.map(t => (
                                        <div key={t.id} className="flex flex-col border-l-2 border-gray-200 pl-2">
                                            <span className="font-medium text-gray-900">{CurrencyFormatter.format(t.amount)}</span>
                                            <span className="text-gray-500 text-xs">{t.date} • {t.description}</span>
                                        </div>
                                    ))}
                                    {m.accountingTransactions.length > 1 && (
                                        <div className="border-t border-gray-200 pt-1 mt-1">
                                            <span className="text-xs font-bold text-gray-600">
                                                Total: {CurrencyFormatter.format(m.accountingTransactions.reduce((acc, c) => acc + c.amount, 0))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className={`px-6 py-4 text-right font-mono ${m.difference === 0 ? 'text-gray-300' : 'text-red-500 font-bold'}`}>
                                {m.difference === 0 ? '-' : CurrencyFormatter.format(m.difference)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {m.confidence < 1 && (
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${m.confidence * 100}%` }}></div>
                                    </div>
                                )}
                                {m.confidence === 1 && <span className="text-green-600 text-lg">✓</span>}
                            </td>
                        </tr>
                    ))}
                    {matches.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Aucun rapprochement trouvé.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unmatched Bank */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between">
                <h3 className="text-red-900 font-bold">Reste en Banque ({unmatchedBank.length})</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                        {unmatchedBank.map(t => (
                            <tr key={t.id} className="hover:bg-red-50">
                                <td className="px-4 py-3">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-800">{CurrencyFormatter.format(t.amount)}</span>
                                        <span className="text-xs text-gray-500">{t.date}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5 truncate max-w-xs" title={t.description}>{t.description}</div>
                                </td>
                            </tr>
                        ))}
                        {unmatchedBank.length === 0 && (
                            <tr><td className="p-4 text-center text-gray-400 italic">Tout est rapproché !</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Unmatched Accounting */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between">
                <h3 className="text-orange-900 font-bold">Reste en Compta ({unmatchedAccounting.length})</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                        {unmatchedAccounting.map(t => (
                            <tr key={t.id} className="hover:bg-orange-50">
                                <td className="px-4 py-3">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-800">{CurrencyFormatter.format(t.amount)}</span>
                                        <span className="text-xs text-gray-500">{t.date}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5 truncate max-w-xs" title={t.description}>{t.description}</div>
                                </td>
                            </tr>
                        ))}
                         {unmatchedAccounting.length === 0 && (
                            <tr><td className="p-4 text-center text-gray-400 italic">Tout est rapproché !</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
