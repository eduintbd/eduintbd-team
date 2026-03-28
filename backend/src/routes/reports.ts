import { Router, Request, Response } from 'express';
import * as reportService from '../services/reportService';

const router = Router();

router.get('/summary', (_req: Request, res: Response) => {
  const summary = reportService.getSummary();
  res.json({ success: true, data: summary });
});

router.get('/monthly', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = reportService.getMonthlyReport(year);
  res.json({ success: true, data });
});

router.get('/weekly', (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ success: false, error: 'Both "from" and "to" query params are required' });
    return;
  }
  const data = reportService.getWeeklyReport(from as string, to as string);
  res.json({ success: true, data });
});

router.get('/top-items', (req: Request, res: Response) => {
  const { from, to, limit } = req.query;
  const data = reportService.getTopItems({
    from: from as string,
    to: to as string,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ success: true, data });
});

export default router;
