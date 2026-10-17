import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { makeDemoContractGateway, demoEnvelope } from '../src/demo/contracts-fixtures.js';
import { createSecurityLab, signIdentityChallenge, signCapabilityGrant,
  newGrantId, GRANT_SCHEMA } from '../src/security/authority.node.js';

const T0 = Date.parse('2026-10-17T20:00:00.000Z');
function setup() {
  const porch = generateKeyPairSync('ed25519');
  const commons = generateKeyPairSync('ed25519');
  const issuer = generateKeyPairSync('ed25519');
  const attacker = generateKeyPairSync('ed25519');
  let tick = T0;
  const clock = () => new Date(tick).toISOString();
  const gateway = makeDemoContractGateway(clock);
  const security = createSecurityLab({
    gateway, clock,
    trustedPeers: [
      { id: 'porch', publicKey: porch.publicKey },
      { id: 'commons', publicKey: commons.publicKey }
    ],
    trustedIssuers: [{ id: 'authority', publicKey: issuer.publicKey }]
  });
  function login(peerId = 'porch', pair = porch) {
    const challenge = security.beginIdentity(peerId);
    assert.equal(challenge.ok, true);
    return security.completeIdentity({
      peerId, nonce: challenge.nonce,
      signature: signIdentityChallenge(peerId, challenge.nonce, pair.privateKey)
    });
  }
  function claims(overrides = {}) {
    return {
      schema: GRANT_SCHEMA, grantId: newGrantId(),
      issuer: 'authority', subject: 'porch', audience: 'commons',
      capability: 'discover', scope: 'directory.read',
      issuedAt: new Date(tick).toISOString(),
      expiresAt: new Date(tick + 60_000).toISOString(),
      ...overrides
    };
  }
  function mint(overrides = {}, key = issuer.privateKey) {
    return signCapabilityGrant(claims(overrides), key);
  }
  function request(overrides = {}) {
    return demoEnvelope({
      messageId: 'request-001', traceId: 'trace-001',
      from: 'porch', to: 'commons', capability: 'discover',
      payload: { secret: 'NEVER_RECORD_THIS' },
      now: clock(), ...overrides
    });
  }
  return {
    security, gateway, issuer, porch, commons, attacker,
    login, mint, claims, request, clock, advance(ms) { tick += ms; }
  };
}

test('valid Ed25519 challenge binds an identity and allows a signed, scoped grant', () => {
  const s = setup();
  const session = s.login();
  assert.equal(session.ok, true);
  const out = s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: s.mint(), scope: 'directory.read'
  });
  assert.equal(out.ok, true);
  assert.ok(out.response.services.some((p) => p.id === 'auralith'));
  assert.equal(out.securityReceipt.status, 'DELIVERED');
  assert.equal(s.gateway.receipts().length, 1);
});

test('a signed grant alone cannot authenticate a caller', () => {
  const s = setup();
  const out = s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: 'caller-assertion',
    signedGrant: s.mint(), scope: 'directory.read'
  });
  assert.equal(out.code, 'INVALID_SESSION');
  assert.equal(s.gateway.receipts().length, 0);
});

test('wrong Ed25519 private key fails and one-time challenge cannot be retried', () => {
  const s = setup();
  const started = s.security.beginIdentity('porch');
  const invalid = s.security.completeIdentity({
    peerId: 'porch', nonce: started.nonce,
    signature: signIdentityChallenge('porch', started.nonce, s.attacker.privateKey)
  });
  assert.equal(invalid.code, 'IDENTITY_PROOF_FAILED');
  const retry = s.security.completeIdentity({
    peerId: 'porch', nonce: started.nonce,
    signature: signIdentityChallenge('porch', started.nonce, s.porch.privateKey)
  });
  assert.equal(retry.code, 'INVALID_CHALLENGE');
});

test('claiming a peer identity in an envelope does not impersonate a logged-in peer', () => {
  const s = setup();
  const loggedIn = s.login();
  const out = s.security.dispatchAuthorized({
    envelope: s.request({ from: 'commons' }),
    sessionId: loggedIn.sessionId, signedGrant: s.mint(),
    scope: 'directory.read'
  });
  assert.equal(out.code, 'IDENTITY_MISMATCH');
  assert.equal(s.gateway.receipts().length, 0);
});

test('tinkering with signed grant scope or audience invalidates signature', () => {
  const s = setup();
  const session = s.login();
  for (const [field, replacement] of [['scope', 'admin'], ['audience', 'auralith'],
    ['subject', 'commons'], ['capability', 'announce']]) {
    const token = s.mint();
    token.claims[field] = replacement;
    const out = s.security.dispatchAuthorized({
      envelope: s.request({ messageId: 'tamper-' + field }),
      sessionId: session.sessionId, signedGrant: token, scope: 'directory.read'
    });
    assert.equal(out.code, 'INVALID_GRANT_SIGNATURE');
  }
  assert.equal(s.gateway.receipts().length, 0);
});

test('a validly signed grant cannot authorize a different scope or route', () => {
  const s = setup();
  const session = s.login();
  const signedGrant = s.mint();
  const wrongScope = s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant, scope: 'directory.write'
  });
  assert.equal(wrongScope.code, 'GRANT_BINDING_MISMATCH');
  const wrongAudience = s.security.dispatchAuthorized({
    envelope: s.request({ to: 'auralith', capability: 'render' }),
    sessionId: session.sessionId, signedGrant, scope: 'directory.read'
  });
  assert.equal(wrongAudience.code, 'GRANT_BINDING_MISMATCH');
  assert.equal(s.gateway.receipts().length, 0);
});

test('a forged key cannot impersonate a trusted issuer, even with matching issuer text', () => {
  const s = setup();
  const session = s.login();
  const out = s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: s.mint({}, s.attacker.privateKey), scope: 'directory.read'
  });
  assert.equal(out.code, 'INVALID_GRANT_SIGNATURE');
  const untrusted = s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: s.mint({ issuer: 'stranger' }), scope: 'directory.read'
  });
  assert.equal(untrusted.code, 'UNTRUSTED_ISSUER');
});

test('malformed grant and modified signature are rejected', () => {
  const s = setup();
  const session = s.login();
  const grant = s.mint();
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: { ...grant, extra: true }, scope: 'directory.read'
  }).code, 'INVALID_GRANT_SHAPE');
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: { ...grant, signature: '$$invalid$$' }, scope: 'directory.read'
  }).code, 'INVALID_GRANT_SIGNATURE');
  assert.throws(() => signCapabilityGrant({ ...s.claims(), scope: '' },
    s.issuer.privateKey), /INVALID_GRANT_FIELDS/);
});

test('expired challenge, peer session, and grant each fail closed', () => {
  const s = setup();
  const issued = s.security.beginIdentity('porch');
  s.advance(60_001);
  assert.equal(s.security.completeIdentity({
    peerId: 'porch', nonce: issued.nonce,
    signature: signIdentityChallenge('porch', issued.nonce, s.porch.privateKey)
  }).code, 'INVALID_CHALLENGE');
  const session = s.login();
  const grant = s.mint();
  s.advance(60_001);
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request(), sessionId: session.sessionId,
    signedGrant: grant, scope: 'directory.read'
  }).code, 'GRANT_EXPIRED');
  s.advance(60_000);
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request({ messageId: 'new-msg' }), sessionId: session.sessionId,
    signedGrant: s.mint(), scope: 'directory.read'
  }).code, 'INVALID_SESSION');
});

test('revoking a grant blocks later calls even while its signature remains valid', () => {
  const s = setup();
  const session = s.login();
  const signedGrant = s.mint();
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request(), signedGrant,
    sessionId: session.sessionId, scope: 'directory.read'
  }).ok, true);
  assert.equal(s.security.revokeGrant(signedGrant.claims.issuer,
    signedGrant.claims.grantId).ok, true);
  assert.equal(s.security.dispatchAuthorized({
    envelope: s.request({ messageId: 'new-message' }),
    signedGrant, sessionId: session.sessionId, scope: 'directory.read'
  }).code, 'GRANT_REVOKED');
  assert.equal(s.gateway.receipts().length, 1);
});

test('gateway replay defense remains in force after crypto authorization', () => {
  const s = setup();
  const session = s.login(), signedGrant = s.mint(), envelope = s.request();
  const makeCall = () => s.security.dispatchAuthorized({
    envelope, signedGrant, sessionId: session.sessionId, scope: 'directory.read'
  });
  assert.equal(makeCall().ok, true);
  const repeat = makeCall();
  assert.equal(repeat.ok, false);
  assert.equal(repeat.receipt.reason, 'REPLAY_DETECTED');
  assert.equal(repeat.securityReceipt.status, 'DENIED');
});

test('cryptographic approval cannot override the old default-deny gateway policy', () => {
  const s = setup();
  const session = s.login();
  const grant = s.mint({
    audience: 'auralith', capability: 'render', scope: 'scene.preview'
  });
  const out = s.security.dispatchAuthorized({
    envelope: s.request({ to: 'auralith', capability: 'render' }),
    signedGrant: grant, sessionId: session.sessionId, scope: 'scene.preview'
  });
  assert.equal(out.ok, false);
  assert.equal(out.receipt.reason, 'NOT_GRANTED');
  assert.equal(out.securityReceipt.code, 'NOT_GRANTED');
});

test('security receipts never store payloads, signatures, session handles, or private details', () => {
  const s = setup();
  const session = s.login(), signedGrant = s.mint();
  s.security.dispatchAuthorized({
    envelope: s.request(), signedGrant, sessionId: session.sessionId,
    scope: 'directory.read'
  });
  s.security.dispatchAuthorized({
    envelope: s.request({ messageId: 'denied-1' }),
    signedGrant, sessionId: 'bad-handle', scope: 'directory.read'
  });
  const serialized = JSON.stringify(s.security.receipts());
  assert.equal(s.security.receipts().length, 2);
  assert.ok(!serialized.includes('NEVER_RECORD_THIS'));
  assert.ok(!serialized.includes(signedGrant.signature));
  assert.ok(!serialized.includes(session.sessionId));
  assert.ok(!serialized.includes(signedGrant.claims.grantId));
  const receipts = s.security.receipts();
  receipts[0].code = 'ALTERED';
  assert.equal(s.security.receipts()[0].code, 'AUTHORIZED_AND_DELIVERED');
});

test('trust configuration rejects non-Ed25519 keys and duplicate identities', () => {
  const s = setup();
  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => createSecurityLab({
    gateway: s.gateway,
    trustedPeers: [{ id: 'porch', publicKey: rsa.publicKey }],
    trustedIssuers: []
  }), /Invalid trusted/);
  assert.throws(() => createSecurityLab({
    gateway: s.gateway,
    trustedPeers: [
      { id: 'porch', publicKey: s.porch.publicKey },
      { id: 'porch', publicKey: s.porch.publicKey }
    ],
    trustedIssuers: []
  }), /Invalid trusted/);
});

test('Commons has an independent login and grant, never an inherited Porch privilege', () => {
  const s = setup();
  const session = s.login('commons', s.commons);
  const signedGrant = s.mint({
    subject: 'commons', audience: 'auralith', capability: 'render', scope: 'scene.preview'
  });
  const out = s.security.dispatchAuthorized({
    envelope: s.request({
      messageId: 'commons-render', from: 'commons',
      to: 'auralith', capability: 'render'
    }),
    signedGrant, sessionId: session.sessionId, scope: 'scene.preview'
  });
  assert.equal(out.ok, true);
  assert.equal(out.response.rendered, true);
});

test('randomized grant IDs, short-lived session handles, and challenge nonces are distinct', () => {
  const s = setup();
  assert.notEqual(newGrantId(), newGrantId());
  const a = s.security.beginIdentity('porch');
  const b = s.security.beginIdentity('porch');
  assert.notEqual(a.nonce, b.nonce);
  const sa = s.security.completeIdentity({
    peerId: 'porch', nonce: a.nonce,
    signature: signIdentityChallenge('porch', a.nonce, s.porch.privateKey)
  });
  const sb = s.security.completeIdentity({
    peerId: 'porch', nonce: b.nonce,
    signature: signIdentityChallenge('porch', b.nonce, s.porch.privateKey)
  });
  assert.equal(sa.ok, true);
  assert.equal(sb.ok, true);
  assert.notEqual(sa.sessionId, sb.sessionId);
});
