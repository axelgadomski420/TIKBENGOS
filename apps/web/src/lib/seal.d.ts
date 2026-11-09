export interface SealPrekey {
  id: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  synced: boolean;
  used: boolean;
}

export interface SealIdentity {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  fingerprint: string;
  prekeys: SealPrekey[];
}

export interface SealBox {
  userId: string;
  epk: string;
  iv: string;
  ct: string;
  prekeyId: string;
}

export interface SealEnvelope {
  v: number;
  alg: string;
  fp: string;
  iv: string;
  ct: string;
  own: SealBox;
  boxes: SealBox[];
}

export interface SealPayload {
  type: "text" | "image" | "voice" | "file" | "sign" | "morse";
  body: string;
  morse: string;
  translations: Record<string, string>;
  signGloss: string;
  mime: string;
  name: string;
  data: string;
  expiresAt: string | null;
  transcript: string | null;
}

export function ensureIdentity(): Promise<SealIdentity>;
export function refillPrekeys(record: SealIdentity): Promise<{ record: SealIdentity; upload: { id: string; jwk: JsonWebKey }[] }>;
export function markPrekeysSynced(record: SealIdentity, ids: string[]): SealIdentity;
export function consumeLocalPrekey(record: SealIdentity, id: string): SealIdentity;
export function sealPayload(
  payload: SealPayload,
  recipients: { userId: string; publicJwk: JsonWebKey; prekey: { id: string; jwk: JsonWebKey } | null }[],
  ownPublicJwk: JsonWebKey,
): Promise<SealEnvelope>;
export function openPayload(
  envelope: SealEnvelope,
  record: SealIdentity,
): Promise<{ payload: SealPayload; prekeyId: string }>;
export function safetyNumber(left: string, right: string): Promise<string>;
export function readCached(messageId: string): SealPayload | null;
export function writeCached(messageId: string, payload: SealPayload): void;
