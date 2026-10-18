import React, { useMemo, useState } from 'react';
import { createFabric } from './core/fabric.js';
import { DEMO_NODES, DEMO_GRANTS, DEMO_LINKS } from './demo/fixtures.js';
import { ContractLab } from './components/ContractLab.jsx';
import { TrustGates } from './components/TrustGates.jsx';

const byId = Object.fromEntries(DEMO_NODES.map((node) => [node.id, node]));
const statusLabel = {
  DELIVERED: 'Delivered',
  DENIED: 'Denied by policy',
  FAILED: 'Handler failed'
};
function makeDemoFabric() {
  const fabric = createFabric({ nodes: DEMO_NODES, grants: DEMO_GRANTS });
  for (const node of DEMO_NODES) {
    for (const capability of node.capabilities) {
      fabric.registerHandler(node.id, capability, ({ traceId }) => ({
        acknowledgement: traceId, handledBy: node.id, capability,
        simulation: true
      }));
    }
  }
  return fabric;
}

function NetworkView({ selected, onSelect, lastRoute }) {
  const dots = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * Math.PI * 2 / 36) - Math.PI / 2;
    return { x: 50 + Math.cos(angle) * 46, y: 50 + Math.sin(angle) * 46 };
  });

  return <div className="graph-container">
    <div className="graph-title">
      <span><span className="live-dot" /> TOPOLOGY REFERENCE / 36 CHANNELS</span>
      <span>9 NODES · 11 LINKS</span>
    </div>
    <svg className="network-map" viewBox="0 0 100 100" role="group" aria-label="Interactive reference topology. Select a node to address it.">
      <defs>
        <radialGradient id="halo"><stop stopColor="#8160ed" stopOpacity=".26"/><stop offset="1" stopColor="#8160ed" stopOpacity="0"/></radialGradient>
        <linearGradient id="link" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#39c9e8"/><stop offset="1" stopColor="#a88cff"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="49" r="38" fill="url(#halo)" />
      {[20, 34, 45].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#405477" strokeWidth=".13" strokeDasharray=".4 1.2" opacity=".75" />)}
      {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r=".33" fill="#a592f8" opacity={i % 3 === 0 ? '.9' : '.35'}/>)}
      {DEMO_LINKS.map(([a, b]) => {
        const first = byId[a], second = byId[b];
        const active = lastRoute && ((lastRoute.from === a && lastRoute.to === b) || (lastRoute.from === b && lastRoute.to === a));
        return <line key={a + b} x1={first.x} y1={first.y} x2={second.x} y2={second.y}
          stroke={active ? (lastRoute.ok ? '#55e3be' : '#ff9caa') : 'url(#link)'}
          strokeWidth={active ? '.7' : '.25'} strokeOpacity={active ? 1 : .47}
          strokeDasharray={active && !lastRoute.ok ? '1 1' : undefined}/>;
      })}
      {DEMO_NODES.map((node) => <g key={node.id} role="button" tabIndex={0}
        aria-label={'Select ' + node.label} className={'node ' + (node.id === selected ? 'node-selected' : '')}
        onClick={() => onSelect(node.id)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } }}>
        <circle cx={node.x} cy={node.y} r={node.kind === 'hub' ? 6.6 : 4.9} className="node-glow" />
        <circle cx={node.x} cy={node.y} r={node.kind === 'hub' ? 5.8 : 4.2} className="node-ring" />
        <circle cx={node.x} cy={node.y} r={node.kind === 'hub' ? 4.4 : 3} className={'node-core node-' + node.kind} />
        <text x={node.x} y={node.y + .7} fontSize={node.short.length > 7 ? '1.35' : '1.7'} textAnchor="middle" className="node-name">{node.short}</text>
        <text x={node.x} y={node.y + (node.kind === 'hub' ? 8.3 : 6.6)} textAnchor="middle" fontSize="1.55" className="node-kind">{node.kind.toUpperCase()}</text>
      </g>)}
    </svg>
    <div className="graph-footer"><span>● Reference topology, not physical anatomy</span><span>◇ Click a node to target it</span></div>
  </div>;
}

export function App() {
  const fabric = useMemo(makeDemoFabric, []);
  const [source, setSource] = useState('vessie');
  const [target, setTarget] = useState('commons');
  const [capability, setCapability] = useState('discover');
  const [events, setEvents] = useState([]);
  const [lastRoute, setLastRoute] = useState(null);
  const [tab, setTab] = useState('ledger');
  const targetNode = byId[target];

  function chooseTarget(id) {
    setTarget(id);
    setCapability(byId[id].capabilities[0]);
  }

  function runRoute(event) {
    event.preventDefault();
    const result = fabric.dispatch({ from: source, to: target, capability, payload: { demo: true } });
    setEvents((prior) => [result.receipt, ...prior].slice(0, 12));
    setLastRoute({ from: source, to: target, ok: result.ok });
    setTab('ledger');
  }

  return <div className="site-shell">
    <div className="site-grid" aria-hidden="true"/>
    <header className="top-bar">
      <a className="brand" href="#top"><span className="brand-glyph">∞</span><span>INFINITE<span className="brand-light">INTERCONNECTS</span></span></a>
      <div className="top-right"><span className="version">PROTOCOL / V0.3</span><a href="https://github.com/MichaelWave369/InfiniteInterconnects" target="_blank" rel="noreferrer" className="github-link">GITHUB ↗</a></div>
    </header>

    <main id="top">
      <div className="eyebrow"><span className="eyebrow-bar"/> THE LAYER BETWEEN WORLDS <span className="eyebrow-bar"/></div>
      <h1>Everything connects.<br/><em>Nothing crosses uninvited.</em></h1>
      <p className="lede">A permission-first communication fabric for the Infinite Porch, Infinite Commons, and Infinite Kingdoms. Explore the architecture. Test a route. Inspect the evidence.</p>
      <div className="trust-banner"><strong>SIMULATION ONLY</strong> · Local, in-memory demo with fictional identities and grants. No live integrations, encryption, authentication or production security.</div>

      <section className="stats" aria-label="Demo network statistics">
        <div><span className="stat-value">09</span><span className="stat-label">REGISTERED NODES</span></div>
        <div><span className="stat-value">36</span><span className="stat-label">REFERENCE CHANNELS</span></div>
        <div><span className="stat-value">{String(DEMO_GRANTS.length).padStart(2, '0')}</span><span className="stat-label">EXPLICIT GRANTS</span></div>
        <div><span className="stat-value">{String(events.length).padStart(2, '0')}</span><span className="stat-label">RECENT RECEIPTS</span></div>
      </section>

      <div className="workspace">
        <NetworkView selected={target} onSelect={chooseTarget} lastRoute={lastRoute}/>
        <div className="side-panel">
          <div className="section-heading"><span>01 / ROUTE CONSOLE</span><span className="terminal-status">● LOCAL SIM</span></div>
          <h2>Request a crossing</h2>
          <p className="panel-desc">Choose a sender, target and capability. Delivery only occurs when an exact grant exists.</p>
          <form onSubmit={runRoute} className="route-form">
            <label htmlFor="source">SOURCE IDENTITY</label>
            <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
              {DEMO_NODES.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
            <div className="down-arrow">↓ &nbsp; PERMISSION GATE &nbsp; ↓</div>
            <label htmlFor="target">DESTINATION</label>
            <select id="target" value={target} onChange={(e) => chooseTarget(e.target.value)}>
              {DEMO_NODES.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
            <label htmlFor="capability">REQUESTED CAPABILITY</label>
            <select id="capability" value={capability} onChange={(e) => setCapability(e.target.value)}>
              {targetNode.capabilities.map((cap) => <option key={cap} value={cap}>{cap}</option>)}
            </select>
            <div className="policy-insight"><span>POLICY PREVIEW</span><strong className={fabric.inspect({ from: source, to: target, capability }) === 'ALLOWED' ? 'allowed' : 'denied'}>
              {fabric.inspect({ from: source, to: target, capability }) === 'ALLOWED' ? 'GRANTED' : 'DENIED'}
            </strong></div>
            <button className="dispatch" type="submit">DISPATCH REQUEST <span>→</span></button>
          </form>
          <div className="quick-tests">
            <span>QUICK TESTS</span>
            <button type="button" onClick={() => { setSource('vessie'); chooseTarget('commons'); }}>✓ Granted path</button>
            <button type="button" onClick={() => { setSource('vessie'); chooseTarget('auralith'); }}>⊘ Denied path</button>
          </div>
        </div>
      </div>

      <section className="evidence">
        <div className="evidence-tabs">
          <button type="button" className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>02 / RECEIPT LEDGER</button>
          <button type="button" className={tab === 'grants' ? 'active' : ''} onClick={() => setTab('grants')}>03 / POLICY GRANTS</button>
        </div>
        {tab === 'ledger' ? <div className="evidence-content">
          {events.length === 0 ? <p className="empty-ledger">No crossings recorded yet. Dispatch a route to generate a receipt.</p> :
            <div className="table-wrap"><table><thead><tr><th>TRACE</th><th>FROM → TO</th><th>CAPABILITY</th><th>DECISION</th><th>REASON</th></tr></thead>
              <tbody>{events.map((entry) => <tr key={entry.traceId}><td className="mono">{entry.traceId}</td><td>{entry.from} → {entry.to}</td><td>{entry.capability}</td><td><span className={'status status-' + entry.status.toLowerCase()}>{statusLabel[entry.status]}</span></td><td className="mono">{entry.reason}</td></tr>)}</tbody></table></div>}
          <p className="ledger-footnote">Payloads, responses and exception details are deliberately absent from receipts. This is not a durable audit ledger.</p>
        </div> : <div className="evidence-content"><div className="table-wrap"><table><thead><tr><th>GRANTED SOURCE</th><th>DESTINATION</th><th>CAPABILITY</th></tr></thead><tbody>
          {fabric.grants().map((grant) => <tr key={grant.from + grant.to + grant.capability}><td>{grant.from}</td><td>{grant.to}</td><td>{grant.capability}</td></tr>)}
        </tbody></table></div><p className="ledger-footnote">Grants are configured by the simulator. There is no self-service grant escalation.</p></div>}
      </section>
      <ContractLab />
      <TrustGates />
      <section className="principles"><div><span>01</span><h3>DISCOVER</h3><p>Services can declare their capabilities without automatically authorizing their use.</p></div><div><span>02</span><h3>AUTHORIZE</h3><p>Each crossing requires an exact directional source, destination and capability grant.</p></div><div><span>03</span><h3>RECEIPT</h3><p>Every attempt leaves a minimal decision record without exposing message content.</p></div></section>
      <footer><span>INFINITE INTERCONNECTS · REFERENCE FABRIC 0.3</span><span>BUILD OUTWARD · CIRCLE BACK · LEDGER ABOVE EGO</span></footer>
    </main>
  </div>;
}
