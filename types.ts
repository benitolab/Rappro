export enum TransactionSource {
  BANK = 'BANQUE',
  ACCOUNTING = 'COMPTA'
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  source: TransactionSource;
  originalRow: number;
}

export interface MatchGroup {
  id: string;
  bankTransaction?: Transaction;
  accountingTransactions: Transaction[];
  type: 'EXACT' | 'GROUPED' | 'FUZZY';
  confidence: number; // 0 to 1
  reasoning?: string;
  difference: number;
}

export interface ReconciliationState {
  bankTransactions: Transaction[];
  accountingTransactions: Transaction[];
  matches: MatchGroup[];
  unmatchedBank: Transaction[];
  unmatchedAccounting: Transaction[];
}
