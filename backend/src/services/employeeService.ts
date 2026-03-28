import { getDb, saveDatabase } from '../db/connection';
import { Employee, CreateEmployeeRequest } from '@bhai-store/shared';

function rowToEmployee(row: any[]): Employee {
  return {
    id: row[0], company_id: row[1], name: row[2], designation: row[3],
    phone: row[4], is_active: !!row[5], created_at: row[6], company_name: row[7],
  };
}

const SELECT_COLS = `e.id, e.company_id, e.name, e.designation, e.phone, e.is_active, e.created_at, c.name as company_name`;

export function getEmployeesByCompany(companyId: number, activeOnly = false): Employee[] {
  const db = getDb();
  const active = activeOnly ? ' AND e.is_active = 1' : '';
  const stmt = db.prepare(`SELECT ${SELECT_COLS} FROM employees e JOIN companies c ON c.id = e.company_id WHERE e.company_id = ?${active} ORDER BY e.name`);
  stmt.bind([companyId]);
  const employees: Employee[] = [];
  while (stmt.step()) employees.push(rowToEmployee(stmt.get()));
  stmt.free();
  return employees;
}

export function getAllEmployees(activeOnly = false): Employee[] {
  const db = getDb();
  const where = activeOnly ? 'WHERE e.is_active = 1' : '';
  const stmt = db.prepare(`SELECT ${SELECT_COLS} FROM employees e JOIN companies c ON c.id = e.company_id ${where} ORDER BY c.name, e.name`);
  const employees: Employee[] = [];
  while (stmt.step()) employees.push(rowToEmployee(stmt.get()));
  stmt.free();
  return employees;
}

export function getEmployeeById(id: number): Employee | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT ${SELECT_COLS} FROM employees e JOIN companies c ON c.id = e.company_id WHERE e.id = ?`);
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const emp = rowToEmployee(stmt.get());
  stmt.free();
  return emp;
}

export function createEmployee(data: CreateEmployeeRequest): Employee {
  const db = getDb();
  db.run(
    'INSERT INTO employees (company_id, name, designation, phone) VALUES (?, ?, ?, ?)',
    [data.company_id, data.name, data.designation || null, data.phone || null]
  );
  const idResult = db.exec('SELECT last_insert_rowid()');
  const id = idResult[0].values[0][0] as number;
  saveDatabase();
  return getEmployeeById(id)!;
}

export function updateEmployee(id: number, data: Partial<CreateEmployeeRequest & { is_active: boolean }>): Employee | null {
  const db = getDb();
  const existing = getEmployeeById(id);
  if (!existing) return null;

  db.run(
    `UPDATE employees SET name = ?, designation = ?, phone = ?, is_active = ? WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.designation ?? existing.designation ?? null,
      data.phone ?? existing.phone ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : (existing.is_active ? 1 : 0),
      id,
    ]
  );
  saveDatabase();
  return getEmployeeById(id);
}

export function deleteEmployee(id: number): boolean {
  const db = getDb();
  db.run('DELETE FROM employees WHERE id = ?', [id]);
  saveDatabase();
  return db.getRowsModified() > 0;
}
