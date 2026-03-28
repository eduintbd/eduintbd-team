import { Router, Request, Response } from 'express';
import { createPaymentSchema } from '@bhai-store/shared';
import * as paymentService from '../services/paymentService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { from, to, page, limit } = req.query;
  const result = paymentService.getAllPayments({
    from: from as string,
    to: to as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ success: true, ...result });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    const payment = paymentService.createPayment(data);
    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const payment = paymentService.updatePayment(Number(req.params.id), req.body);
    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }
    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = paymentService.deletePayment(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Payment not found' });
    return;
  }
  res.json({ success: true, message: 'Payment deleted' });
});

export default router;
