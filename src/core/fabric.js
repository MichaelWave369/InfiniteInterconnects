/**
 * Infinite Interconnects v0.1: deterministic in-memory proof of the policy gate.
 * This is a simulator, NOT a production identity, network, or authorization service.
 */
const routeKey = (from, to, capability) => JSON.stringify([from, to, capability]);
const receiptField = (v) => typeof v === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(v) ? v : null;
const receiptTrace = (v) => typeof v === 'string' &&
  /^[A-Za-z0-9._:-]{1,64}$/.test(v) ? v : null;
const CONTRACT_DENIALS = new Set([
  'INVALID_ENVELOPE_SHAPE', 'UNSUPPORTED_ENVELOPE_SCHEMA',
  'INVALID_ENVELOPE_FIELDS', 'INVALID_ENVELOPE_TIME',
  'ENVELOPE_EXPIRED', 'INVALID_ENVELOPE_PAYLOAD', 'REPLAY_DETECTED'
]);

export function createFabric({
  nodes = [],
  grants = [],
  clock = () => new Date().toISOString(),
  receiptLimit = 256
} = {}) {
  if (!Number.isInteger(receiptLimit) || receiptLimit < 1) {
    throw new TypeError('receiptLimit must be a positive integer');
  }

  const registry = new Map();
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || !node.id.trim() ||
        !Array.isArray(node.capabilities) ||
        !node.capabilities.every((cap) => typeof cap === 'string' && cap.trim())) {
      throw new TypeError('Invalid node descriptor');
    }
    if (registry.has(node.id)) throw new Error('Duplicate node ID: ' + node.id);
    registry.set(node.id, Object.freeze({
      id: node.id,
      label: String(node.label || node.id),
      kind: String(node.kind || 'service'),
      capabilities: Object.freeze([...new Set(node.capabilities)]),
      enabled: node.enabled !== false,
      x: Number.isFinite(node.x) ? node.x : 50,
      y: Number.isFinite(node.y) ? node.y : 50
    }));
  }

  const policy = new Set();
  const grantRecords = [];
  for (const grant of grants) {
    if (!grant || !['from', 'to', 'capability'].every(
      (field) => typeof grant[field] === 'string' && grant[field].trim()
    )) throw new TypeError('Invalid grant');
    const record = Object.freeze({
      from: grant.from, to: grant.to, capability: grant.capability
    });
    const key = routeKey(record.from, record.to, record.capability);
    if (!policy.has(key)) {
      policy.add(key);
      grantRecords.push(record);
    }
  }

  const handlers = new Map();
  const receipts = [];
  let nextId = 0;

  function inspect({ from, to, capability } = {}) {
    if (![from, to, capability].every((v) => typeof v === 'string' && v.length)) {
      return 'INVALID_ROUTE';
    }
    const source = registry.get(from);
    const target = registry.get(to);
    if (!source) return 'UNKNOWN_SOURCE';
    if (!target) return 'UNKNOWN_TARGET';
    if (!source.enabled || !target.enabled) return 'NODE_DISABLED';
    if (!target.capabilities.includes(capability)) return 'CAPABILITY_NOT_OFFERED';
    if (!policy.has(routeKey(from, to, capability))) return 'NOT_GRANTED';
    if (!handlers.has(routeKey(to, to, capability))) return 'NO_HANDLER';
    return 'ALLOWED';
  }

  function record(traceId, route, status, reason) {
    const receipt = Object.freeze({
      traceId,
      timestamp: String(clock()),
      from: receiptField(route.from),
      to: receiptField(route.to),
      capability: receiptField(route.capability),
      requestTraceId: receiptTrace(route.requestTraceId),
      status,
      reason
      // Intentionally never record payloads, handler responses, or thrown errors.
    });
    receipts.push(receipt);
    if (receipts.length > receiptLimit) receipts.shift();
    return { ...receipt };
  }

  return Object.freeze({
    discover() {
      // Discoverable metadata is not an authorization grant.
      return [...registry.values()].map((node) => ({
        ...node, capabilities: [...node.capabilities]
      }));
    },
    grants() {
      return grantRecords.map((grant) => ({ ...grant }));
    },
    inspect,
    registerHandler(nodeId, capability, handler) {
      const node = registry.get(nodeId);
      if (!node || !node.capabilities.includes(capability)) {
        throw new Error('Cannot register undeclared capability');
      }
      if (typeof handler !== 'function') throw new TypeError('Handler must be a function');
      const key = routeKey(nodeId, nodeId, capability);
      if (handlers.has(key)) throw new Error('Handler already registered');
      handlers.set(key, handler);
      return () => handlers.delete(key);
    },
    reject(route = {}, reason) {
      if (!CONTRACT_DENIALS.has(reason)) {
        throw new TypeError('Invalid contract rejection code');
      }
      const traceId = 'ii-' + String(++nextId).padStart(6, '0');
      return record(traceId, route && typeof route === 'object' ? route : {}, 'DENIED', reason);
    },
    dispatch(route = {}) {
      const traceId = 'ii-' + String(++nextId).padStart(6, '0');
      const reason = inspect(route);
      if (reason !== 'ALLOWED') {
        return { ok: false, receipt: record(traceId, route, 'DENIED', reason) };
      }
      const handler = handlers.get(routeKey(route.to, route.to, route.capability));
      try {
        const response = handler(Object.freeze({
          traceId,
          from: route.from,
          to: route.to,
          capability: route.capability,
          payload: route.payload
        }));
        if (response && typeof response.then === 'function') {
          throw new TypeError('Async handlers are unsupported in the v0.1 simulator');
        }
        return {
          ok: true,
          response,
          receipt: record(traceId, route, 'DELIVERED', 'POLICY_GRANTED')
        };
      } catch {
        // Do not disclose or persist handler exception details across a boundary.
        return {
          ok: false,
          receipt: record(traceId, route, 'FAILED', 'HANDLER_ERROR')
        };
      }
    },
    receipts() {
      return receipts.map((receipt) => ({ ...receipt }));
    }
  });
}
