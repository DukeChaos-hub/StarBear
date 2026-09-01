// Minimal type declarations for Node 22.5+ built-in `node:sqlite` (Node 24 has stable support).
// @types/node may not include this yet.

declare module 'node:sqlite' {
  export interface StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
