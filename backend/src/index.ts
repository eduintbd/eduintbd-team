import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { initDatabase, getDb, saveDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import purchaseRoutes from './routes/purchases';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import companyRoutes from './routes/companies';
import employeeRoutes from './routes/employees';
import statementRoutes from './routes/statements';

const DEFAULT_PIN = '0000';

async function seedDefaultPin() {
  const db = getDb();
  const stmt = db.prepare("SELECT value FROM app_config WHERE key = 'pin_hash'");
  const exists = stmt.step();
  stmt.free();
  if (!exists) {
    const hash = await bcrypt.hash(DEFAULT_PIN, 10);
    db.run("INSERT INTO app_config (key, value) VALUES ('pin_hash', ?)", [hash]);
    saveDatabase();
    console.log('Default PIN (0000) set up');
  }
}

async function start() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize database
  await initDatabase();
  runMigrations();
  await seedDefaultPin();

  // Serve static web build if exists
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
  }

  // Public routes
  app.use('/api/auth', authRoutes);

  // Protected routes
  app.use('/api/items', authMiddleware, itemRoutes);
  app.use('/api/purchases', authMiddleware, purchaseRoutes);
  app.use('/api/payments', authMiddleware, paymentRoutes);
  app.use('/api/reports', authMiddleware, reportRoutes);
  app.use('/api/companies', authMiddleware, companyRoutes);
  app.use('/api/employees', authMiddleware, employeeRoutes);
  app.use('/api/statements', authMiddleware, statementRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Bhai Bhai Store Tracker API is running' });
  });

  // SPA fallback — serve index.html for all non-API routes
  if (fs.existsSync(webDist)) {
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Bhai Bhai Store Tracker running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
