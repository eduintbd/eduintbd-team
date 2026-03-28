import { Router, Request, Response } from 'express';
import * as statementService from '../services/statementService';

const router = Router();

router.get('/company/:id', (req: Request, res: Response) => {
  const { from, to } = req.query;
  const statement = statementService.getCompanyStatement(
    Number(req.params.id),
    from as string,
    to as string
  );
  if (!statement) {
    res.status(404).json({ success: false, error: 'Company not found' });
    return;
  }
  res.json({ success: true, data: statement });
});

router.get('/employee/:id', (req: Request, res: Response) => {
  const { from, to } = req.query;
  const statement = statementService.getEmployeeStatement(
    Number(req.params.id),
    from as string,
    to as string
  );
  if (!statement) {
    res.status(404).json({ success: false, error: 'Employee not found' });
    return;
  }
  res.json({ success: true, data: statement });
});

export default router;
