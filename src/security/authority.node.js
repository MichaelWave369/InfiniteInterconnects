/**
 * Ed25519 identity + scoped grant research laboratory (Node.js only).
 * This is NOT an authenticated transport, production PKI, secure token service,
 * distributed revocation system or persisted replay-defense mechanism.
 * Never import this Node-only module into the GitHub Pages browser bundle.
 */
import { randomBytes, sign, verify } from 'node:crypto';
import { validateEnvelope } from '../core/contracts.js';

export const GRANT_SCHEMA = 'ii.grant/1';
const ID = /^[a-z][a-z0-9-]{0,47}$/;
const SCOPE = /^[a-z][a-z0-9.-]{0,63}$/;
const GRANT_ID = /^[A-Za-z0-9_-]{16,64}$/;
const B64 = /^[A-Za-z0-9_-]{40,256}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FIELDS = ['schema', 'grantId', 'issuer', 'subject', 'audience',
  'capability', 'scope', 'issuedAt', 'expiresAt'];
const MAX_GRANT_MS = 60 * 60 * 1000;
const isRecord = (v) => v !== null && typeof v === 'object' &&
  !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype ||
    Object.getPrototypeOf(v) === null);
const shape = (v, fields) => isRecord(v) &&
  Object.keys(v).length === fields.length &&
  fields.every((field) => Object.hasOwn(v, field));
const validTime = (v) => typeof v === 'string' && UTC.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const deny = (code) => ({ ok: false, code });
const ok = () => ({ ok: true, code: 'VALID' });

/** Explicit-order encoding with a domain separator; never signs arbitrary JSON order. */
function grantBytes(claims) {
  return Buffer.from('InfiniteInterconnects:grant:v1\n' +
    JSON.stringify(FIELDS.map((field) => claims[field])), 'utf8');
}
function challengeBytes(peerId, nonce) {
  return Buffer.from('InfiniteInterconnects:identity:v1\n' +
    JSON.stringify([peerId, nonce]), 'utf8');
}
function safeText(s) {
  return typeof s === 'string' && ID.test(s) ? s : null;
}
function safeTrace(s) {
  return typeof s === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(s) ? s : null;
}
function decodeSignature(value) {
  if (typeof value !== 'string' || !B64.test(value)) return null;
  try {
    const buf = Buffer.from(value, 'base64url');
    return buf.toString('base64url') === value ? buf : null;
  } catch {
    return null;
  }
}
function checkClaims(c) {
  if (!shape(c, FIELDS)) return deny('INVALID_GRANT_SHAPE');
  if (c.schema !== GRANT_SCHEMA) return deny('UNSUPPORTED_GRANT_SCHEMA');
  if (![c.issuer, c.subject, c.audience, c.capability].every(
    (v) => typeof v === 'string' && ID.test(v)
  ) || typeof c.scope !== 'string' || !SCOPE.test(c.scope) ||
      typeof c.grantId !== 'string' || !GRANT_ID.test(c.grantId)) {
    return deny('INVALID_GRANT_FIELDS');
  }
  if (!validTime(c.issuedAt) || !validTime(c.expiresAt) ||
      Date.parse(c.expiresAt) <= Date.parse(c.issuedAt) ||
      Date.parse(c.expiresAt) - Date.parse(c.issuedAt) > MAX_GRANT_MS) {
    return deny('INVALID_GRANT_TIME');
  }
  return ok();
}

/**
 * Test fixture signer. A caller may only use the real private key in its custody.
 * The issuer name in claims has no force until verified against the trusted key.
 */
export function signCapabilityGrant(claims, privateKey) {
  const check = checkClaims(claims);
  if (!check.ok) throw new TypeError(check.code);
  const signature = sign(null, grantBytes(claims), privateKey).toString('base64url');
  return { claims: { ...claims }, signature };
}

/** Challenge signature proves possession of the configured peer key, locally. */
export function signIdentityChallenge(peerId, nonce, privateKey) {
  if (!ID.test(peerId) || typeof nonce !== 'string' ||
      !GRANT_ID.test(nonce)) throw new TypeError('Invalid challenge');
  return sign(null, challengeBytes(peerId, nonce), privateKey).toString('base64url');
}

export function newGrantId() {
  return randomBytes(16).toString('base64url');
}

/**
 * Trusted key configuration and gateway are supplied by the trusted test host.
 * No untrusted caller can add issuers, peers, scopes, or trusted public keys.
 */
export function createSecurityLab({
  trustedPeers, trustedIssuers, gateway,
  clock = () => new Date().toISOString(),
  challengeTtlMs = 60_000, sessionTtlMs = 120_000,
  receiptLimit = 256, challengeLimit = 128, sessionLimit = 128
} = {}) {
  if (!gateway || typeof gateway.dispatchEnvelope !== 'function' ||
      !Array.isArray(trustedPeers) || !Array.isArray(trustedIssuers) ||
      [challengeTtlMs, sessionTtlMs, receiptLimit, challengeLimit, sessionLimit].some(
        (v) => !Number.isSafeInteger(v) || v < 1
      ) || challengeTtlMs > 300_000 || sessionTtlMs > 300_000) {
    throw new TypeError('Invalid security laboratory configuration');
  }
  function trustedMap(entries) {
    const map = new Map();
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || !ID.test(entry.id) ||
          !entry.publicKey || entry.publicKey.asymmetricKeyType !== 'ed25519' ||
          map.has(entry.id)) throw new TypeError('Invalid trusted key inventory');
      map.set(entry.id, entry.publicKey);
    }
    return map;
  }
  const peers = trustedMap(trustedPeers);
  const issuers = trustedMap(trustedIssuers);
  const challenges = new Map();
  const sessions = new Map();
  const revoked = new Set();
  const receipts = [];
  let nextReceipt = 0;

  function nowMillis() {
    const now = clock();
    if (!validTime(now)) throw new TypeError('Clock must return ISO UTC milliseconds');
    return Date.parse(now);
  }
  function record(code, status, envelope) {
    const entry = Object.freeze({
      localReceiptId: 'sec-' + String(++nextReceipt).padStart(6, '0'),
      timestamp: clock(),
      status, code,
      from: safeText(envelope?.from),
      to: safeText(envelope?.to),
      capability: safeText(envelope?.capability),
      requestTraceId: safeTrace(envelope?.traceId)
      // Never persist payload, key material, grant token, signature, session or nonce.
    });
    receipts.push(entry);
    if (receipts.length > receiptLimit) receipts.shift();
    return { ...entry };
  }
  function pruneExpired(map, time) {
    for (const [id, item] of map) {
      if (time >= item.expiresAt) map.delete(id);
    }
  }
  function boundedSet(map, key, value, max) {
    if (map.size >= max) map.delete(map.keys().next().value);
    map.set(key, value);
  }

  function beginIdentity(peerId) {
    if (typeof peerId !== 'string' || !peers.has(peerId)) {
      return deny('UNKNOWN_PEER');
    }
    const time = nowMillis();
    pruneExpired(challenges, time);
    const nonce = randomBytes(24).toString('base64url');
    boundedSet(challenges, nonce, { peerId, expiresAt: time + challengeTtlMs },
      challengeLimit);
    return { ok: true, peerId, nonce, expiresAt: new Date(time + challengeTtlMs).toISOString() };
  }

  function completeIdentity({ peerId, nonce, signature } = {}) {
    const time = nowMillis();
    const pending = challenges.get(nonce);
    // Consume even on failed signature attempts. Cannot retry a challenge.
    if (pending) challenges.delete(nonce);
    const decoded = decodeSignature(signature);
    if (!pending || pending.peerId !== peerId || time >= pending.expiresAt ||
        !decoded) return deny('INVALID_CHALLENGE');
    let authenticated = false;
    try {
      authenticated = verify(null, challengeBytes(peerId, nonce), peers.get(peerId), decoded);
    } catch {
      authenticated = false;
    }
    if (!authenticated) return deny('IDENTITY_PROOF_FAILED');
    pruneExpired(sessions, time);
    const sessionId = randomBytes(24).toString('base64url');
    boundedSet(sessions, sessionId, { peerId, expiresAt: time + sessionTtlMs },
      sessionLimit);
    return { ok: true, peerId, sessionId, expiresAt: new Date(time + sessionTtlMs).toISOString() };
  }

  function verifyGrant(signedGrant, time) {
    if (!shape(signedGrant, ['claims', 'signature'])) return deny('INVALID_GRANT_SHAPE');
    const claims = signedGrant.claims;
    const fields = checkClaims(claims);
    if (!fields.ok) return fields;
    const publicKey = issuers.get(claims.issuer);
    if (!publicKey) return deny('UNTRUSTED_ISSUER');
    const signature = decodeSignature(signedGrant.signature);
    if (!signature) return deny('INVALID_GRANT_SIGNATURE');
    let verified = false;
    try { verified = verify(null, grantBytes(claims), publicKey, signature); }
    catch { verified = false; }
    if (!verified) return deny('INVALID_GRANT_SIGNATURE');
    if (revoked.has(JSON.stringify([claims.issuer, claims.grantId]))) {
      return deny('GRANT_REVOKED');
    }
    if (time < Date.parse(claims.issuedAt) || time >= Date.parse(claims.expiresAt)) {
      return deny('GRANT_EXPIRED');
    }
    return { ok: true, claims };
  }

  function authorize({ envelope, sessionId, signedGrant, scope } = {}) {
    const time = nowMillis();
    const validEnvelope = validateEnvelope(envelope, { now: new Date(time).toISOString() });
    if (!validEnvelope.ok) return deny(validEnvelope.code);
    const session = typeof sessionId === 'string' ? sessions.get(sessionId) : null;
    if (!session || time >= session.expiresAt) {
      if (session) sessions.delete(sessionId);
      return deny('INVALID_SESSION');
    }
    if (envelope.from !== session.peerId) return deny('IDENTITY_MISMATCH');
    if (typeof scope !== 'string' || !SCOPE.test(scope)) return deny('INVALID_SCOPE');
    const verified = verifyGrant(signedGrant, time);
    if (!verified.ok) return verified;
    const c = verified.claims;
    if (c.subject !== session.peerId || c.audience !== envelope.to ||
        c.capability !== envelope.capability || c.scope !== scope) {
      return deny('GRANT_BINDING_MISMATCH');
    }
    return ok();
  }

  return Object.freeze({
    beginIdentity,
    completeIdentity,
    /**
     * Test gateway: policy AND valid peer proof AND signed grant must all pass.
     * Calls the v0.2 gateway only if the security boundary allows the request.
     */
    dispatchAuthorized(request = {}) {
      const checked = authorize(request);
      if (!checked.ok) {
        return { ok: false, code: checked.code,
          securityReceipt: record(checked.code, 'DENIED', request.envelope) };
      }
      const outcome = gateway.dispatchEnvelope(request.envelope);
      return { ...outcome, securityReceipt: record(
        outcome.ok ? 'AUTHORIZED_AND_DELIVERED' : outcome.receipt?.reason || 'GATEWAY_DENIED',
        outcome.ok ? 'DELIVERED' : 'DENIED', request.envelope
      ) };
    },
    /**
     * Trusted in-process administrator API ONLY, not a public network endpoint.
     * Revocation is temporary, and does not survive restart or synchronize.
     */
    revokeGrant(issuer, grantId) {
      if (!issuers.has(issuer) || typeof grantId !== 'string' || !GRANT_ID.test(grantId)) {
        throw new TypeError('Invalid revocation target');
      }
      revoked.add(JSON.stringify([issuer, grantId]));
      return { ok: true };
    },
    receipts() { return receipts.map((entry) => ({ ...entry })); }
  });
}
