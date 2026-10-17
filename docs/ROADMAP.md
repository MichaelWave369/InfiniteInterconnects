# Roadmap: outward first, circle back with evidence

## Rung 1: governed local simulator (this PR)
- [x] Explicit node/capability inventory
- [x] Exact route grants, default deny
- [x] Handler delivery, failure isolation and redacted receipts
- [x] Browser exploration and automated core tests
- [ ] CI verified green on GitHub

## Rung 2: governance
- Capability contract schema, scopes, identities and key rotation proposal
- Revocation, expiry, anti-replay and approval boundaries
- Receipt export, provenance metadata and validation
- Threat model plus adversarial tests

## Rung 3: integration adapters (opt-in)
- Infinite Porch: identity and entrance boundary
- Infinite Commons: service directory and governed capability discovery
- PorchTalk: transport candidate, subject to its own verification gates
- SuperPhiVessel: orchestration proposals requiring human authorization
- Anti-M: independent completion verification and receipt review
- Kingdoms: isolated service domains

Adapters must not presume any existing project is integrated or verified.

## Rung 4: topology experiments
- Compare hub-and-spoke, mesh, ring, hierarchical, and optional 36-channel reference layouts
- Measure hop counts, partition tolerance, policy complexity, latency and failure behavior
- Keep NBG mathematical comparisons explicitly hypothetical until falsifiable tests exist

## Rung 5: deployment
- Peer discovery, authorization gateway and transport after security review
- Signed release artifacts, reproducible builds, CI security gates
- Live interactive GitHub Pages presentation, independent of backend deployment
