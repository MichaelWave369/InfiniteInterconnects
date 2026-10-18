# Identity and capability security lab: v0.3

## Status and intended boundary

This milestone is a **Node.js-only, in-process security research harness**. It uses Node's real Ed25519 implementation to demonstrate signatures, verified peer key possession, issuer trust, scoped grants, expiry, local revocation and fail-closed dispatch.

It is **not a production authentication service**. It has no authenticated network transport, client enrollment, PKI, private-key vault, cross-process session store, revocation distribution, persistent anti-replay coordination, safe remote admin API, or external security review. There are no new live integrations, and the GitHub Pages browser app **does not** load Node key material or execute this module.

### Four independent gates

~~~text
1. IDENTITY: peer proves possession of pre-trusted Ed25519 key
   -> consume single-use nonce, obtain temporary opaque in-memory session

2. AUTHORITY: independently signed issuer grant
   -> verify Ed25519 over deterministic, domain-separated claims

3. BINDING: grant subject == authenticated session identity
   -> audience/capability/scope match request exactly; valid dates; not revoked

4. EXISTING FABRIC: regular versioned envelope + explicit route policy
   -> no direct Porch -> Kingdom authorization without the base route grant
   -> no transitive permissions just because Commons is authorized
~~~

**All four gates must pass** for a handler to run.

## Grant schema: ii.grant/1

A signed grant has exactly two top-level keys: claims and signature.

~~~json
{
  "claims": {
    "schema": "ii.grant/1",
    "grantId": "EXAMPLEONLY0123456789",
    "issuer": "authority",
    "subject": "commons",
    "audience": "auralith",
    "capability": "render",
    "scope": "scene.preview",
    "issuedAt": "2026-10-17T20:00:00.000Z",
    "expiresAt": "2026-10-17T20:01:00.000Z"
  },
  "signature": "BASE64URL_OF_ED25519_SIGNATURE"
}
~~~

The sample signature above is a **placeholder**, not a usable credential. Never commit real private keys or session handles.

Implementation:
- Algorithm: Ed25519 via native Node.js crypto, with explicitly pinned trusted public keys
- Serialization: exact ordered claim fields (the sequence in src/security/authority.node.js) encoded as a JSON array, prefixed by a versioned domain separator
- No algorithm choice passed by clients
- Strict field sets, UTC timestamps, 60-minute maximum grant lifetime
- Distinct issuer (who authorized), subject (who may call), audience (who receives), capability (which operation), scope (the agreed usage context)
- A grant cannot override or create a base fabric route
- Revocation is indexed by exact issuer plus grant ID, in-memory and not durable
- Grant signature authenticity is only as sound as trusted issuer key enrollment, distribution and custody (not provided here)

## Identity challenge protocol: local proof

1. The test host configures a mapping from peer identity to its trusted Ed25519 public key.
2. The peer requests a fresh random, 192-bit challenge nonce.
3. The peer signs a domain-separated representation of its claimed identity and that nonce.
4. The lab verifies signature against the already pinned peer key. The nonce is single use, even when verification fails.
5. The lab issues a random, short-lived **local session handle**, stored only in memory, which must match the request source.
6. A signed capability grant is still required for each authorized route.

The session handle in this reference model is a **local API secret**, not suitable as a network bearer token. A real transport must bind the authenticated peer to the channel, protect the session from theft, and implement session renewal/revocation.

## Adversarial checks

The automated suite tests:
- Wrong keys, failed proofs, consumed/replayed challenges
- Stolen or missing local session, mismatched envelope source
- Forged issuer signature, tampered signed claims and invalid top-level fields
- Wrong subject, audience, capability or scope
- Expired challenges, sessions and grants
- Local grant revocation and replayed envelope IDs
- Persistent base fabric default-deny behavior despite a cryptographically valid grant
- Redacted security receipts that exclude payloads, signatures, grants and sessions
- Independent Porch and Commons identities, with no transitive permission

Run:

~~~sh
npm test
npm run security:demo
npm run build
~~~

The demo command generates **ephemeral test keys in memory**. It prints only status codes, never keys, grant signatures, session IDs, or payloads.

## Before production integration

1. Decide service root-of-trust, issuance rules, key rotation, certificate/key attestations and recovery.
2. Use authenticated transport with peer/channel binding (such as a reviewed mutually authenticated protocol).
3. Replace ephemeral local session state with hardened revocable, bounded server-side session management.
4. Replace in-memory revocation with a persistent and distributed, fail-closed revocation design.
5. Define global/durable replay model with nonce coordination across restarts and replicas.
6. Separate admin control APIs from the untrusted data plane; require authorization for all mutations.
7. Introduce schema evolution, signature key IDs, explicit issuance approval and minimum privilege scopes.
8. Add request limits, resource quotas, concurrency controls and denial-of-service considerations.
9. Perform external threat modeling and adversarial transport tests before enabling real peers.
10. Keep verified integrations distinct from examples and never claim the diagram's 36 channels imply any security properties.

**Ledger above ego:** real signatures are useful evidence of key possession; they are not proof that a distributed identity architecture is production ready.
