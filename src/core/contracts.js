/**
 * Infinite Interconnects contract layer v0.2 (LOCAL SIMULATOR ONLY).
 * Format validation is not authentication, signature verification or encryption.
 * Caller-supplied identities are untrusted until a future authenticated transport exists.
 */
import { createFabric } from './fabric.js';

export const MANIFEST_SCHEMA = 'ii.manifest/1';
export const ENVELOPE_SCHEMA = 'ii.envelope/1';

const IDENT = /^[a-z][a-z0-9-]{0,47}$/;
const TOKEN = /^[A-Za-z0-9._:-]{1,64}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_PAYLOAD_BYTES = 4096;
const MAX_AGE_MS = 5 * 60_000;
const FUTURE_SKEW_MS = 30_000;
const MAX_CAPABILITIES = 32;
const isRecord = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const exactly = (obj, keys) => Object.keys(obj).length === keys.length &&
  keys.every((key) => Object.hasOwn(obj, key));
const isUtc = (s) => typeof s === 'string' && UTC.test(s) &&
  Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s;
const failure = (code) => ({ ok: false, code });
const success = () => ({ ok: true, code: 'VALID' });

export function validateManifest(m) {
  if (!isRecord(m) || !exactly(m, ['schema', 'id', 'label', 'kind', 'version', 'capabilities'])) {
    return failure('INVALID_MANIFEST_SHAPE');
  }
  if (m.schema !== MANIFEST_SCHEMA) return failure('UNSUPPORTED_MANIFEST_SCHEMA');
  if (!IDENT.test(m.id) || typeof m.label !== 'string' || !m.label.trim() ||
      m.label.length > 80 || !IDENT.test(m.kind) || !VERSION.test(m.version)) {
    return failure('INVALID_MANIFEST_FIELDS');
  }
  if (!Array.isArray(m.capabilities) || m.capabilities.length > MAX_CAPABILITIES) {
    return failure('INVALID_MANIFEST_CAPABILITIES');
  }
  const names = new Set();
  for (const c of m.capabilities) {
    if (!isRecord(c) || !exactly(c, ['name', 'version', 'visibility']) ||
        !IDENT.test(c.name) || !VERSION.test(c.version) ||
        !['public', 'restricted'].includes(c.visibility) || names.has(c.name)) {
      return failure('INVALID_MANIFEST_CAPABILITIES');
    }
    names.add(c.name);
  }
  return success();
}

/** Envelope timestamps are bounded by a 5-minute demo window. */
export function validateEnvelope(e, { now = new Date().toISOString() } = {}) {
  if (!isRecord(e) || !exactly(e, [
    'schema', 'messageId', 'traceId', 'from', 'to', 'capability',
    'issuedAt', 'expiresAt', 'payload'
  ])) return failure('INVALID_ENVELOPE_SHAPE');
  if (e.schema !== ENVELOPE_SCHEMA) return failure('UNSUPPORTED_ENVELOPE_SCHEMA');
  if (![e.messageId, e.traceId].every((v) => typeof v === 'string' && TOKEN.test(v)) ||
      ![e.from, e.to, e.capability].every((v) => typeof v === 'string' && IDENT.test(v))) {
    return failure('INVALID_ENVELOPE_FIELDS');
  }
  if (!isUtc(e.issuedAt) || !isUtc(e.expiresAt) || !isUtc(now)) {
    return failure('INVALID_ENVELOPE_TIME');
  }
  const start = Date.parse(e.issuedAt), end = Date.parse(e.expiresAt), current = Date.parse(now);
  if (end <= start || end - start > MAX_AGE_MS || start > current + FUTURE_SKEW_MS) {
    return failure('INVALID_ENVELOPE_TIME');
  }
  if (current >= end || start < current - MAX_AGE_MS) return failure('ENVELOPE_EXPIRED');
  if (!isRecord(e.payload) || !isJsonObjectTree(e.payload)) {
    return failure('INVALID_ENVELOPE_PAYLOAD');
  }
  let encoded;
  try {
    encoded = JSON.stringify(e.payload);
  } catch {
    return failure('INVALID_ENVELOPE_PAYLOAD');
  }
  if (typeof encoded !== 'string' ||
      new TextEncoder().encode(encoded).length > MAX_PAYLOAD_BYTES) {
    return failure('INVALID_ENVELOPE_PAYLOAD');
  }
  return success();
}

// No non-JSON values, cycles, accessors, custom prototypes, or poisonous keys.
// Keeps the simulated envelope independent of arbitrary JS object behavior.
function isJsonObjectTree(root) {
  const visited = new Set();
  function visit(v, depth) {
    if (depth > 24) return false;
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v !== 'object' || visited.has(v)) return false;
    if (!Array.isArray(v) && !isRecord(v)) return false;
    visited.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(descriptors);
    for (const key of keys) {
      if (typeof key !== 'string' || key === '__proto__' || key === 'constructor' ||
          key === 'prototype') return false;
      const d = descriptors[key];
      if (!Object.hasOwn(d, 'value') || !visit(d.value, depth + 1)) return false;
    }
    visited.delete(v);
    return true;
  }
  return visit(root, 0);
}

export function createEnvelope({ messageId, traceId, from, to, capability, payload = {},
  issuedAt, expiresAt }) {
  return { schema: ENVELOPE_SCHEMA, messageId, traceId, from, to, capability,
    issuedAt, expiresAt, payload };
}

/**
 * Explicitly configured, untrusted demo gateway. The caller supplies "from",
 * which cannot be treated as a verified identity in production.
 */
export function createContractGateway({
  manifests, grants = [], directoryId = 'commons',
  clock = () => new Date().toISOString(), receiptLimit = 256, replayLimit = 1024
}) {
  if (!Array.isArray(manifests) || !Array.isArray(grants) ||
      !Number.isInteger(replayLimit) || replayLimit < 1) {
    throw new TypeError('Invalid gateway configuration');
  }
  const manifestMap = new Map();
  for (const manifest of manifests) {
    const check = validateManifest(manifest);
    if (!check.ok) throw new Error('Invalid manifest: ' + check.code);
    if (manifestMap.has(manifest.id)) throw new Error('Duplicate manifest identity');
    manifestMap.set(manifest.id, Object.freeze({
      ...manifest,
      capabilities: Object.freeze(manifest.capabilities.map((c) => Object.freeze({ ...c })))
    }));
  }
  if (!manifestMap.has(directoryId) ||
      !manifestMap.get(directoryId).capabilities.some((c) => c.name === 'discover')) {
    throw new Error('Directory must advertise discover capability');
  }
  // Validate grants against the constructed manifest inventory, never infer grants.
  for (const grant of grants) {
    if (!isRecord(grant) || !exactly(grant, ['from', 'to', 'capability']) ||
        ![grant.from, grant.to, grant.capability].every((s) => typeof s === 'string' && IDENT.test(s)) ||
        !manifestMap.has(grant.from) ||
        !manifestMap.get(grant.to)?.capabilities.some((c) => c.name === grant.capability)) {
      throw new Error('Invalid grant reference');
    }
  }
  const grantKeys = new Set(grants.map(({ from, to, capability }) => JSON.stringify([from, to, capability])));
  const fabric = createFabric({
    nodes: [...manifestMap.values()].map((m) => ({
      id: m.id, label: m.label, kind: m.kind,
      capabilities: m.capabilities.map((c) => c.name)
    })),
    grants, clock, receiptLimit
  });
  const seen = new Set();
  const seenOrder = [];

  // Directory reveals public declarations, not authority to invoke them.
  // Restricted capabilities are visible only with a corresponding direct grant.
  function catalog(from) {
    return [...manifestMap.values()].map((m) => ({
      id: m.id, label: m.label, kind: m.kind, version: m.version,
      capabilities: m.capabilities.filter((c) => c.visibility === 'public' ||
        grantKeys.has(JSON.stringify([from, m.id, c.name]))).map((c) => ({ ...c }))
    })).filter((entry) => entry.capabilities.length > 0);
  }
  fabric.registerHandler(directoryId, 'discover', ({ from }) => ({ services: catalog(from) }));

  function dispatchEnvelope(envelope) {
    const checked = validateEnvelope(envelope, { now: clock() });
    const route = isRecord(envelope)
      ? { from: envelope.from, to: envelope.to, capability: envelope.capability,
          requestTraceId: envelope.traceId }
      : {};
    if (!checked.ok) {
      return { ok: false, receipt: fabric.reject(route, checked.code) };
    }
    if (seen.has(envelope.messageId)) {
      return { ok: false, receipt: fabric.reject(route, 'REPLAY_DETECTED') };
    }
    seen.add(envelope.messageId);
    seenOrder.push(envelope.messageId);
    if (seenOrder.length > replayLimit) seen.delete(seenOrder.shift());
    return fabric.dispatch({ ...route, payload: envelope.payload });
  }

  return Object.freeze({
    dispatchEnvelope,
    registerHandler(nodeId, capability, handler) {
      if (nodeId === directoryId && capability === 'discover') {
        throw new Error('Cannot replace governed directory handler');
      }
      return fabric.registerHandler(nodeId, capability, handler);
    },
    receipts: () => fabric.receipts(),
    // Manifests are locally configured; direct callers are trusted developers,
    // unlike external peers. This is an admin API, not a network endpoint.
    inspect: (route) => fabric.inspect(route)
  });
}
