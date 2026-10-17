import React, { useMemo, useRef, useState } from 'react';
import { makeDemoContractGateway, demoEnvelope } from '../demo/contracts-fixtures.js';

function ReceiptLine({ step }) {
  const { label, result } = step;
  return <div className="contract-event">
    <div>
      <span className={'contract-light ' + (result.ok ? 'contract-green' : 'contract-red')}/>
      <strong>{label}</strong>
      <span className="contract-trace">{result.receipt.traceId}</span>
    </div>
    <div className="contract-reason">
      {result.ok ? 'DELIVERED' : 'DENIED'} · {result.receipt.reason}
    </div>
  </div>;
}

export function ContractLab() {
  const gateway = useMemo(() => makeDemoContractGateway(), []);
  const next = useRef(0);
  const [steps, setSteps] = useState([]);
  const [services, setServices] = useState([]);
  const [demoState, setDemoState] = useState('IDLE');

  const envelopeFor = (route) => {
    const serial = ++next.current;
    return demoEnvelope({
      messageId: 'web-demo-' + serial,
      traceId: 'handshake-' + serial,
      now: new Date(),
      ...route
    });
  };

  function runHandshake() {
    const discover = gateway.dispatchEnvelope(envelopeFor({
      from: 'porch', to: 'commons', capability: 'discover',
      payload: { action: 'list-public-services' }
    }));
    const progress = [{ label: 'Porch → Commons · discover', result: discover }];
    if (discover.ok) {
      const servicesFound = discover.response.services;
      setServices(servicesFound);
      const render = gateway.dispatchEnvelope(envelopeFor({
        from: 'commons', to: 'auralith', capability: 'render',
        payload: { scene: 'reference-world' }
      }));
      progress.push({ label: 'Commons → Auralith · render', result: render });
      setDemoState(render.ok ? 'HANDSHAKE COMPLETE' : 'SECOND GRANT DENIED');
    } else {
      setServices([]);
      setDemoState('DISCOVERY DENIED');
    }
    setSteps((existing) => [...progress, ...existing].slice(0, 8));
  }

  function runUnauthorized() {
    const denied = gateway.dispatchEnvelope(envelopeFor({
      from: 'porch', to: 'auralith', capability: 'render',
      payload: { attempt: 'skip-commons-policy' }
    }));
    setSteps((existing) => [
      { label: 'Porch → Auralith · render', result: denied },
      ...existing
    ].slice(0, 8));
    setDemoState(denied.ok ? 'UNEXPECTED GRANT' : 'POLICY PROTECTED');
  }

  return <section className="contract-lab" aria-labelledby="contracts-heading">
    <div className="section-heading">
      <span>04 / INTERCONNECT CONTRACT LAB</span>
      <span className="terminal-status">● V0.2 LOCAL SIM</span>
    </div>
    <div className="contract-heading">
      <div>
        <h2 id="contracts-heading">The handshake protocol</h2>
        <p className="panel-desc">Versioned manifests. Scoped discovery. Independently authorized hops. One minimal receipt per request.</p>
      </div>
      <span className="contract-pill">ii.envelope/1</span>
    </div>
    <div className="contract-chain" aria-label="Simulated Porch to Commons to Auralith handshake">
      <div><span className="contract-node-icon">⌂</span><strong>PORCH</strong><small>Requests directory</small></div>
      <span className="contract-arrow">⟶</span>
      <div><span className="contract-node-icon">◇</span><strong>COMMONS</strong><small>Own routing grant</small></div>
      <span className="contract-arrow">⟶</span>
      <div><span className="contract-node-icon">✧</span><strong>AURALITH</strong><small>Offers render</small></div>
    </div>
    <div className="contract-callout">
      <strong>NO TRANSITIVE AUTHORITY</strong>
      <span>Porch seeing Auralith's public <code>render</code> capability never grants Porch permission to call it. Commons has a separate, explicit grant.</span>
    </div>
    <div className="contract-actions">
      <button type="button" className="dispatch contract-primary" onClick={runHandshake}>RUN 2-STEP HANDSHAKE <span>→</span></button>
      <button type="button" className="contract-deny" onClick={runUnauthorized}>TRY UNAUTHORIZED SHORTCUT ⊘</button>
    </div>
    <div className="contract-results">
      <div>
        <div className="contract-result-title"><span>RECEIPT TRANSCRIPT</span><span aria-live="polite">{demoState}</span></div>
        {steps.length ? <div aria-live="polite" className="contract-events">
          {steps.map((step) => <ReceiptLine key={step.result.receipt.traceId} step={step}/>)}
        </div> : <p className="contract-empty">Run a handshake to generate real simulator receipts.</p>}
      </div>
      <div>
        <div className="contract-result-title"><span>SCOPED DIRECTORY VIEW</span><span>PUBLIC METADATA ONLY</span></div>
        {services.length ? <div className="contract-services">
          {services.map((service) => <div key={service.id}>
            <strong>{service.label}</strong>
            <small>{service.capabilities.map((c) => c.name + ' v' + c.version).join(' · ')}</small>
          </div>)}
        </div> : <p className="contract-empty">Directory not queried yet. Restricted-only capabilities stay hidden.</p>}
      </div>
    </div>
    <p className="ledger-footnote">This is an in-memory contract demonstration. Caller identities are not authenticated; replay tracking is temporary, and no packets reach other apps or devices.</p>
  </section>;
}
