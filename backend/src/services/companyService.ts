import { getDb, saveDatabase } from '../db/connection';
import { Company, CreateCompanyRequest } from '@bhai-store/shared';

function rowToCompany(row: any[]): Company {
  return {
    id: row[0], name: row[1], address: row[2], phone: row[3],
    email: row[4], contact_person: row[5], is_active: !!row[6], created_at: row[7],
  };
}

export function getAllCompanies(activeOnly = false): Company[] {
  const db = getDb();
  const where = activeOnly ? 'WHERE is_active = 1' : '';
  const stmt = db.prepare(`SELECT id, name, address, phone, email, contact_person, is_active, created_at FROM companies ${where} ORDER BY name`);
  const companies: Company[] = [];
  while (stmt.step()) companies.push(rowToCompany(stmt.get()));
  stmt.free();
  return companies;
}

export function getCompanyById(id: number): Company | null {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, address, phone, email, contact_person, is_active, created_at FROM companies WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const company = rowToCompany(stmt.get());
  stmt.free();
  return company;
}

export function createCompany(data: CreateCompanyRequest): Company {
  const db = getDb();
  db.run(
    'INSERT INTO companies (name, address, phone, email, contact_person) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.address || null, data.phone || null, data.email || null, data.contact_person || null]
  );
  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;
  saveDatabase();
  return getCompanyById(id)!;
}

export function updateCompany(id: number, data: Partial<CreateCompanyRequest & { is_active: boolean }>): Company | null {
  const db = getDb();
  const existing = getCompanyById(id);
  if (!existing) return null;

  db.run(
    `UPDATE companies SET name = ?, address = ?, phone = ?, email = ?, contact_person = ?, is_active = ? WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.address ?? existing.address ?? null,
      data.phone ?? existing.phone ?? null,
      data.email ?? existing.email ?? null,
      data.contact_person ?? existing.contact_person ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : (existing.is_active ? 1 : 0),
      id,
    ]
  );
  saveDatabase();
  return getCompanyById(id);
}

export function deleteCompany(id: number): boolean {
  const db = getDb();
  db.run('DELETE FROM companies WHERE id = ?', [id]);
  saveDatabase();
  return db.getRowsModified() > 0;
}
