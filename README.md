# Infinite Interconnects

**The governed fabric between worlds.**

Infinite Interconnects is a standalone experimental communication layer inspired by the Infinite Porch → Infinite Commons → Infinite Kingdoms architecture. It explores how independently governed services might discover each other, request scoped capabilities, and leave reviewable evidence of every attempted crossing.

> **Discoverable ≠ authorized. Explicit grants are required. No consequential crossing without a receipt.**

## Status: v0.2 contract lab (reference simulator)

This repository currently provides:

- A dependency-free JavaScript, in-memory routing and authorization simulator
- Registered identities and target-declared capabilities
- Exact, directional source → target → capability grants; default deny
- Synchronous demo handlers, explicit denial/failure reasons, and bounded redacted receipts
- Automated unit tests for allowed, denied, unknown, disabled, malformed, and failed routes
- A React + Vite interactive topology explorer with 9 fictional services and a 36-point visual motif
- **v0.2 interconnect contracts**: strict versioned service manifests and message envelopes
- Permission-filtered Commons directory catalog, independent grants at each hop, time/payload bounds, in-memory replay checking
- An interactive Porch → Commons → Auralith handshake lab, including an explicitly denied direct route
- CI that runs tests and builds the site

**This does not yet send real network packets or authenticate users.** There are no production adapters, secured transports, persistent ledger records or live integrations. Do not connect this simulator to sensitive systems.

## Get started

Requires Node.js 22+ and npm.

~~~sh
npm install
npm test
npm run dev
npm run build
~~~

The local Vite dev server displays the graphical route console. Use the Granted and Denied quick tests, dispatch a request, and inspect its receipt. The Vite base is configured for GitHub Pages. The publication workflow and required one-time repository setting are documented in [GitHub Pages launch](docs/PAGES.md). The public address after successful deployment is **https://michaelwave369.github.io/InfiniteInterconnects/**. Do not treat a passing build as proof the page has deployed.

## Conceptual architecture

~~~text
                  INFINITE PORCH
                entry • identity • trust
                         ⇵
                INFINITE INTERCONNECTS
        discovery ≠ authorization • scoped routing
              approvals • receipts • boundaries
                         ⇵
                  INFINITE COMMONS
            shared services • directory
                   ↙     ↓     ↘
             AI Kingdoms  Creative Worlds  Local Devices

     SuperPhiVessel / PorchTalk / Anti-M / Ledger
           future opt-in integration candidates
~~~

These are **conceptual boundaries**, not claims that these other repositories have been connected.

## Where the 36 comes from

The interactive graph includes 36 peripheral dots as a visual reference to a traditional *nadi/chakra* illustration that prompted the architectural idea. The count is **not** a networking requirement, anatomical claim, mathematical proof, or a performance optimization. We intend to compare topologies experimentally before choosing any deployment topology.

## File map

- [src/core/fabric.js](src/core/fabric.js): headless reference engine and receipt logic
- [src/core/contracts.js](src/core/contracts.js): manifests, envelopes, scoped directory and demo gateway
- [src/components/ContractLab.jsx](src/components/ContractLab.jsx): two-hop handshake and denied-shortcut UI
- [tests/contracts.test.js](tests/contracts.test.js): contract-validation and adversarial behavior tests
- [src/demo/fixtures.js](src/demo/fixtures.js): simulated participants and grants
- [src/App.jsx](src/App.jsx): interactive React topology and route console
- [tests/fabric.test.js](tests/fabric.test.js): Node test suite
- [docs/BOUNDARIES.md](docs/BOUNDARIES.md): trust boundaries, threat model starting point and explicit non-goals
- [docs/ROADMAP.md](docs/ROADMAP.md): governed rollout and verification gates
- [docs/CONTRACTS.md](docs/CONTRACTS.md): v0.2 wire-format proposal, trust boundaries and demo examples
- [docs/PAGES.md](docs/PAGES.md): GitHub Pages activation, verification and troubleshooting
- [scripts/verify-pages.mjs](scripts/verify-pages.mjs): check published JS/CSS asset paths

## Principles

1. **Independent sovereignty.** A Kingdom can expose capabilities without ceding ownership or memory.
2. **Permission before crossing.** A discovered route is not an authorized route.
3. **Minimal receipts.** Record decision metadata, not payloads or private exception details.
4. **Adapters are opt-in.** No implicit integration with any neighboring repository.
5. **Evidence before claims.** Treat experiments, demos and verified deployments as different states.

**Build outward. Circle back. Ledger above ego.**
