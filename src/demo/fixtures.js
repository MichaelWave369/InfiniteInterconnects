// Entirely fictional topology for the browser simulator; no live endpoints.
export const DEMO_NODES = Object.freeze([
  { id: 'porch', label: 'Infinite Porch', short: 'PORCH', kind: 'gateway', x: 50, y: 14, capabilities: ['admit'] },
  { id: 'commons', label: 'Infinite Commons', short: 'COMMONS', kind: 'hub', x: 50, y: 40, capabilities: ['discover', 'announce'] },
  { id: 'vessie', label: 'Super Phi Vessel', short: 'VESSIE', kind: 'agent', x: 23, y: 33, capabilities: ['propose'] },
  { id: 'porchtalk', label: 'PorchTalk', short: 'TALK', kind: 'transport', x: 77, y: 33, capabilities: ['relay'] },
  { id: 'anti-m', label: 'Anti-M', short: 'ANTI-M', kind: 'governance', x: 30, y: 59, capabilities: ['verify'] },
  { id: 'ledger', label: 'Evidence Ledger', short: 'LEDGER', kind: 'governance', x: 70, y: 59, capabilities: ['append'] },
  { id: 'auralith', label: 'Auralith Kingdom', short: 'AURALITH', kind: 'kingdom', x: 23, y: 82, capabilities: ['render'] },
  { id: 'domistika', label: 'Domistika Kingdom', short: 'DOMISTIKA', kind: 'kingdom', x: 50, y: 83, capabilities: ['compose'] },
  { id: 'pulse', label: 'Pulse Kingdom', short: 'PULSE', kind: 'kingdom', x: 77, y: 82, capabilities: ['session'] }
]);

export const DEMO_GRANTS = Object.freeze([
  { from: 'porch', to: 'commons', capability: 'discover' },
  { from: 'vessie', to: 'commons', capability: 'discover' },
  { from: 'commons', to: 'vessie', capability: 'propose' },
  { from: 'commons', to: 'porchtalk', capability: 'relay' },
  { from: 'vessie', to: 'anti-m', capability: 'verify' },
  { from: 'anti-m', to: 'ledger', capability: 'append' }
]);

// Graph lines show proposed relationships, not grants; grants are exact and directional.
export const DEMO_LINKS = Object.freeze([
  ['porch', 'commons'],
  ['vessie', 'commons'],
  ['porchtalk', 'commons'],
  ['commons', 'anti-m'],
  ['commons', 'ledger'],
  ['anti-m', 'ledger'],
  ['commons', 'auralith'],
  ['commons', 'domistika'],
  ['commons', 'pulse'],
  ['anti-m', 'auralith'],
  ['ledger', 'pulse']
]);
