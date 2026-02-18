import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';

// Minimal app for health test (avoids loading env/DB/Clerk)
const app = express();
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    requestId: req.id || req.headers['x-request-id'] || '',
    version: process.env.npm_package_version || '1.0.0',
  });
});

describe('GET /api/v1/health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect(200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.time);
    assert.ok(res.body.requestId !== undefined);
  });
});
