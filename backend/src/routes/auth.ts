import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, saveDatabase } from '../db/connection';
import { loginSchema } from '@bhai-store/shared';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bhai-bhai-store-secret';

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const stmt = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'");
    if (stmt.step()) {
      stmt.free();
      res.status(400).json({ success: false, error: 'PIN already set up' });
      return;
    }
    stmt.free();

    const { pin } = loginSchema.parse(req.body);
    const hash = await bcrypt.hash(pin, 10);
    db.run("INSERT INTO app_config (key, value) VALUES ('pin_hash', ?)", [hash]);
    saveDatabase();

    const token = jwt.sign({ sub: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { token } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const stmt = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'");
    if (!stmt.step()) {
      stmt.free();
      res.status(400).json({ success: false, error: 'PIN not set up yet. Use /api/auth/setup first.' });
      return;
    }
    const pinHash = stmt.get()[0] as string;
    stmt.free();

    const { pin } = loginSchema.parse(req.body);
    const valid = await bcrypt.compare(pin, pinHash);

    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid PIN' });
      return;
    }

    const token = jwt.sign({ sub: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { token } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/status', (_req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'");
  const isSetup = stmt.step();
  stmt.free();
  res.json({ success: true, data: { isSetup } });
});

export default router;
