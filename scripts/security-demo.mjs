/**
 * Safe Node CLI: ephemeral in-memory Ed25519 proof of the v0.3 gates.
 * Never outputs private keys, session handles, tokens, signatures or payloads.
 */
import { generateKeyPairSync } from 'node:crypto';
import { makeDemoContractGateway, demoEnvelope } from '../src/demo/contracts-fixtures.js';
import { createSecurityLab, newGrantId, signCapabilityGrant,
  signIdentityChallenge, GRANT_SCHEMA } from '../src/security/authority.node.js';

const porch = generateKeyPairSync('ed25519');
const issuer = generateKeyPairSync('ed25519');
const clock = () => new Date().toISOString();
const gateway = makeDemoContractGateway(clock);
const security = createSecurityLab({
  gateway, clock,
  trustedPeers: [{ id: 'porch', publicKey: porch.publicKey }],
  trustedIssuers: [{ id: 'authority', publicKey: issuer.publicKey }]
});
const challenge = security.beginIdentity('porch');
const session = security.completeIdentity({
  peerId: 'porch', nonce: challenge.nonce,
  signature: signIdentityChallenge('porch', challenge.nonce, porch.privateKey)
});
if (!session.ok) throw Error('Local identity challenge failed');

const start = Date.now();
const grant = signCapabilityGrant({
  schema: GRANT_SCHEMA, grantId: newGrantId(), issuer: 'authority',
  subject: 'porch', audience: 'commons', capability: 'discover',
  scope: 'directory.read', issuedAt: new Date(start).toISOString(),
  expiresAt: new Date(start + 60_000).toISOString()
}, issuer.privateKey);

function request(messageId) {
  return {
    envelope: demoEnvelope({ messageId, traceId: messageId, from: 'porch',
      to: 'commons', capability: 'discover', now: clock(), payload: {} }),
    scope: 'directory.read', sessionId: session.sessionId, signedGrant: grant
  };
}
const accepted = security.dispatchAuthorized(request('sample-authorized'));
const invalid = security.dispatchAuthorized({
  ...request('sample-invalid'),
  sessionId: 'unverified',
});
security.revokeGrant('authority', grant.claims.grantId);
const revoked = security.dispatchAuthorized(request('sample-revoked'));

for (const [label, actual, expected] of [
  ['signed + authenticated path', accepted.ok, true],
  ['without authenticated session', invalid.code, 'INVALID_SESSION'],
  ['after local revocation', revoked.code, 'GRANT_REVOKED']
]) {
  const result = actual === expected ? 'PASS' : 'FAIL';
  console.log(result + ': ' + label);
  if (result === 'FAIL') process.exitCode = 1;
}
console.log('Node-only security proof complete. No persistent identity, transport or live integration.');
