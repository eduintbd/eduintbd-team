export function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[৳,]/g, '')) || 0;
}
