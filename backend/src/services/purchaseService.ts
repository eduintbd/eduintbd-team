import { getDb, saveDatabase } from '../db/connection';
import { Purchase, PurchaseItem, CreatePurchaseRequest } from '@bhai-store/shared';
import { findOrCreateItem } from './itemService';

function rowToPurchase(row: any[]): Purchase {
  return {
    id: row[0], date: row[1], total_amount: row[2], paid_amount: row[3],
    credit_amount: row[4], payment_status: row[5], notes: row[6],
    created_at: row[7], updated_at: row[8],
  };
}

function rowToPurchaseItem(row: any[]): PurchaseItem {
  return {
    id: row[0], purchase_id: row[1], item_id: row[2], item_name: row[3],
    quantity: row[4], unit_price: row[5], total_price: row[6],
  };
}

export function getAllPurchases(params: { from?: string; to?: string; status?: string; page?: number; limit?: number }) {
  const db = getDb();
  const { from, to, status, page = 1, limit = 20 } = params;
  const conditions: string[] = [];
  const values: any[] = [];

  if (from) { conditions.push('date >= ?'); values.push(from); }
  if (to) { conditions.push('date <= ?'); values.push(to); }
  if (status) { conditions.push('payment_status = ?'); values.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countStmt = db.prepare(`SELECT COUNT(*) FROM purchases ${where}`);
  if (values.length) countStmt.bind(values);
  countStmt.step();
  const total = countStmt.get()[0] as number;
  countStmt.free();

  const dataStmt = db.prepare(`SELECT id, date, total_amount, paid_amount, credit_amount, payment_status, notes, created_at, updated_at FROM purchases ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`);
  dataStmt.bind([...values, limit, offset]);
  const data: Purchase[] = [];
  while (dataStmt.step()) {
    data.push(rowToPurchase(dataStmt.get()));
  }
  dataStmt.free();

  return { data, total, page, limit };
}

export function getPurchaseById(id: number): Purchase | null {
  const db = getDb();
  const stmt = db.prepare('SELECT id, date, total_amount, paid_amount, credit_amount, payment_status, notes, created_at, updated_at FROM purchases WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const purchase = rowToPurchase(stmt.get());
  stmt.free();

  const itemStmt = db.prepare('SELECT id, purchase_id, item_id, item_name, quantity, unit_price, total_price FROM purchase_items WHERE purchase_id = ?');
  itemStmt.bind([id]);
  const items: PurchaseItem[] = [];
  while (itemStmt.step()) {
    items.push(rowToPurchaseItem(itemStmt.get()));
  }
  itemStmt.free();

  return { ...purchase, items };
}

export function createPurchase(data: CreatePurchaseRequest): Purchase {
  const db = getDb();
  const totalAmount = data.items.reduce((sum, item) => sum + item.total_price, 0);
  const paidAmount = Math.min(data.paid_amount, totalAmount);
  const creditAmount = totalAmount - paidAmount;
  const status = creditAmount === 0 ? 'paid' : paidAmount === 0 ? 'credit' : 'partial';

  db.run(
    `INSERT INTO purchases (date, total_amount, paid_amount, credit_amount, payment_status, notes, company_id, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.date, totalAmount, paidAmount, creditAmount, status, data.notes || null, data.company_id || null, data.employee_id || null]
  );

  // Get the ID of the just-inserted purchase
  const idResult = db.exec('SELECT last_insert_rowid()');
  const purchaseId = idResult[0].values[0][0] as number;

  for (const item of data.items) {
    const catalogItem = findOrCreateItem(item.item_name);
    db.run(
      `INSERT INTO purchase_items (purchase_id, item_id, item_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
      [purchaseId, catalogItem.id!, item.item_name, item.quantity, item.unit_price, item.total_price]
    );
  }

  saveDatabase();
  return getPurchaseById(purchaseId)!;
}

export function updatePurchase(id: number, data: Partial<CreatePurchaseRequest>): Purchase | null {
  const db = getDb();
  const existing = getPurchaseById(id);
  if (!existing) return null;

  if (data.items) {
    db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
    const totalAmount = data.items.reduce((sum, item) => sum + item.total_price, 0);
    const paidAmount = Math.min(data.paid_amount ?? existing.paid_amount, totalAmount);
    const creditAmount = totalAmount - paidAmount;
    const status = creditAmount === 0 ? 'paid' : paidAmount === 0 ? 'credit' : 'partial';

    db.run(
      `UPDATE purchases SET date = ?, total_amount = ?, paid_amount = ?, credit_amount = ?, payment_status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [data.date ?? existing.date, totalAmount, paidAmount, creditAmount, status, data.notes ?? existing.notes ?? null, id]
    );

    for (const item of data.items) {
      const catalogItem = findOrCreateItem(item.item_name);
      db.run(
        `INSERT INTO purchase_items (purchase_id, item_id, item_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, catalogItem.id!, item.item_name, item.quantity, item.unit_price, item.total_price]
      );
    }
  }

  saveDatabase();
  return getPurchaseById(id);
}

export function deletePurchase(id: number): boolean {
  const db = getDb();
  db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
  db.run('DELETE FROM purchases WHERE id = ?', [id]);
  saveDatabase();
  return db.getRowsModified() > 0;
}
