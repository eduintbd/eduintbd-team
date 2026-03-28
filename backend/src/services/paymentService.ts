import { getDb, saveDatabase } from '../db/connection';
import { Payment, CreatePaymentRequest } from '@bhai-store/shared';

function rowToPayment(row: any[]): Payment {
  return { id: row[0], date: row[1], amount: row[2], payment_method: row[3] as any, notes: row[4], created_at: row[5] };
}

export function getAllPayments(params: { from?: string; to?: string; page?: number; limit?: number }) {
  const db = getDb();
  const { from, to, page = 1, limit = 20 } = params;
  const conditions: string[] = [];
  const values: any[] = [];

  if (from) { conditions.push('date >= ?'); values.push(from); }
  if (to) { conditions.push('date <= ?'); values.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) FROM payments ${where}`);
  if (values.length) countStmt.bind(values);
  countStmt.step();
  const total = countStmt.get()[0] as number;
  countStmt.free();

  const dataStmt = db.prepare(`SELECT id, date, amount, payment_method, notes, created_at FROM payments ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`);
  dataStmt.bind([...values, limit, offset]);
  const data: Payment[] = [];
  while (dataStmt.step()) {
    data.push(rowToPayment(dataStmt.get()));
  }
  dataStmt.free();

  return { data, total, page, limit };
}

export function createPayment(data: CreatePaymentRequest): Payment {
  const db = getDb();
  db.run('INSERT INTO payments (date, amount, payment_method, notes, company_id, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
    [data.date, data.amount, data.payment_method, data.notes || null, data.company_id || null, data.employee_id || null]);
  const idResult = db.exec('SELECT last_insert_rowid()');
  const paymentId = idResult[0].values[0][0] as number;
  saveDatabase();

  const stmt = db.prepare('SELECT id, date, amount, payment_method, notes, created_at FROM payments WHERE id = ?');
  stmt.bind([paymentId]);
  stmt.step();
  const payment = rowToPayment(stmt.get());
  stmt.free();
  return payment;
}

export function updatePayment(id: number, data: Partial<CreatePaymentRequest>): Payment | null {
  const db = getDb();
  const checkStmt = db.prepare('SELECT id FROM payments WHERE id = ?');
  checkStmt.bind([id]);
  if (!checkStmt.step()) { checkStmt.free(); return null; }
  checkStmt.free();

  if (data.date) db.run('UPDATE payments SET date = ? WHERE id = ?', [data.date, id]);
  if (data.amount) db.run('UPDATE payments SET amount = ? WHERE id = ?', [data.amount, id]);
  if (data.payment_method) db.run('UPDATE payments SET payment_method = ? WHERE id = ?', [data.payment_method, id]);
  if (data.notes !== undefined) db.run('UPDATE payments SET notes = ? WHERE id = ?', [data.notes, id]);
  saveDatabase();

  const stmt = db.prepare('SELECT id, date, amount, payment_method, notes, created_at FROM payments WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const payment = rowToPayment(stmt.get());
  stmt.free();
  return payment;
}

export function deletePayment(id: number): boolean {
  const db = getDb();
  db.run('DELETE FROM payments WHERE id = ?', [id]);
  saveDatabase();
  return db.getRowsModified() > 0;
}
