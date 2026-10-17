import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateManifest, validateEnvelope, createContractGateway, createEnvelope,
  MANIFEST_SCHEMA, ENVELOPE_SCHEMA
} from '../src/core/contracts.js';
import {
  DEMO_MANIFESTS, DEMO_CONTRACT_GRANTS, makeDemoContractGateway, demoEnvelope
} from '../src/demo/contracts-fixtures.js';

const NOW = '2026-10-17T20:00:00.000Z';
const now = () => NOW;
const valid = (config) => demoEnvelope({
  messageId: 'request-001', from: 'porch', to: 'commons',
  capability: 'discover', now: NOW, ...config
});

test('valid manifests and strict schemas', () => {
  for (const m of DEMO_MANIFESTS) assert.equal(validateManifest(m).ok, true);
  assert.equal(validateManifest({ ...DEMO_MANIFESTS[0], schema: 'ii.manifest/999' }).code,
    'UNSUPPORTED_MANIFEST_SCHEMA');
  assert.equal(validateManifest({ ...DEMO_MANIFESTS[0], authKey: 'secret' }).code,
    'INVALID_MANIFEST_SHAPE');
  assert.equal(validateManifest({
    ...DEMO_MANIFESTS[2],
    capabilities: [...DEMO_MANIFESTS[2].capabilities, DEMO_MANIFESTS[2].capabilities[0]]
  }).code, 'INVALID_MANIFEST_CAPABILITIES');
  assert.equal(validateManifest({
    ...DEMO_MANIFESTS[1], capabilities: [{ name: 'discover', version: '1.0.0',
      visibility: 'private' }]
  }).ok, false);
  assert.equal(validateManifest(null).ok, false);
  assert.equal(MANIFEST_SCHEMA, 'ii.manifest/1');
});

test('versioned envelopes validate and exclude unknown fields', () => {
  assert.equal(validateEnvelope(valid(), { now: NOW }).ok, true);
  assert.equal(validateEnvelope({ ...valid(), schema: 'ii.envelope/2' }, { now: NOW }).code,
    'UNSUPPORTED_ENVELOPE_SCHEMA');
  assert.equal(validateEnvelope({ ...valid(), scope: 'admin' }, { now: NOW }).code,
    'INVALID_ENVELOPE_SHAPE');
  assert.equal(validateEnvelope({ ...valid(), traceId: 'trace with spaces' }, { now: NOW }).code,
    'INVALID_ENVELOPE_FIELDS');
  assert.equal(ENVELOPE_SCHEMA, 'ii.envelope/1');
});

test('reject expired, future and malformed timestamps deterministically', () => {
  const expired = valid({ issuedAt: '2026-10-17T19:50:00.000Z',
    expiresAt: '2026-10-17T19:51:00.000Z' });
  assert.equal(validateEnvelope(expired, { now: NOW }).code, 'ENVELOPE_EXPIRED');
  assert.equal(validateEnvelope(valid({ issuedAt: '2026-10-17T21:00:00.000Z',
    expiresAt: '2026-10-17T21:01:00.000Z' }), { now: NOW }).code, 'INVALID_ENVELOPE_TIME');
  assert.equal(validateEnvelope(valid({ issuedAt: 'bad' }), { now: NOW }).code,
    'INVALID_ENVELOPE_TIME');
  assert.equal(validateEnvelope(valid({ expiresAt: '2026-10-17T20:08:00.000Z' }), { now: NOW }).code,
    'INVALID_ENVELOPE_TIME');
});

test('refuse oversized, non-JSON, or prototype-poisoning payloads', () => {
  const cases = [
    { bytes: 'x'.repeat(5000) },
    { bad: undefined }, { bad: Number.POSITIVE_INFINITY },
    JSON.parse('{"__proto__":{"admin":true}}'),
    { deep: { bad: () => 'hi' } },
    { symbol: Symbol('nope') }
  ];
  for (const payload of cases) {
    assert.equal(validateEnvelope(valid({ payload }), { now: NOW }).code,
      'INVALID_ENVELOPE_PAYLOAD');
  }
  const cyc = {};
  cyc.self = cyc;
  assert.equal(validateEnvelope(valid({ payload: cyc }), { now: NOW }).code,
    'INVALID_ENVELOPE_PAYLOAD');
});

test('handshake: Porch discovers public capability, Commons renders with its own grant', () => {
  const gateway = makeDemoContractGateway(now);
  const a = gateway.dispatchEnvelope(valid({ traceId: 'handshake-1' }));
  assert.equal(a.ok, true);
  assert.equal(a.receipt.status, 'DELIVERED');
  assert.equal(a.receipt.requestTraceId, 'handshake-1');
  const catalog = a.response.services;
  const auralith = catalog.find((s) => s.id === 'auralith');
  assert.ok(auralith);
  assert.deepEqual(auralith.capabilities.map((c) => c.name), ['render']);
  assert.ok(!catalog.some((s) => s.id === 'domistika'), 'restricted-only service must not leak');
  const b = gateway.dispatchEnvelope(valid({
    messageId: 'request-002', traceId: 'handshake-2',
    from: 'commons', to: 'auralith', capability: 'render',
    payload: { scene: 'demo' }
  }));
  assert.equal(b.ok, true);
  assert.equal(b.response.rendered, true);
  assert.equal(b.receipt.from, 'commons');
  assert.equal(b.receipt.to, 'auralith');
  assert.equal(gateway.receipts().length, 2);
});

test('visible public capability never implies a direct Porch grant', () => {
  const gateway = makeDemoContractGateway(now);
  const refused = gateway.dispatchEnvelope(valid({
    from: 'porch', to: 'auralith', capability: 'render'
  }));
  assert.equal(refused.ok, false);
  assert.equal(refused.receipt.reason, 'NOT_GRANTED');
  assert.equal(refused.receipt.status, 'DENIED');
});

test('deny unknown source, unoffered capability, and missing handler', () => {
  const gateway = makeDemoContractGateway(now);
  assert.equal(gateway.dispatchEnvelope(valid({ from: 'stranger' })).receipt.reason,
    'UNKNOWN_SOURCE');
  assert.equal(gateway.dispatchEnvelope(valid({ capability: 'admin', messageId: 'two' }))
    .receipt.reason, 'CAPABILITY_NOT_OFFERED');
  assert.equal(gateway.dispatchEnvelope(valid({
    from: 'porch', to: 'commons', capability: 'admit', messageId: 'three'
  })).receipt.reason, 'CAPABILITY_NOT_OFFERED');
});

test('malformed contracts fail closed, record redacted receipts, and never invoke handlers', () => {
  const gateway = makeDemoContractGateway(now);
  const bad = valid({ payload: { secret: 'EXCLUDE_ME' }, expiresAt: 'bad-time' });
  const result = gateway.dispatchEnvelope(bad);
  assert.equal(result.ok, false);
  assert.equal(result.receipt.reason, 'INVALID_ENVELOPE_TIME');
  assert.equal(JSON.stringify(gateway.receipts()).includes('EXCLUDE_ME'), false);
  assert.equal(gateway.receipts()[0].requestTraceId, bad.traceId);
});

test('duplicate message IDs are blocked in the bounded in-memory replay window', () => {
  const gateway = makeDemoContractGateway(now);
  const first = gateway.dispatchEnvelope(valid());
  const second = gateway.dispatchEnvelope(valid());
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.receipt.reason, 'REPLAY_DETECTED');
  assert.equal(gateway.receipts().length, 2);
});

test('never accept grants for undeclared or unknown targets', () => {
  assert.throws(() => createContractGateway({
    manifests: DEMO_MANIFESTS,
    grants: [{ from: 'ghost', to: 'commons', capability: 'discover' }]
  }), /Invalid grant/);
  assert.throws(() => createContractGateway({
    manifests: DEMO_MANIFESTS,
    grants: [{ from: 'porch', to: 'auralith', capability: 'erase' }]
  }), /Invalid grant/);
  assert.throws(() => createContractGateway({
    manifests: [...DEMO_MANIFESTS, DEMO_MANIFESTS[0]],
    grants: DEMO_CONTRACT_GRANTS
  }), /Duplicate manifest/);
});

test('the directory handler is owned by the gateway', () => {
  const gateway = makeDemoContractGateway(now);
  assert.throws(() => gateway.registerHandler('commons', 'discover', () => 'leak'),
    /Cannot replace/);
});

test('handler errors are redacted and do not leak private payloads', () => {
  const gateway = createContractGateway({
    manifests: DEMO_MANIFESTS, grants: DEMO_CONTRACT_GRANTS, clock: now
  });
  gateway.registerHandler('auralith', 'render', () => { throw Error('PRIVATE_STACK'); });
  const r = gateway.dispatchEnvelope(valid({
    from: 'commons', to: 'auralith', capability: 'render',
    payload: { private: 'PRIVATE_PAYLOAD' }
  }));
  assert.equal(r.ok, false);
  assert.equal(r.receipt.reason, 'HANDLER_ERROR');
  assert.ok(!JSON.stringify(gateway.receipts()).includes('PRIVATE'));
});

test('mutating caller manifests after creation never broadens registered capabilities', () => {
  const mutable = DEMO_MANIFESTS.map((m) => ({
    ...m, capabilities: m.capabilities.map((c) => ({ ...c }))
  }));
  const gateway = createContractGateway({
    manifests: mutable, grants: DEMO_CONTRACT_GRANTS, clock: now
  });
  mutable[2].capabilities.push({ name: 'erase', visibility: 'public', version: '1.0.0' });
  assert.equal(gateway.inspect({ from: 'commons', to: 'auralith', capability: 'erase' }),
    'CAPABILITY_NOT_OFFERED');
});

test('correlation trace is not executable authority and is sanitized in invalid receipts', () => {
  const gateway = makeDemoContractGateway(now);
  const bad = valid({ traceId: 'bad value with spaces', payload: { secret: 'foo' } });
  const r = gateway.dispatchEnvelope(bad);
  assert.equal(r.ok, false);
  assert.equal(r.receipt.requestTraceId, null);
  assert.equal(JSON.stringify(gateway.receipts()).includes('foo'), false);
});

test('replay window can be bounded without creating unbounded in-memory storage', () => {
  const gateway = createContractGateway({
    manifests: DEMO_MANIFESTS, grants: DEMO_CONTRACT_GRANTS,
    clock: now, replayLimit: 2
  });
  const call = (messageId) => gateway.dispatchEnvelope(valid({ messageId }));
  call('one'); call('two'); call('three');
  assert.equal(call('three').receipt.reason, 'REPLAY_DETECTED');
  assert.equal(call('one').ok, true); // Evicted. Not durable anti-replay protection.
});

test('createEnvelope generates the documented schema without inferred privilege', () => {
  const e = createEnvelope({
    messageId: 'abc', traceId: 't-1', from: 'porch', to: 'commons',
    capability: 'discover', issuedAt: NOW, expiresAt: '2026-10-17T20:01:00.000Z'
  });
  assert.equal(e.schema, ENVELOPE_SCHEMA);
  assert.deepEqual(e.payload, {});
  assert.equal(validateEnvelope(e, { now: NOW }).ok, true);
});
