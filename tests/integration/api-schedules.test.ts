import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import { GET as listSchedules, POST as createSchedule } from '@/app/api/schedules/route';
import {
  GET as getSchedule,
  PATCH as patchSchedule,
  DELETE as deleteSchedule,
} from '@/app/api/schedules/[id]/route';
import { POST as runScheduleNow } from '@/app/api/schedules/[id]/run/route';
import { GET as scheduleRuns } from '@/app/api/schedules/[id]/runs/route';
import * as collections from '@/lib/db/repositories/collections';
import * as requests from '@/lib/db/repositories/requests';
import * as envs from '@/lib/db/repositories/environments';
import * as cases from '@/lib/db/repositories/test-cases';
import * as jobs from '@/lib/db/repositories/scheduled-jobs';
import { NextRequest } from 'next/server';

let dir: string;
let server: Server;
let baseUrl: string;
let colId: string;
let reqId: string;
let tcId: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-sched-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();

  colId = await collections.create({
    name: 'X',
    description: null,
    parentId: null,
    sortOrder: 0,
  });
  const envId = await envs.create({ name: 'dev' });
  await envs.setActive(envId);
  reqId = await requests.create({
    collectionId: colId,
    name: 'A',
    method: 'GET',
    url: `${baseUrl}/anything`,
    headers: '[]',
    queryParams: '[]',
    bodyKind: 'none',
    body: null,
    authKind: 'none',
    authConfig: null,
    preScript: null,
    postScript: null,
    sortOrder: 0,
  });
  tcId = await cases.create({
    requestId: reqId,
    name: 'always-200',
    description: null,
    assertions: JSON.stringify([{ type: 'status', expected: 200 }]),
    sortOrder: 0,
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function jsonReq(url: string, body: unknown, method: 'POST' | 'PATCH' | 'PUT' = 'POST'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/schedules', () => {
  it('creates a schedule and computes next_run_at', async () => {
    const res = await createSchedule(
      jsonReq('http://x/api/schedules', {
        name: 'Every 5 minutes',
        testCaseIds: [tcId],
        intervalKind: 'minutes',
        intervalValue: 5,
        timeOfDay: null,
        weekday: null,
        enabled: true,
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; testCaseIds: string[]; next_run_at: number };
    expect(body.testCaseIds).toEqual([tcId]);
    expect(body.next_run_at).toBeGreaterThan(Date.now() - 1000);
  });

  it('rejects when time_of_day is missing for days', async () => {
    const res = await createSchedule(
      jsonReq('http://x/api/schedules', {
        name: 'Bad',
        testCaseIds: [tcId],
        intervalKind: 'days',
        intervalValue: 1,
        timeOfDay: null,
        weekday: null,
        enabled: true,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects when weekday is missing for weeks', async () => {
    const res = await createSchedule(
      jsonReq('http://x/api/schedules', {
        name: 'Bad',
        testCaseIds: [tcId],
        intervalKind: 'weeks',
        intervalValue: 1,
        timeOfDay: '09:00',
        weekday: null,
        enabled: true,
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/schedules', () => {
  it('lists created schedules in next_run_at order', async () => {
    await jobs.create({
      name: 'later',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 30,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 30 * 60_000,
    });
    await jobs.create({
      name: 'sooner',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 5 * 60_000,
    });
    const res = await listSchedules();
    const body = (await res.json()) as { name: string }[];
    expect(body.map((b) => b.name)).toEqual(['sooner', 'later']);
  });
});

describe('GET /api/schedules/[id]', () => {
  it('returns the schedule and 404s when missing', async () => {
    const id = await jobs.create({
      name: 'A',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 60_000,
    });
    const res = await getSchedule(new NextRequest('http://x/api/schedules/' + id), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; testCaseIds: string[] };
    expect(body.id).toBe(id);
    expect(body.testCaseIds).toEqual([tcId]);

    const missing = await getSchedule(new NextRequest('http://x/api/schedules/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    });
    expect(missing.status).toBe(404);
  });
});

describe('PATCH /api/schedules/[id]', () => {
  it('toggles enabled and recomputes next_run_at when interval changes', async () => {
    const id = await jobs.create({
      name: 'orig',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 5 * 60_000,
    });

    const before = await jobs.getById(id);
    expect(before?.enabled).toBe(1);

    const res = await patchSchedule(
      jsonReq(
        'http://x/api/schedules/' + id,
        { intervalValue: 30, enabled: false },
        'PATCH',
      ),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);

    const after = await jobs.getById(id);
    expect(after?.enabled).toBe(0);
    expect(after?.interval_value).toBe(30);
  });

  it('returns 404 on missing id', async () => {
    const res = await patchSchedule(
      jsonReq('http://x/api/schedules/nope', { enabled: false }, 'PATCH'),
      { params: Promise.resolve({ id: 'nope' }) },
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/schedules/[id]', () => {
  it('removes a schedule', async () => {
    const id = await jobs.create({
      name: 'doomed',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 60_000,
    });
    const res = await deleteSchedule(new NextRequest('http://x/api/schedules/' + id), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    expect(await jobs.getById(id)).toBeUndefined();
  });
});

describe('POST /api/schedules/[id]/run', () => {
  it('executes the suite once and links the run', async () => {
    const id = await jobs.create({
      name: 'manual',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 60_000,
    });
    const res = await runScheduleNow(
      jsonReq('http://x/api/schedules/' + id + '/run', { ssrfMode: 'allow-local' }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runId: string; report: { total: number; passed: number } };
    expect(body.runId).toBeTruthy();
    expect(body.report.total).toBe(1);
    expect(body.report.passed).toBe(1);

    const after = await jobs.getById(id);
    expect(after?.last_run_id).toBe(body.runId);
    expect(after?.last_run_at).toBeGreaterThan(Date.now() - 5_000);
  });

  it('returns 404 on missing id', async () => {
    const res = await runScheduleNow(new NextRequest('http://x/api/schedules/missing/run'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/schedules/[id]/runs', () => {
  it('returns runs ordered newest first', async () => {
    const id = await jobs.create({
      name: 'history',
      testCaseIds: [tcId],
      intervalKind: 'minutes',
      intervalValue: 5,
      timeOfDay: null,
      weekday: null,
      enabled: true,
      nextRunAt: Date.now() + 60_000,
    });
    await runScheduleNow(
      jsonReq('http://x/api/schedules/' + id + '/run', { ssrfMode: 'allow-local' }),
      { params: Promise.resolve({ id }) },
    );
    await new Promise((r) => setTimeout(r, 5));
    await runScheduleNow(
      jsonReq('http://x/api/schedules/' + id + '/run', { ssrfMode: 'allow-local' }),
      { params: Promise.resolve({ id }) },
    );

    const res = await scheduleRuns(new NextRequest('http://x/api/schedules/' + id + '/runs'), {
      params: Promise.resolve({ id }),
    });
    const body = (await res.json()) as {
      id: string;
      status: string;
      started_at: number;
      summary: { passed: number };
    }[];
    expect(body.length).toBe(2);
    expect(body[0]!.started_at).toBeGreaterThanOrEqual(body[1]!.started_at);
    expect(body.every((b) => b.status === 'passed' && b.summary.passed === 1)).toBe(true);
  });
});
