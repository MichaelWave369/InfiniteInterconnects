# Roadmap: outward first, circle back with evidence

## Rung 1: governed local simulator (this PR)
- [x] Explicit node/capability inventory
- [x] Exact route grants, default deny
- [x] Handler delivery, failure isolation and redacted receipts
- [x] Browser exploration and automated core tests
- [x] CI verified green on GitHub

## Rung 2: interconnect contracts (PR #3)
- [x] v1-tagged service manifests and capability visibility contracts (local assertions)
- [x] v1-tagged request envelopes with strict structural, payload and time validation
- [x] Independent per-hop grants and filtered Commons directory replies
- [x] Denial receipts and bounded in-memory replay illustration
- [x] Simulated Porch → Commons → Kingdom handshake with browser controls and tests
- [ ] Merge after CI and review; verify updated live GitHub Page

## Rung 3: signed capability and identity proofs (PR #4)
- [x] Offline Ed25519 challenge-response against pinned peer public keys
- [x] Ed25519-signed subject/audience/capability/scope grants and expiry
- [x] In-memory revocation and short-lived identity session tests
- [x] Preserve exact default-deny fabric grants as an independent gate
- [x] Adversarial security tests and safe, redacted receipts
- [ ] Merge after green CI, verify live Pages deploy

## Rung 4: production security design
- [ ] Verified peer identity, authenticated transport and signature/issuer contracts
- [ ] Real revocation, expiry and durable anti-replay guarantees
- [ ] Receipt provenance, tamper-evident export and retention policy
- [ ] Threat model, trust-boundary diagrams and adversarial transport tests
- [ ] Protected directory metadata and version negotiation

## Rung 5: integration adapters (opt-in)
- Infinite Porch: identity and entrance boundary
- Infinite Commons: service directory and governed capability discovery
- PorchTalk: transport candidate, subject to its own verification gates
- SuperPhiVessel: orchestration proposals requiring human authorization
- Anti-M: independent completion verification and receipt review
- Kingdoms: isolated service domains

Adapters must not presume any existing project is integrated or verified.

## Rung 6: topology experiments
- Compare hub-and-spoke, mesh, ring, hierarchical, and optional 36-channel reference layouts
- Measure hop counts, partition tolerance, policy complexity, latency and failure behavior
- Keep NBG mathematical comparisons explicitly hypothetical until falsifiable tests exist

## Rung 7: production deployment
- Peer discovery, authorization gateway and transport after security review
- Signed release artifacts, reproducible builds, CI security gates
- [x] Live interactive GitHub Pages presentation, independent of backend deployment
