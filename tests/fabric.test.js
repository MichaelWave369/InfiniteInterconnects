import test from 'node:test';
import assert from 'node:assert/strict';
import { createFabric } from '../src/core/fabric.js';

const nodes = [
  { id: 'porch', capabilities: ['enter'] },
  { id: 'commons', capabilities: ['discover', 'announce'] },
  { id: 'kingdom', capabilities: ['render'] }
];

function setup(grants = [{ from: 'porch', to: 'commons', capability: 'discover' }]) {
  return createFabric({ nodes, grants, clock: () => '2026-10-17T00:00:00.000Z' });
}

test('explicitly granted route delivers and emits a minimal receipt', () => {
  const fabric = setup();
  fabric.registerHandler('commons', 'discover', ({ payload }) => ({ count: payload.count }));
  const response = fabric.dispatch({
    from: 'porch', to: 'commons', capability: 'discover', payload: { count: 3, secret: 'private' }
  });
  assert.equal(response.ok, true);
  assert.deepEqual(response.response, { count: 3 });
  assert.equal(response.receipt.status, 'DELIVERED');
  assert.equal(response.receipt.traceId, 'ii-000001');
  assert.equal(response.receipt.timestamp, '2026-10-17T00:00:00.000Z');
  assert.equal(JSON.stringify(fabric.receipts()).includes('private'), false);
  assert.equal(JSON.stringify(fabric.receipts()).includes('secret'), false);
});

test('discovery does not grant execution permission', () => {
  const fabric = setup();
  let calls = 0;
  fabric.registerHandler('kingdom', 'render', () => { calls++; });
  assert.equal(fabric.discover().some((node) => node.id === 'kingdom'), true);
  const result = fabric.dispatch({ from: 'porch', to: 'kingdom', capability: 'render' });
  assert.equal(result.ok, false);
  assert.equal(result.receipt.reason, 'NOT_GRANTED');
  assert.equal(calls, 0);
});

test('unknown identities are denied before handler invocation', () => {
  const fabric = setup();
  fabric.registerHandler('commons', 'discover', () => true);
  assert.equal(fabric.dispatch({
    from: 'stranger', to: 'commons', capability: 'discover'
  }).receipt.reason, 'UNKNOWN_SOURCE');
  assert.equal(fabric.dispatch({
    from: 'porch', to: 'unknown', capability: 'discover'
  }).receipt.reason, 'UNKNOWN_TARGET');
});

test('undeclared capabilities and missing handlers fail closed', () => {
  const fabric = setup();
  assert.equal(fabric.dispatch({
    from: 'porch', to: 'commons', capability: 'admin'
  }).receipt.reason, 'CAPABILITY_NOT_OFFERED');
  assert.equal(fabric.dispatch({
    from: 'porch', to: 'commons', capability: 'discover'
  }).receipt.reason, 'NO_HANDLER');
});

test('handler faults produce a redacted failure receipt', () => {
  const fabric = setup();
  fabric.registerHandler('commons', 'discover', () => { throw new Error('private stack trace'); });
  const outcome = fabric.dispatch({ from: 'porch', to: 'commons', capability: 'discover' });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.receipt.status, 'FAILED');
  assert.equal(outcome.receipt.reason, 'HANDLER_ERROR');
  assert.equal(JSON.stringify(outcome).includes('private stack trace'), false);
});

test('receipt history stays bounded and returned receipts are copies', () => {
  const fabric = createFabric({ nodes, receiptLimit: 2, clock: () => 'fixed' });
  for (let i = 0; i < 3; i++) {
    fabric.dispatch({ from: 'porch', to: 'kingdom', capability: 'render' });
  }
  assert.equal(fabric.receipts().length, 2);
  assert.equal(fabric.receipts()[0].traceId, 'ii-000002');
  const external = fabric.receipts();
  external[0].status = 'DELIVERED';
  assert.equal(fabric.receipts()[0].status, 'DENIED');
});

test('duplicate identities and malformed route descriptors are rejected', () => {
  assert.throws(() => createFabric({ nodes: [nodes[0], nodes[0]] }), /Duplicate/);
  assert.throws(() => createFabric({ nodes, receiptLimit: 0 }), /positive integer/);
  assert.equal(setup().dispatch({}).receipt.reason, 'INVALID_ROUTE');
});

test('disabled nodes never receive traffic, even with an explicit grant', () => {
  const fabric = createFabric({
    nodes: [{ id: 'a', capabilities: [] }, { id: 'b', capabilities: ['read'], enabled: false }],
    grants: [{ from: 'a', to: 'b', capability: 'read' }]
  });
  fabric.registerHandler('b', 'read', () => true);
  assert.equal(fabric.dispatch({ from: 'a', to: 'b', capability: 'read' }).receipt.reason, 'NODE_DISABLED');
});
