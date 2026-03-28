import { Router, Request, Response } from 'express';
import { createEmployeeSchema } from '@bhai-store/shared';
import * as employeeService from '../services/employeeService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const companyId = req.query.company_id ? Number(req.query.company_id) : undefined;
  if (companyId) {
    const employees = employeeService.getEmployeesByCompany(companyId);
    res.json({ success: true, data: employees });
  } else {
    const employees = employeeService.getAllEmployees();
    res.json({ success: true, data: employees });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const employee = employeeService.getEmployeeById(Number(req.params.id));
  if (!employee) {
    res.status(404).json({ success: false, error: 'Employee not found' });
    return;
  }
  res.json({ success: true, data: employee });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const employee = employeeService.createEmployee(data);
    res.status(201).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const employee = employeeService.updateEmployee(Number(req.params.id), req.body);
    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }
    res.json({ success: true, data: employee });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = employeeService.deleteEmployee(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Employee not found' });
    return;
  }
  res.json({ success: true, message: 'Employee deleted' });
});

export default router;
