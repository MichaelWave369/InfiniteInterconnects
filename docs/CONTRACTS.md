# Interconnect Contracts v0.2

**Status: simulated contract draft, not a security protocol.** Schemas, identities, routing checks, replay cache and time bounds are local JavaScript behaviors. There is no network transport, authentication, encryption, signature verification, or durable audit.

## Trust principle

> Discovery is not authority. Authority is exact, directional, scoped, and independently verified at every hop.

Even when service A discovers service B's public capability, A does not automatically gain permission to invoke B. A grant from A → Commons never passes to Commons → B, and a Commons → B grant never passes back to A.

## Service manifest: ii.manifest/1

Each registered service declares an ID, display label, kind, semantic version, and offered capabilities:

~~~json
{
  "schema": "ii.manifest/1",
  "id": "auralith",
  "label": "Auralith Kingdom",
  "kind": "kingdom",
  "version": "0.2.0",
  "capabilities": [
    { "name": "render", "version": "1.0.0", "visibility": "public" },
    { "name": "preserve", "version": "1.0.0", "visibility": "restricted" }
  ]
}
~~~

Manifest fields are assertions by the local configuration, not authenticated identity claims. Unexpected top-level/capability fields, duplicate capability IDs, invalid versions and unsupported schema tags are rejected.

Visibility:
- **public:** eligible to appear in the directory response, but still requires an exact invocation grant.
- **restricted:** appears only when that requester has an exact grant to the service capability. A service whose capabilities are all hidden is excluded from the catalog response.

The directory responds only to valid, permission-granted discover envelope requests. Unauthorized callers cannot use the directory handler. This prototype's public catalog is safe only with fictional data: deploy no secrets or confidential metadata.

## Message envelope: ii.envelope/1

~~~json
{
  "schema": "ii.envelope/1",
  "messageId": "request-001",
  "traceId": "conversation-001",
  "from": "porch",
  "to": "commons",
  "capability": "discover",
  "issuedAt": "2026-10-17T20:00:00.000Z",
  "expiresAt": "2026-10-17T20:01:00.000Z",
  "payload": { "action": "list-public-services" }
}
~~~

Validation rules:
- Strict required fields, version/schema tag, ID/capability shape and timestamp format.
- The envelope lifespan is at most five minutes. issuedAt may be at most 30 seconds ahead of the simulator clock.
- Reject expired messages and non-JSON payloads, circular objects, dangerous prototype keys, non-finite numbers, or encoded payloads larger than 4096 bytes.
- A bounded in-memory message ID cache rejects duplicates **only while retained**. The cache is not durable and is not a production replay defense.
- traceId is a caller-supplied correlation hint, not an authorization credential. The local ledger also assigns an independent ii-****** receipt trace.
- Denials create redacted receipts containing decision metadata and, when safe, the request trace. No payloads or exception details are recorded.

All messages are requests, never proof of identity or authority. There is no implicit session, ambient admin role, broadcast or transitive delegation.

## Two-hop handshake demo

Two separate grants are configured in the demo:

~~~text
grant 1: porch   → commons   : discover
grant 2: commons → auralith  : render

Porch   -- discover request --> Commons
Commons -- public catalog  --> Porch
Commons -- render request  --> Auralith

Porch   -- render request  -X-> Auralith   (NOT_GRANTED)
~~~

The Commons call is a new, independently authorized request from Commons, not a forwarded/impersonated Porch identity. No real Porch, Commons, or Kingdom applications are involved.

Try this in the live React lab through RUN 2-STEP HANDSHAKE and TRY UNAUTHORIZED SHORTCUT. The UI uses the same createContractGateway functions tested by Node.js.

## JavaScript example

~~~js
import { createContractGateway, createEnvelope } from './src/core/contracts.js';
import { DEMO_MANIFESTS, DEMO_CONTRACT_GRANTS } from './src/demo/contracts-fixtures.js';

const gateway = createContractGateway({
  manifests: DEMO_MANIFESTS,
  grants: DEMO_CONTRACT_GRANTS
});
gateway.registerHandler('auralith', 'render', () => ({ simulated: true }));
const now = Date.now();
const result = gateway.dispatchEnvelope(createEnvelope({
  messageId: 'demo-1',
  traceId: 'example-1',
  from: 'porch', to: 'commons', capability: 'discover',
  issuedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 60_000).toISOString(),
  payload: {}
}));
console.log(result.ok, result.receipt.reason);
~~~

## What remains before a production adapter

- Actual peer identity verification and principal/actor binding
- Signed tokens, audience/scope constraints, expiry, issuer trust and revocation
- Authenticated transport, mutual peer authorization and serialization limits
- Durable replay prevention, nonce coordination and replay windows
- Hard budgets for handler execution, retry limits and cancellation
- Tamper-evident receipt storage with retention and inspection policies
- Confidential directory access, safe schema migrations and version negotiation
- Threat model, security reviews and multi-process adversarial tests
- Explicit approval for each integration adapter and access to host applications

**Never treat the local demo's from, traceId, public manifest, or successful validator as authentication.**

Build outward. Circle back. Ledger above ego.
