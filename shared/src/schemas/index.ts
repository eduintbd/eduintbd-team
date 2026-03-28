import { z } from 'zod';

export const createPurchaseItemSchema = z.object({
  item_id: z.number().optional(),
  item_name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Price cannot be negative'),
  total_price: z.number().min(0),
});

export const createPurchaseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  paid_amount: z.number().min(0, 'Paid amount cannot be negative'),
  notes: z.string().optional(),
  items: z.array(createPurchaseItemSchema).min(1, 'At least one item is required'),
  company_id: z.number().optional(),
  employee_id: z.number().optional(),
});

export const createPaymentSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['cash', 'bkash', 'bank']),
  notes: z.string().optional(),
  company_id: z.number().optional(),
  employee_id: z.number().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  contact_person: z.string().optional(),
});

export const createEmployeeSchema = z.object({
  company_id: z.number({ required_error: 'Company is required' }),
  name: z.string().min(1, 'Employee name is required'),
  designation: z.string().optional(),
  phone: z.string().optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().default('pcs'),
  category: z.string().default('general'),
});

export const loginSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(6),
});
