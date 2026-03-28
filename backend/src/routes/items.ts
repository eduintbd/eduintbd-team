import { Router, Request, Response } from 'express';
import { createItemSchema } from '@bhai-store/shared';
import * as itemService from '../services/itemService';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const items = itemService.getAllItems();
  res.json({ success: true, data: items });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = createItemSchema.parse(req.body);
    const item = itemService.createItem(data);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
