import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import fs from 'fs';
import type { Attendance, AttendanceDTO, AttendancePaginationParams } from './types';

const dbPath = join(process.cwd(), `db`, `database.sqlite`);
console.log('> DB Path: ', dbPath);

const dir = dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath, { create: true, strict: true });

// Initialize database
export const initDb = () => {
  // Enable WAL mode for better concurrent access and crash recovery
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA busy_timeout = 5000'); // Wait up to 5 seconds on lock
  db.run('PRAGMA cache_size = -2000'); // Uses ~2MB of RAM for caching per worker

  // Create attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL CHECK(length(name) > 0),
        attendance TEXT NOT NULL CHECK(attendance IN ('yes', 'no', 'maybe')),
        totalGuests INTEGER NOT NULL DEFAULT 0 CHECK(totalGuests >= 0 AND totalGuests <= 20),
        message TEXT CHECK(message IS NULL OR length(message) <= 500),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
`);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_uuid ON attendance(uuid)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance(createdAt DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(attendance)');
};

// Prepared statements - validate they compile correctly
export const attendanceDb = {
  get: ({ sortBy, order, limit, offset }: Omit<Required<AttendancePaginationParams>, 'page'> & { offset: number }) => {
    const stmt = db.prepare(
      `SELECT id, uuid, name, attendance, totalGuests, message, createdAt, updatedAt FROM attendance ORDER BY ${sortBy} ${order} LIMIT @limit OFFSET @offset`
    );
    return stmt.all({ limit, offset }) as Attendance[];
  },
  getAll: ({ sortBy, order }: Pick<Required<AttendancePaginationParams>, 'sortBy' | 'order'>) => {
    const stmt = db.prepare(
      `SELECT id, uuid, name, attendance, totalGuests, message, createdAt, updatedAt FROM attendance ORDER BY ${sortBy} ${order}`
    );
    return stmt.all() as Attendance[];
  },
  getByUuid: (uuid: string) => {
    const stmt = db.prepare('SELECT id, uuid, name, attendance, totalGuests, message, createdAt, updatedAt FROM attendance WHERE uuid = @uuid');
    return stmt.get({ uuid }) as Attendance | undefined;
  },
  insert: (data: { uuid: string } & AttendanceDTO) => {
    const stmt = db.prepare(`
        INSERT INTO attendance (uuid, name, attendance, totalGuests, message)
        VALUES (@uuid, @name, @attendance, @totalGuests, @message)
    `);
    return stmt.run({
      uuid: data.uuid,
      name: data.name,
      attendance: data.attendance,
      totalGuests: data.totalGuests,
      message: data.message || null,
    });
  },
  update: (data: { uuid: string } & AttendanceDTO) => {
    const stmt = db.prepare(`
        UPDATE attendance 
        SET name = @name, attendance = @attendance, totalGuests = @totalGuests, message = @message, updatedAt = CURRENT_TIMESTAMP
        WHERE uuid = @uuid
    `);
    return stmt.run({
      uuid: data.uuid,
      name: data.name,
      attendance: data.attendance,
      totalGuests: data.totalGuests,
      message: data.message || null,
    });
  },
  delete: (uuid: string) => {
    const stmt = db.prepare('DELETE FROM attendance WHERE uuid = @uuid');
    return stmt.run({ uuid });
  },
  count: () => {
    const stmt = db.prepare('SELECT COUNT(*) as total FROM attendance');
    return stmt.get() as { total: number };
  },
};
