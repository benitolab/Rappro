import { Transaction, TransactionSource } from '../types';

export const parseCSV = (content: string, source: TransactionSource): Transaction[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  const transactions: Transaction[] = [];
  
  // Basic heuristic to skip header if first row doesn't look like data
  let startIndex = 0;
  if (lines.length > 0 && isNaN(parseFloat(lines[0].split(',')[2]))) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV split handling quotes
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (columns.length < 3) continue;

    // Expected format flexible: Date, Description, Amount OR Date, Amount, Description
    // We try to auto-detect columns based on content
    let dateStr = columns[0].replace(/"/g, '').trim();
    let descStr = columns[1].replace(/"/g, '').trim();
    let amountStr = columns[2].replace(/"/g, '').trim();

    // Check if column 1 is actually description and column 2 is amount (common swap)
    if (!isNaN(parseFloat(descStr)) && isNaN(parseFloat(amountStr))) {
        const temp = descStr;
        descStr = amountStr;
        amountStr = temp;
    }

    // Attempt to normalize Date (assume YYYY-MM-DD or DD/MM/YYYY)
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // Assume DD/MM/YYYY -> YYYY-MM-DD
            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));

    if (!isNaN(amount)) {
      transactions.push({
        id: `${source}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        date: dateStr,
        description: descStr,
        amount: amount,
        source: source,
        originalRow: i + 1
      });
    }
  }

  return transactions;
};