import { getDb } from '../db/connection';
import { CompanyStatement, EmployeeStatementSummary, EmployeeStatement } from '@bhai-store/shared';
import * as companyService from './companyService';
import * as employeeService from './employeeService';

export function getCompanyStatement(companyId: number, from?: string, to?: string): CompanyStatement | null {
  const db = getDb();
  const company = companyService.getCompanyById(companyId);
  if (!company) return null;

  const dateFilter = buildDateFilter(from, to);

  // Purchase totals for company
  const pStmt = db.prepare(`
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(credit_amount), 0)
    FROM purchases WHERE company_id = ? ${dateFilter.sql}
  `);
  pStmt.bind([companyId, ...dateFilter.values]);
  pStmt.step();
  const pRow = pStmt.get();
  pStmt.free();

  // Payment totals for company
  const payStmt = db.prepare(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE company_id = ? ${dateFilter.sql}`);
  payStmt.bind([companyId, ...dateFilter.values]);
  payStmt.step();
  const totalPayments = payStmt.get()[0] as number;
  payStmt.free();

  // Per-employee breakdown
  const empStmt = db.prepare(`
    SELECT e.id, e.name, e.designation,
      COALESCE(SUM(p.total_amount), 0), COALESCE(SUM(p.paid_amount), 0), COALESCE(SUM(p.credit_amount), 0)
    FROM employees e
    LEFT JOIN purchases p ON p.employee_id = e.id ${dateFilter.sql ? 'AND ' + dateFilter.sql.replace(/AND /g, '') : ''}
    WHERE e.company_id = ?
    GROUP BY e.id ORDER BY e.name
  `);
  empStmt.bind([...dateFilter.values, companyId]);
  const employees: EmployeeStatementSummary[] = [];
  while (empStmt.step()) {
    const r = empStmt.get();
    const empId = r[0] as number;

    // Get employee payments
    const epStmt = db.prepare(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE employee_id = ? ${dateFilter.sql}`);
    epStmt.bind([empId, ...dateFilter.values]);
    epStmt.step();
    const empPayments = epStmt.get()[0] as number;
    epStmt.free();

    employees.push({
      employee_id: empId,
      employee_name: r[1] as string,
      designation: r[2] as string,
      total_spent: r[3] as number,
      total_paid: r[4] as number,
      total_credit: r[5] as number,
      total_payments_made: empPayments,
      outstanding_balance: (r[5] as number) - empPayments,
    });
  }
  empStmt.free();

  return {
    company,
    total_purchases: pRow[0] as number,
    total_spent: pRow[1] as number,
    total_paid: pRow[2] as number,
    total_credit: pRow[3] as number,
    total_payments_made: totalPayments,
    outstanding_balance: (pRow[3] as number) - totalPayments,
    employees,
  };
}

export function getEmployeeStatement(employeeId: number, from?: string, to?: string): EmployeeStatement | null {
  const db = getDb();
  const employee = employeeService.getEmployeeById(employeeId);
  if (!employee) return null;

  const dateFilter = buildDateFilter(from, to);

  // Purchase totals
  const pStmt = db.prepare(`
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(credit_amount), 0)
    FROM purchases WHERE employee_id = ? ${dateFilter.sql}
  `);
  pStmt.bind([employeeId, ...dateFilter.values]);
  pStmt.step();
  const pRow = pStmt.get();
  pStmt.free();

  // Payment totals
  const payStmt = db.prepare(`SELECT COALESCE(SUM(amount), 0) FROM payments WHERE employee_id = ? ${dateFilter.sql}`);
  payStmt.bind([employeeId, ...dateFilter.values]);
  payStmt.step();
  const totalPayments = payStmt.get()[0] as number;
  payStmt.free();

  // Purchase list
  const purchasesStmt = db.prepare(`
    SELECT id, date, total_amount, paid_amount, credit_amount, payment_status, notes, created_at
    FROM purchases WHERE employee_id = ? ${dateFilter.sql} ORDER BY date DESC
  `);
  purchasesStmt.bind([employeeId, ...dateFilter.values]);
  const purchases: any[] = [];
  while (purchasesStmt.step()) {
    const r = purchasesStmt.get();
    purchases.push({
      id: r[0], date: r[1], total_amount: r[2], paid_amount: r[3],
      credit_amount: r[4], payment_status: r[5], notes: r[6], created_at: r[7],
    });
  }
  purchasesStmt.free();

  // Payment list
  const paymentsStmt = db.prepare(`
    SELECT id, date, amount, payment_method, notes, created_at
    FROM payments WHERE employee_id = ? ${dateFilter.sql} ORDER BY date DESC
  `);
  paymentsStmt.bind([employeeId, ...dateFilter.values]);
  const payments: any[] = [];
  while (paymentsStmt.step()) {
    const r = paymentsStmt.get();
    payments.push({
      id: r[0], date: r[1], amount: r[2], payment_method: r[3], notes: r[4], created_at: r[5],
    });
  }
  paymentsStmt.free();

  return {
    employee,
    company_name: employee.company_name || '',
    total_purchases: pRow[0] as number,
    total_spent: pRow[1] as number,
    total_paid: pRow[2] as number,
    total_credit: pRow[3] as number,
    total_payments_made: totalPayments,
    outstanding_balance: (pRow[3] as number) - totalPayments,
    purchases,
    payments,
  };
}

function buildDateFilter(from?: string, to?: string) {
  const parts: string[] = [];
  const values: any[] = [];
  if (from) { parts.push('AND date >= ?'); values.push(from); }
  if (to) { parts.push('AND date <= ?'); values.push(to); }
  return { sql: parts.join(' '), values };
}
