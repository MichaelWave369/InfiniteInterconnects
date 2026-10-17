import React from 'react';
import './trust-gates.css';

/**
 * Read-only explainer. The actual Ed25519 lab runs in Node.js tests/CLI,
 * not this public browser, and never handles keys or sessions here.
 */
export function TrustGates() {
  const gates = [
    { n: '01', label: 'IDENTITY', detail: 'Prove possession of a pre-trusted Ed25519 peer key using a single-use challenge.' },
    { n: '02', label: 'GRANT', detail: 'Verify issuer signature, subject, audience, capability, scope, and expiry.' },
    { n: '03', label: 'POLICY', detail: 'Enforce the original default-deny fabric route. No inherited or transitive permission.' },
    { n: '04', label: 'RECEIPT', detail: 'Record a minimal allowed/denied decision without exposing keys or payloads.' }
  ];
  return <section className="security-lab" aria-labelledby="security-title">
    <div className="section-heading">
      <span>05 / IDENTITY & CAPABILITY BOUNDARIES</span>
      <span className="security-tag">NODE-ONLY TEST LAB</span>
    </div>
    <div className="security-head">
      <div>
        <h2 id="security-title">Trust has to be proven.</h2>
        <p className="panel-desc">A separate cryptographic proof-of-contract verifies identity and explicit authority before entering the existing route policy.</p>
      </div>
      <span className="security-version">ii.grant/1</span>
    </div>
    <div className="security-gates">
      {gates.map((gate) => <div key={gate.n} className="security-gate">
        <span className="security-num">{gate.n}</span>
        <strong>{gate.label}</strong>
        <p>{gate.detail}</p>
      </div>)}
    </div>
    <div className="security-boundary">
      <strong>IMPORTANT BOUNDARY</strong>
      <span>These cryptographic checks run in offline Node.js tests. The public Pages demo still uses fictional services and never handles private keys, live identities, or authenticated network traffic.</span>
    </div>
    <p className="security-link"><a href="https://github.com/MichaelWave369/InfiniteInterconnects/blob/main/docs/SECURITY.md" rel="noreferrer" target="_blank">Read security contracts, assumptions and remaining production gates ↗</a></p>
  </section>;
}
