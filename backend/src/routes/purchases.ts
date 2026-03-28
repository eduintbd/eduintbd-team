import { Router, Request, Response } from 'express';
import { createPurchaseSchema } from '@bhai-store/shared';
import * as purchaseService from '../services/purchaseService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { from, to, status, page, limit } = req.query;
  const result = purchaseService.getAllPurchases({
    from: from as string,
    to: to as string,
    status: status as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ success: true, ...result });
});

router.get('/:id', (req: Request, res: Response) => {
  const purchase = purchaseService.getPurchaseById(Number(req.params.id));
  if (!purchase) {
    res.status(404).json({ success: false, error: 'Purchase not found' });
    return;
  }
  res.json({ success: true, data: purchase });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createPurchaseSchema.parse(req.body);
    const purchase = purchaseService.createPurchase(data);
    res.status(201).json({ success: true, data: purchase });
  } catch (error: any) {
    console.error('Create purchase error:', error);
    res.status(400).json({ success: false, error: error.message || String(error) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const purchase = purchaseService.updatePurchase(Number(req.params.id), req.body);
    if (!purchase) {
      res.status(404).json({ success: false, error: 'Purchase not found' });
      return;
    }
    res.json({ success: true, data: purchase });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = purchaseService.deletePurchase(Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Purchase not found' });
    return;
  }
  res.json({ success: true, message: 'Purchase deleted' });
});

export default router;
