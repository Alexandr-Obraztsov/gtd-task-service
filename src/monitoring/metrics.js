const os = require('node:os');
const pkg = require('../../package.json');
const config = require('../config/env');

const BYTES_IN_MB = 1024 * 1024;
const STATUS_CLASSES = Object.freeze(['1xx', '2xx', '3xx', '4xx', '5xx']);

function createState() {
  return {
    startedAt: Date.now(),
    total: 0,
    inFlight: 0,
    durationSumMs: 0,
    byStatusClass: Object.fromEntries(STATUS_CLASSES.map((name) => [name, 0])),
  };
}

let state = createState();

function statusClass(statusCode) {
  const name = `${Math.floor(statusCode / 100)}xx`;
  return STATUS_CLASSES.includes(name) ? name : '5xx';
}

function requestStarted() {
  state.inFlight += 1;
}

function requestFinished(statusCode, durationMs) {
  state.inFlight = Math.max(0, state.inFlight - 1);
  state.total += 1;
  state.durationSumMs += durationMs;
  state.byStatusClass[statusClass(statusCode)] += 1;
}

function reset() {
  state = createState();
}

function toMb(bytes) {
  return Math.round((bytes / BYTES_IN_MB) * 100) / 100;
}

function snapshot() {
  const memory = process.memoryUsage();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: { name: pkg.name, version: pkg.version, release: config.release, environment: config.nodeEnv },
    uptimeSeconds: Math.round(process.uptime()),
    process: {
      pid: process.pid,
      node: process.version,
      memory: {
        rssMb: toMb(memory.rss),
        heapTotalMb: toMb(memory.heapTotal),
        heapUsedMb: toMb(memory.heapUsed),
        externalMb: toMb(memory.external),
        arrayBuffersMb: toMb(memory.arrayBuffers),
      },
    },
    system: {
      loadAverage: os.loadavg().map((value) => Math.round(value * 100) / 100),
      freeMemoryMb: toMb(os.freemem()),
      totalMemoryMb: toMb(os.totalmem()),
      cpuCount: os.cpus().length,
    },
    requests: {
      total: state.total,
      inFlight: state.inFlight,
      byStatusClass: { ...state.byStatusClass },
      averageDurationMs: state.total ? Math.round((state.durationSumMs / state.total) * 100) / 100 : 0,
      sinceSeconds: Math.round((Date.now() - state.startedAt) / 1000),
    },
  };
}

module.exports = { requestStarted, requestFinished, snapshot, reset, statusClass };
