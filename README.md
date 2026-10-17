# Infinite Interconnects

**The governed fabric between worlds.**

Infinite Interconnects is a standalone experimental communication layer inspired by the Infinite Porch → Infinite Commons → Infinite Kingdoms architecture. It explores how independently governed services might discover each other, request scoped capabilities, and leave reviewable evidence of every attempted crossing.

> **Discoverable ≠ authorized. Explicit grants are required. No consequential crossing without a receipt.**

## Status: v0.1 reference simulator

This repository currently provides:

- A dependency-free JavaScript, in-memory routing and authorization simulator
- Registered identities and target-declared capabilities
- Exact, directional source → target → capability grants; default deny
- Synchronous demo handlers, explicit denial/failure reasons, and bounded redacted receipts
- Eight unit tests for allowed, denied, unknown, disabled, malformed, and failed routes
- A React + Vite interactive topology explorer with 9 fictional services and a 36-point visual motif
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

The local Vite dev server displays the graphical route console. Use the Granted and Denied quick tests, dispatch a request, and inspect its receipt. GitHub Pages hosting can be configured after reviewing and merging the foundation PR. The Vite base is already configured for the repository path.

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
- [src/demo/fixtures.js](src/demo/fixtures.js): simulated participants and grants
- [src/App.jsx](src/App.jsx): interactive React topology and route console
- [tests/fabric.test.js](tests/fabric.test.js): Node test suite
- [docs/BOUNDARIES.md](docs/BOUNDARIES.md): trust boundaries, threat model starting point and explicit non-goals
- [docs/ROADMAP.md](docs/ROADMAP.md): governed rollout and verification gates

## Principles

1. **Independent sovereignty.** A Kingdom can expose capabilities without ceding ownership or memory.
2. **Permission before crossing.** A discovered route is not an authorized route.
3. **Minimal receipts.** Record decision metadata, not payloads or private exception details.
4. **Adapters are opt-in.** No implicit integration with any neighboring repository.
5. **Evidence before claims.** Treat experiments, demos and verified deployments as different states.

**Build outward. Circle back. Ledger above ego.**
