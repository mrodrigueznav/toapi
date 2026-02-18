import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let requestsServedSinceStart = 0;

export function incrementRequestsServed() {
  requestsServedSinceStart += 1;
}

export function getRequestsServed() {
  return requestsServedSinceStart;
}

export async function health(req, res) {
  const requestId = req.id || '';
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    requestId,
    version: process.env.npm_package_version || '1.0.0',
  });
}

export async function metrics(req, res) {
  const start = global.__serverStartTime__ ? Date.now() - global.__serverStartTime__ : process.uptime() * 1000;
  res.json({
    uptimeSeconds: Math.floor(start / 1000),
    memoryUsage: process.memoryUsage(),
    requestsServedSinceStart: getRequestsServed(),
  });
}

export function registerServerStart() {
  global.__serverStartTime__ = Date.now();
}
