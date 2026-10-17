/**
 * Fictional protocol examples. No real services, identities or transport.
 * The two grants are independent. The Commons grant is not inherited by Porch.
 */
import { MANIFEST_SCHEMA, createContractGateway, createEnvelope } from '../core/contracts.js';

export const DEMO_MANIFESTS = Object.freeze([
  {
    schema: MANIFEST_SCHEMA, id: 'porch', label: 'Infinite Porch',
    kind: 'gateway', version: '0.2.0',
    capabilities: [{ name: 'admit', version: '1.0.0', visibility: 'restricted' }]
  },
  {
    schema: MANIFEST_SCHEMA, id: 'commons', label: 'Infinite Commons',
    kind: 'directory', version: '0.2.0',
    capabilities: [{ name: 'discover', version: '1.0.0', visibility: 'public' }]
  },
  {
    schema: MANIFEST_SCHEMA, id: 'auralith', label: 'Auralith Kingdom',
    kind: 'kingdom', version: '0.2.0',
    capabilities: [
      { name: 'render', version: '1.0.0', visibility: 'public' },
      { name: 'preserve', version: '1.0.0', visibility: 'restricted' }
    ]
  },
  {
    schema: MANIFEST_SCHEMA, id: 'domistika', label: 'Domistika Kingdom',
    kind: 'kingdom', version: '0.2.0',
    capabilities: [{ name: 'compose', version: '1.0.0', visibility: 'restricted' }]
  }
]);

export const DEMO_CONTRACT_GRANTS = Object.freeze([
  { from: 'porch', to: 'commons', capability: 'discover' },
  { from: 'commons', to: 'auralith', capability: 'render' }
]);

export function makeDemoContractGateway(clock = () => new Date().toISOString()) {
  const gateway = createContractGateway({
    manifests: DEMO_MANIFESTS,
    grants: DEMO_CONTRACT_GRANTS,
    clock
  });
  gateway.registerHandler('auralith', 'render', ({ from }) =>
    ({ rendered: true, by: 'auralith', requester: from, simulation: true }));
  return gateway;
}

export function demoEnvelope({ messageId, traceId = messageId, from, to,
  capability, payload = {}, now = new Date(),
  issuedAt = new Date(now).toISOString(),
  expiresAt = new Date(new Date(now).getTime() + 60_000).toISOString() }) {
  return createEnvelope({ messageId, traceId, from, to, capability, payload,
    issuedAt, expiresAt });
}
