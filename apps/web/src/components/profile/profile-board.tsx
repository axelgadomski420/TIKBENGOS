"use client";

import { useEffect, useState } from "react";

import type { Post } from "@bengos/core";

import { ProfileIdentity } from "@/components/profile/profile-identity";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

interface Face {
  cover: string;
  city: string;
  work: string;
  school: string;
  photos: string[];
}

const EMPTY: Face = { cover: "", city: "", work: "", school: "", photos: [] };
const FACE_KEY = "bengos-profile-face-v1";

interface Contact {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function ProfileBoard() {
  const { identity } = useSession();
  const [tab, setTab] = useState<"posty" | "informacje" | "zdjecia" | "znajomi">("posty");
  const [face, setFace] = useState<Face>(EMPTY);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Contact[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(FACE_KEY);
    if (!raw) return;
    try {
      setFace({ ...EMPTY, ...(JSON.parse(raw) as Face) });
    } catch {
      setFace(EMPTY);
    }
  }, []);

  useEffect(() => {
    if (!identity) return;
    void apiFetch<{ items: Post[] }>("/api/feed/posts?limit=30")
      .then((page) => setPosts((page.items ?? []).filter((post) => post.authorId === identity.id)))
      .catch(() => setPosts([]));
    void apiFetch<Contact[]>("/api/chat/contacts")
      .then((list) => setFriends(list ?? []))
      .catch(() => setFriends([]));
  }, [identity]);

  function save(next: Face) {
    setFace(next);
    localStorage.setItem(FACE_KEY, JSON.stringify(next));
  }

  function readImage(file: File, apply: (data: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") apply(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const name = identity?.displayName || identity?.username || "Gość";

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)]">
      <div className="relative h-48 bg-[#102033] sm:h-64">
        {face.cover ? (
          // Okładka jest lokalna, wybrana z dysku.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={face.cover} alt="" className="size-full object-cover" />
        ) : null}
        <label className="absolute bottom-3 right-3 cursor-pointer rounded-md bg-black/60 px-3 py-2 text-xs text-white">
          Okładka
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readImage(file, (cover) => save({ ...face, cover }));
            }}
          />
        </label>
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-10 flex items-end gap-4">
          <div className="size-24 overflow-hidden rounded-full border-4 border-[var(--bengos-surface-raised)] bg-[#1b2638]">
            {identity?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identity.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl">{name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-[var(--bengos-text-muted)]">@{identity?.username ?? "gosć"}</p>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm">{identity?.bio || "Napisz bio. Bez reklam, bez sprzedawania listy znajomych."}</p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--bengos-text-muted)]">
          {face.work ? <div>Praca: {face.work}</div> : null}
          {face.school ? <div>Szkoła: {face.school}</div> : null}
          {face.city ? <div>Miasto: {face.city}</div> : null}
          {identity?.website ? <div>{identity.website}</div> : null}
        </dl>
        <p className="mt-2 text-sm">
          {posts.length} wpisów · {friends.length} znajomych · {face.photos.length} zdjęć
        </p>
        <div className="mt-4 flex gap-2 border-t border-[var(--bengos-border)] pt-2">
          {(["posty", "informacje", "zdjecia", "znajomi"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={"min-h-11 rounded-md px-3 text-sm " + (tab === item ? "bg-[var(--bengos-accent)] text-[var(--bengos-text-on-accent)]" : "")}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "posty" ? (
            posts.length === 0 ? (
              <p className="text-sm text-[var(--bengos-text-muted)]">Twoje wpisy z bengtok pojawią się tutaj.</p>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="rounded-md border border-[var(--bengos-border)] p-3 text-sm">
                    {post.body || "Wpis bez opisu"}
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {tab === "informacje" ? (
            <div className="space-y-4">
              <form
                className="grid gap-2 sm:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  save({
                    ...face,
                    work: String(data.get("work") ?? ""),
                    school: String(data.get("school") ?? ""),
                    city: String(data.get("city") ?? ""),
                  });
                }}
              >
                <input name="work" defaultValue={face.work} placeholder="Praca" className="min-h-11 rounded-md border border-[var(--bengos-border)] bg-transparent px-3" />
                <input name="school" defaultValue={face.school} placeholder="Szkoła" className="min-h-11 rounded-md border border-[var(--bengos-border)] bg-transparent px-3" />
                <input name="city" defaultValue={face.city} placeholder="Miasto" className="min-h-11 rounded-md border border-[var(--bengos-border)] bg-transparent px-3" />
                <button type="submit" className="min-h-11 rounded-md border border-[var(--bengos-border)] px-3 text-sm">Zapisz informacje</button>
              </form>
              <ProfileIdentity />
            </div>
          ) : null}
          {tab === "zdjecia" ? (
            <div>
              <label className="mb-3 inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[var(--bengos-border)] px-3 text-sm">
                Dodaj zdjęcie
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readImage(file, (photo) => save({ ...face, photos: [photo, ...face.photos].slice(0, 24) }));
                  }}
                />
              </label>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {face.photos.map((photo, index) => (
                  <li key={photo.slice(0, 32) + index}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="aspect-square w-full rounded-md object-cover" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {tab === "znajomi" ? (
            friends.length === 0 ? (
              <p className="text-sm text-[var(--bengos-text-muted)]">Znajomi to osoby, które obserwujesz albo które obserwują Ciebie.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {friends.map((friend) => (
                  <li key={friend.id} className="rounded-md border border-[var(--bengos-border)] p-3 text-sm">
                    {friend.displayName ?? friend.username}
                    <span className="block text-[var(--bengos-text-muted)]">@{friend.username}</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
