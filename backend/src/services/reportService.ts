import { getDb } from '../db/connection';
import { SummaryReport, MonthlyReport, TopItem } from '@bhai-store/shared';

export function getSummary(): SummaryReport {
  const db = getDb();

  const pStmt = db.prepare(`
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(credit_amount), 0)
    FROM purchases
  `);
  pStmt.step();
  const pRow = pStmt.get();
  pStmt.free();

  const payStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) FROM payments');
  payStmt.step();
  const totalPayments = payStmt.get()[0] as number;
  payStmt.free();

  return {
    total_purchases: pRow[0] as number,
    total_spent: pRow[1] as number,
    total_paid: pRow[2] as number,
    total_credit: pRow[3] as number,
    total_payments_made: totalPayments,
    outstanding_balance: (pRow[3] as number) - totalPayments,
  };
}

export function getMonthlyReport(year: number): MonthlyReport[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT strftime('%m', date), COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(credit_amount), 0), COUNT(*)
    FROM purchases WHERE strftime('%Y', date) = ?
    GROUP BY strftime('%m', date) ORDER BY strftime('%m', date)
  `);
  stmt.bind([String(year)]);
  const data: MonthlyReport[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    data.push({
      month: row[0] as string,
      year,
      total_spent: row[1] as number,
      total_paid: row[2] as number,
      total_credit: row[3] as number,
      purchase_count: row[4] as number,
    });
  }
  stmt.free();
  return data;
}

export function getWeeklyReport(from: string, to: string) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT strftime('%Y-W%W', date), COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(credit_amount), 0), COUNT(*)
    FROM purchases WHERE date >= ? AND date <= ?
    GROUP BY strftime('%Y-W%W', date) ORDER BY strftime('%Y-W%W', date)
  `);
  stmt.bind([from, to]);
  const data: any[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    data.push({ week: row[0], total_spent: row[1], total_paid: row[2], total_credit: row[3], purchase_count: row[4] });
  }
  stmt.free();
  return data;
}

export function getTopItems(params: { from?: string; to?: string; limit?: number }): TopItem[] {
  const db = getDb();
  const { from, to, limit = 10 } = params;
  const conditions: string[] = [];
  const values: any[] = [];

  if (from) { conditions.push('p.date >= ?'); values.push(from); }
  if (to) { conditions.push('p.date <= ?'); values.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const stmt = db.prepare(`
    SELECT pi.item_name, SUM(pi.quantity), SUM(pi.total_price), COUNT(DISTINCT pi.purchase_id)
    FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
    ${where} GROUP BY pi.item_name ORDER BY SUM(pi.total_price) DESC LIMIT ?
  `);
  stmt.bind([...values, limit]);
  const data: TopItem[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    data.push({ item_name: row[0] as string, total_quantity: row[1] as number, total_spent: row[2] as number, purchase_count: row[3] as number });
  }
  stmt.free();
  return data;
}
