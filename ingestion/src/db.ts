import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../qa_agent.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Environment
      db.run(`
        CREATE TABLE IF NOT EXISTS Environment (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          auth_config TEXT,
          label TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Page
      db.run(`
        CREATE TABLE IF NOT EXISTS Page (
          id TEXT PRIMARY KEY,
          environment_id TEXT,
          url TEXT NOT NULL,
          type TEXT NOT NULL,
          elements TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Flow
      db.run(`
        CREATE TABLE IF NOT EXISTS Flow (
          id TEXT PRIMARY KEY,
          environment_id TEXT,
          name TEXT NOT NULL,
          steps TEXT,
          linked_pages TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. TestCase
      db.run(`
        CREATE TABLE IF NOT EXISTS TestCase (
          id TEXT PRIMARY KEY,
          flow_id TEXT,
          file_path TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 5. TestRun
      db.run(`
        CREATE TABLE IF NOT EXISTS TestRun (
          id TEXT PRIMARY KEY,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT NOT NULL,
          duration REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 6. TestResult
      db.run(`
        CREATE TABLE IF NOT EXISTS TestResult (
          id TEXT PRIMARY KEY,
          test_run_id TEXT NOT NULL,
          test_case_id TEXT,
          status TEXT NOT NULL, -- pass | fail | flaky
          evidence_refs TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 7. Bug
      db.run(`
        CREATE TABLE IF NOT EXISTS Bug (
          id TEXT PRIMARY KEY,
          test_result_id TEXT NOT NULL,
          steps_to_reproduce TEXT NOT NULL,
          expected TEXT NOT NULL,
          actual TEXT NOT NULL,
          root_cause TEXT NOT NULL, -- UI/frontend | API/backend | needs investigation
          severity TEXT NOT NULL, -- low | medium | high | critical
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 8. AccessibilityIssue
      db.run(`
        CREATE TABLE IF NOT EXISTS AccessibilityIssue (
          id TEXT PRIMARY KEY,
          page_id TEXT,
          element TEXT NOT NULL,
          wcag_rule TEXT NOT NULL,
          severity TEXT NOT NULL, -- minor | moderate | serious | critical
          fix_suggestion TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// SQL Query Helpers
export function runSql(sql: string, params: any[] = []): Promise<{ id?: string }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: (this as any).lastID ? String((this as any).lastID) : undefined });
    });
  });
}

export function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}
