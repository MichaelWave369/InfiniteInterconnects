# Trust boundaries and non-goals (v0.1)

Infinite Interconnects is a communication **fabric proposal**. The current code is an in-memory, synchronous, deterministic **simulation**, not a deployed cross-process network.

## Rules
1. Discovery exposes declared metadata, not permission to execute.
2. A route is denied unless source and target are registered, both enabled, the target declares its capability, and an exact source-to-target capability grant exists.
3. An allowed route must still have an installed handler.
4. Each dispatch produces an ordered receipt (delivered, denied, or failed). Receipt data omits payloads, outputs, exception messages and stack traces.
5. Permissions in v0.1 are supplied at construction. Clients cannot grant their own capabilities through dispatch.
6. No automatic transitive grants, broadcast, or multi-hop traversal.

## NOT provided by this prototype
- Cryptographic identities, signatures, encryption, key management or authentication
- Transport security, distributed consensus, replay prevention or real network connectivity
- Durable append-only audit storage, nonrepudiation or reliable delivery
- Sandboxing, resource quotas, revocation propagation or privacy-safe discovery controls
- Async handler cancellation, delivery retries, multi-hop permission proofs

Consequently, never connect this simulator directly to sensitive services or treat a demo grant as a real security decision.

## Next engineering gates
- Specify signed capability tokens, issuer/subject/audience, expiry, nonce and revocation semantics
- Specify authenticated transport and message schemas; adversarial replay and injection tests
- Design durable ledger receipts with hashing/verification and retention policy
- Separate protected discovery metadata from public discovery
- Add transport adapters only after threat modeling and approval reviews
- Measure topology performance before claiming an advantage for a 36-channel layout

## Provenance
The 36-channel visual motif was inspired by a traditional nadi/chakra illustration. It is cultural/design inspiration, not a validated anatomical model, source code, or evidence of a superior network topology.
