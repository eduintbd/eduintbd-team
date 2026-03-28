import { getDb, saveDatabase } from '../db/connection';
import { Item, CreateItemRequest } from '@bhai-store/shared';

function rowToItem(row: any[]): Item {
  return { id: row[0], name: row[1], unit: row[2], category: row[3], created_at: row[4] };
}

export function getAllItems(): Item[] {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, unit, category, created_at FROM items ORDER BY name');
  const items: Item[] = [];
  while (stmt.step()) {
    items.push(rowToItem(stmt.get()));
  }
  stmt.free();
  return items;
}

export function createItem(data: CreateItemRequest): Item {
  const db = getDb();
  db.run('INSERT INTO items (name, unit, category) VALUES (?, ?, ?)', [data.name, data.unit || 'pcs', data.category || 'general']);
  saveDatabase();

  // Query by name (unique) instead of last_insert_rowid for reliability
  const stmt = db.prepare('SELECT id, name, unit, category, created_at FROM items WHERE name = ?');
  stmt.bind([data.name]);
  stmt.step();
  const item = rowToItem(stmt.get());
  stmt.free();
  return item;
}

export function findOrCreateItem(name: string, unit?: string, category?: string): Item {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, unit, category, created_at FROM items WHERE name = ?');
  stmt.bind([name]);
  if (stmt.step()) {
    const item = rowToItem(stmt.get());
    stmt.free();
    return item;
  }
  stmt.free();
  return createItem({ name, unit, category });
}
