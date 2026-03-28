import { getDb, saveDatabase } from './connection';
import fs from 'fs';
import path from 'path';

export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = path.join(__dirname, 'migrations');

  // When running with tsx, __dirname points to source. For compiled, it points to dist.
  // Handle both cases by checking if the directory exists
  let dir = migrationsDir;
  if (!fs.existsSync(dir)) {
    // Fallback: look relative to project root
    dir = path.resolve(process.cwd(), 'src/db/migrations');
  }

  if (!fs.existsSync(dir)) {
    console.warn('Migrations directory not found, skipping');
    return;
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      try {
        db.run(stmt);
      } catch (e: any) {
        // Ignore "duplicate column" errors from ALTER TABLE re-runs
        if (e.message?.includes('duplicate column')) continue;
        throw e;
      }
    }
  }

  saveDatabase();
  console.log(`Ran ${files.length} migration(s)`);
}
