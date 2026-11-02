/**
 * Feed — krótkie wideo, dźwięki, posty, twórcy.
 *
 * Model danych pochodzi z TIKTAK (Post, Tag, Comment, reposty przez model
 * pośredni, Follow), ale kontrakt jest nowy: kursor zamiast numeru strony
 * i osobny typ na wideo, które ma warianty i napisy.
 */

export type MediaKind = "video" | "audio" | "image";

/**
 * Zasób wideo nie jest jednym plikiem. Jest zestawem wariantów (transkodowanie)
 * i napisów — dlatego ma własny typ, a nie pole `videoUrl` w poście.
 */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  /** Warianty od najniższego do najwyższego. Pusty, dopóki trwa transkodowanie. */
  renditions: Rendition[];
  thumbnailUrl: string | null;
  /** Napisy są generowane automatycznie, ale edytowalne. Dopóki
   * `editedByAuthor` jest fałszem, napisy są sugestią, nie faktem. */
  subtitles: SubtitleTrack | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

export interface Rendition {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrateKbps: number;
}

export interface SubtitleTrack {
  language: string;
  /** Segmenty są rozłączne i uporządkowane po `startSeconds`. */
  segments: SubtitleSegment[];
  editedByAuthor: boolean;
}

export interface SubtitleSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Odpowiednik opisowy dla treści wideo. Wymagany, nie opcjonalny:
 * ekran bez obrazu musi nieść wszystko, co niesie obraz.
 */
export interface AudioDescription {
  language: string;
  text: string;
}

export interface Post {
  id: string;
  authorId: string;
  /** Krótki opis. Limit z modelu źródłowego: 80 znaków. */
  body: string | null;
  media: MediaAsset | null;
  tags: string[];
  audioDescription: AudioDescription | null;
  /** Muzyka przypisana do tego wideo, jeśli jest. */
  trackId: string | null;
  counters: PostCounters;
  /** Jeśli ten wpis jest repostem, `repostedBy` mówi kto go podniósł,
   * a `createdAt` jest czasem repostu, nie publikacji. Feed sortuje po tym. */
  repostedBy: string | null;
  createdAt: string;
}

/**
 * Liczniki są denormalizowane w bazie i aktualizowane atomowo.
 * Kontrakt mówi o nich jako o liczbach, nie o tym, jak je policzyć.
 */
export interface PostCounters {
  likes: number;
  comments: number;
  reposts: number;
  bookmarks: number;
  views: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  /** Dwa poziomy jak w modelu źródłowym: `parentCommentId` to wątek główny,
   * a odpowiedź w nim jest już płaska. Głębsze zagnieżdżenie nie istnieje. */
  parentCommentId: string | null;
  body: string;
  likeCount: number;
  createdAt: string;
}

export type FeedKind = "following" | "for-you" | "explore";

export interface FeedQuery {
  kind: FeedKind;
  cursor?: string;
  limit?: number;
  /** Tylko dla `explore`: filtr po jednym tagu. */
  tag?: string;
}

export interface CreatePostRequest {
  body?: string;
  tags?: string[];
  /** Zasób wrzucony wcześniej osobnym żądaniem. Publikacja nie przyjmuje
   * pliku: najpierw upload do magazynu, potem post odwołuje się do zasobu. */
  mediaAssetId?: string;
  trackId?: string;
  audioDescription?: string;
}

export interface LikeResponse {
  liked: boolean;
  counters: PostCounters;
}
