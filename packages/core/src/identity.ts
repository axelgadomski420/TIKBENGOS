// Importy BEZ rozszerzenia `.js`.
//
// To nie styl, a poprawność: webpack w Next.js nie rozwiązuje importu
// `./api.js` wskazującego na plik `api.ts` — szuka dosłownego pliku `.js`
// i przerywa build produkcyjny komunikatem „Module not found”. Zapis bez
// rozszerzenia działa i w webpacku, i w `tsc`.
import type { ApiError } from "./api";

/**
 * Tożsamość — jedno konto dla całego systemu.
 *
 * Ten model zastępuje wszystkie dotychczasowe. Nie ma drugiego modelu
 * użytkownika w żadnym module i nie będzie: moduły różnią się uprawnieniami,
 * a nie kontem.
 */

export const ROLES = ["user", "creator", "moderator", "developer", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  user: "Użytkownik",
  creator: "Twórca",
  moderator: "Moderator",
  developer: "Deweloper",
  admin: "Administrator",
};

/**
 * Uprawnienie sprawdzane po nazwie, nie po roli. Dzięki temu dołożenie roli
 * albo zmiana jej zakresu nie wymaga przeglądania wszystkich miejsc, które
 * pytają „czy to admin”.
 */
export const PERMISSIONS = [
  "post.create",
  "post.delete.any",
  "comment.moderate",
  "user.suspend",
  "music.generate",
  "code.contribute",
  "repo.connect",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ["post.create", "music.generate", "settings.manage"],
  creator: ["post.create", "music.generate", "settings.manage", "repo.connect"],
  moderator: [
    "post.create",
    "post.delete.any",
    "comment.moderate",
    "user.suspend",
    "settings.manage",
  ],
  developer: [
    "post.create",
    "music.generate",
    "code.contribute",
    "repo.connect",
    "settings.manage",
  ],
  admin: PERMISSIONS,
};

/** Sprawdza, czy dowolna z ról użytkownika daje to uprawnienie. */
export function can(user: Pick<Identity, "roles">, permission: Permission): boolean {
  return user.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

/* ─────────────────────────── Zgody ──────────────────────────────── */

/**
 * Zgody są osobne od uprawnień. Rola mówi, co wolno; zgoda mówi, na co
 * użytkownik sam pozwolił. Kamera, mikrofon i GitHub wymagają obu.
 */
export interface Consents {
  camera: boolean;
  microphone: boolean;
  github: boolean;
  pushNotifications: boolean;
  /** Data ostatniej zmiany, ISO 8601. Wymagane przy audycie. */
  updatedAt: string;
}

export const DEFAULT_CONSENTS: Consents = {
  camera: false,
  microphone: false,
  github: false,
  pushNotifications: false,
  updatedAt: new Date(0).toISOString(),
};

export type ConsentKey = Exclude<keyof Consents, "updatedAt">;

/**
 * Kanał percepcji: jak użytkownik odbiera treść.
 * `both` jest domyślne; pozostałe to tryby, które brief nazywa wprost.
 */
export type PerceptionMode = "both" | "audio-only" | "text-only";

export interface Identity {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  roles: Role[];
  consents: Consents;
  perception: PerceptionMode;
  createdAt: string;
}

/** Publiczny profil — to, co widzi ktoś obcy. Nigdy nie zawiera e-maila. */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
}

/* ────────────────────────── Żądania ─────────────────────────────── */

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  /** Opcjonalny drugi składnik; brak = konto bez MFA. */
  totp?: string;
}

export interface SessionResponse {
  identity: Identity;
  /** Token dostępu. W przeglądarce trzymany w ciasteczku HttpOnly. */
  accessToken: string;
  expiresAt: string;
}

export interface UpdateIdentityRequest {
  displayName?: string;
  bio?: string;
  website?: string;
}

export interface UpdateConsentsRequest {
  camera?: boolean;
  microphone?: boolean;
  github?: boolean;
  pushNotifications?: boolean;
}

/* ─────────────────────── Walidacja w interfejsie ─────────────────── */

/**
 * Te same reguły, których pilnuje serwer — powtórzone tu, żeby interfejs mógł
 * powiedzieć o błędzie przed wysłaniem żądania, a nie po.
 */

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function validateUsername(value: string): ApiError | null {
  if (!value) {
    return { code: "bad_request", field: "username", message: "Nazwa użytkownika jest wymagana." };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      code: "bad_request",
      field: "username",
      message: "Nazwa może mieć od 3 do 30 znaków: małe litery, cyfry i podkreślenie.",
    };
  }
  return null;
}

export function validateEmail(value: string): ApiError | null {
  // Świadomie prosto: pełna walidacja adresu należy do serwera, a odrzucenie
  // poprawnego adresu jest gorszym błędem niż przepuszczenie dziwnego.
  if (!value || !value.includes("@") || value.startsWith("@") || value.endsWith("@")) {
    return { code: "bad_request", field: "email", message: "Podaj poprawny adres email." };
  }
  return null;
}

export function validatePassword(value: string): ApiError | null {
  if (value.length < 12) {
    return {
      code: "bad_request",
      field: "password",
      message: "Hasło musi mieć co najmniej 12 znaków.",
    };
  }
  return null;
}
