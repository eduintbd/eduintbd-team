import { Router, Request, Response } from 'express';
import { createCompanySchema } from '@bhai-store/shared';
import * as companyService from '../services/companyService';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const companies = companyService.getAllCompanies();
  res.json({ success: true, data: companies });
});

router.get('/:id', (req: Request, res: Response) => {
  const company = companyService.getCompanyById(Number(req.params.id));
  if (!company) {
    res.status(404).json({ success: false, error: 'Company not found' });
    return;
  }
  res.json({ success: true, data: company });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createCompanySchema.parse(req.body);
    const company = companyService.createCompany(data);
    res.status(201).json({ success: true, data: company });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const company = companyService.updateCompany(Number(req.params.id), req.body);
    if (!company) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    res.json({ success: true, data: company });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = companyService.deleteCompany(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Company not found' });
    return;
  }
  res.json({ success: true, message: 'Company deleted' });
});

export default router;
