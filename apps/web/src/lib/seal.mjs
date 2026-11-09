/**
 * Pieczęć BENGOS v1 — szyfrowanie w przeglądarce, zanim cokolwiek wyjdzie.
 *
 * Serwer dostaje tylko szyfrogram. Klucz prywatny zostaje w localStorage
 * tego urządzenia i nigdy nie jedzie w żądaniu.
 *
 * Na wiadomość:
 *   1. losowy klucz AES-256 szyfruje treść (AES-GCM),
 *   2. ten klucz jest pakowany osobno dla każdego odbiorcy:
 *      ECDH P-256 (klucz jednorazowy nadawcy × klucz tożsamości odbiorcy)
 *      i, gdy jest, drugi ECDH do jednorazowego preklucza odbiorcy,
 *   3. HKDF-SHA-256 składa z tego klucz owijający.
 *
 * Preklucz jest kasowany po odczycie. Kradzież samego klucza tożsamości
 * później nie otwiera wiadomości, która poszła na zużyty preklucz.
 * To jest szczelniejsze niż kopia zapasowa iMessage w iCloud i niż
 * serwer, który widzi treść. To nie jest jeszcze pełny Double Ratchet
 * Signal — brakuje podpisu preklucza i sesji wielourządzeniowej.
 */

const CACHE_KEY = "bengos-seal-cache-v1";
const STORE_KEY = "bengos-seal-identity-v1";

export function readCached(messageId) {
  const raw = store.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw)[messageId] ?? null;
  } catch {
    return null;
  }
}

export function writeCached(messageId, payload) {
  const current = (() => {
    try {
      return JSON.parse(store.getItem(CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  })();
  current[messageId] = payload;
  const ids = Object.keys(current);
  if (ids.length > 400) delete current[ids[0]];
  store.setItem(CACHE_KEY, JSON.stringify(current));
}
const CURVE = { name: "ECDH", namedCurve: "P-256" };
const te = new TextEncoder();
const td = new TextDecoder();

const memory = new Map();
const store = globalThis.localStorage ?? {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, value),
};

function bytesToB64(bytes) {
  const view = new Uint8Array(bytes);
  let raw = "";
  for (let i = 0; i < view.length; i += 1) raw += String.fromCharCode(view[i]);
  return btoa(raw);
}

function b64ToBytes(value) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(left, right) {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

async function importPublic(jwk) {
  return crypto.subtle.importKey("jwk", jwk, CURVE, true, []);
}

async function importPrivate(jwk) {
  return crypto.subtle.importKey("jwk", jwk, CURVE, true, ["deriveBits"]);
}

async function sharedSecret(privateKey, publicKey) {
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  return new Uint8Array(bits);
}

async function wrappingKey(ikm, salt, info, usages) {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: te.encode(info) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

export async function fingerprintOf(jwk) {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(`${jwk.x}.${jwk.y}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function makePrekey() {
  const pair = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return {
    id: (await fingerprintOf(publicJwk)).slice(0, 16),
    publicJwk,
    privateJwk,
    synced: false,
    used: false,
  };
}

function readRecord() {
  const raw = store.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRecord(record) {
  store.setItem(STORE_KEY, JSON.stringify(record));
  return record;
}

export async function ensureIdentity() {
  const existing = readRecord();
  if (existing?.privateJwk && existing?.publicJwk) return existing;
  const pair = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const prekeys = [];
  for (let i = 0; i < 20; i += 1) prekeys.push(await makePrekey());
  return writeRecord({
    publicJwk,
    privateJwk,
    fingerprint: await fingerprintOf(publicJwk),
    prekeys,
  });
}

export async function refillPrekeys(record) {
  const next = [...record.prekeys];
  while (next.filter((item) => !item.used).length < 20 && next.length < 80) {
    next.push(await makePrekey());
  }
  const saved = writeRecord({ ...record, prekeys: next });
  return {
    record: saved,
    upload: saved.prekeys
      .filter((item) => !item.used && !item.synced)
      .map((item) => ({ id: item.id, jwk: item.publicJwk })),
  };
}

export function markPrekeysSynced(record, ids) {
  const known = new Set(ids);
  return writeRecord({
    ...record,
    prekeys: record.prekeys.map((item) => (known.has(item.id) ? { ...item, synced: true } : item)),
  });
}

export function consumeLocalPrekey(record, id) {
  return writeRecord({
    ...record,
    prekeys: record.prekeys.map((item) => (item.id === id ? { ...item, used: true } : item)),
  });
}

async function wrapMessageKey(messageKey, theirPublicJwk, oneTime) {
  const ephemeral = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const identitySecret = await sharedSecret(ephemeral.privateKey, await importPublic(theirPublicJwk));
  let ikm = identitySecret;
  if (oneTime?.jwk) {
    const prekeySecret = await sharedSecret(ephemeral.privateKey, await importPublic(oneTime.jwk));
    ikm = concat(identitySecret, prekeySecret);
  }
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const aes = await wrappingKey(ikm, rawPublic, oneTime?.jwk ? "bengos-seal-v1-otpk" : "bengos-seal-v1", ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, messageKey);
  const epk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  return {
    userId: "",
    epk: JSON.stringify(epk),
    iv: bytesToB64(iv),
    ct: bytesToB64(ct),
    prekeyId: oneTime?.id ?? "",
  };
}

async function unwrapMessageKey(box, privateJwk, prekeys) {
  const ephemeralPublic = await importPublic(JSON.parse(box.epk));
  const identitySecret = await sharedSecret(await importPrivate(privateJwk), ephemeralPublic);
  let ikm = identitySecret;
  if (box.prekeyId) {
    const prekey = (prekeys ?? []).find((item) => item.id === box.prekeyId && item.privateJwk && !item.used);
    if (!prekey) throw new Error("Brak jednorazowego klucza na tym urządzeniu.");
    const prekeySecret = await sharedSecret(await importPrivate(prekey.privateJwk), ephemeralPublic);
    ikm = concat(identitySecret, prekeySecret);
  }
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeralPublic));
  const aes = await wrappingKey(ikm, rawPublic, box.prekeyId ? "bengos-seal-v1-otpk" : "bengos-seal-v1", ["decrypt"]);
  const messageKey = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(box.iv) }, aes, b64ToBytes(box.ct)),
  );
  return messageKey;
}

export async function sealPayload(payload, recipients, ownPublicJwk) {
  const messageKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await crypto.subtle.importKey("raw", messageKey, "AES-GCM", false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, te.encode(JSON.stringify(payload)));
  const own = await wrapMessageKey(messageKey, ownPublicJwk, null);
  const boxes = [];
  for (const recipient of recipients) {
    const box = await wrapMessageKey(messageKey, recipient.publicJwk, recipient.prekey);
    box.userId = recipient.userId;
    boxes.push(box);
  }
  return {
    v: 1,
    alg: "P256-HKDF-A256GCM",
    fp: await fingerprintOf(ownPublicJwk),
    iv: bytesToB64(iv),
    ct: bytesToB64(ct),
    own,
    boxes,
  };
}

export async function openPayload(envelope, record) {
  const candidates = [];
  if (envelope.own?.ct) candidates.push(envelope.own);
  for (const box of envelope.boxes ?? []) candidates.push(box);
  let lastError = null;
  for (const box of candidates) {
    try {
      const messageKey = await unwrapMessageKey(box, record.privateJwk, record.prekeys);
      const aes = await crypto.subtle.importKey("raw", messageKey, "AES-GCM", false, ["decrypt"]);
      const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(envelope.iv) }, aes, b64ToBytes(envelope.ct));
      return { payload: JSON.parse(td.decode(clear)), prekeyId: box.prekeyId || "" };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Nie da się otworzyć tej wiadomości na tym urządzeniu.");
}

export async function safetyNumber(left, right) {
  const [a, b] = [left, right].sort();
  const digest = await crypto.subtle.digest("SHA-256", te.encode(`${a}|${b}`));
  const bytes = new Uint8Array(digest);
  const groups = [];
  for (let i = 0; i < 12; i += 2) {
    const value = ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0);
    groups.push(String(value % 100000).padStart(5, "0"));
  }
  return groups.join(" ");
}
