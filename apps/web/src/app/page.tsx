import type { Metadata } from "next";

import { UniversalSearch } from "@/components/home/universal-search";
import { IdentityBar } from "@/components/home/identity-bar";
import { CreateNowCard } from "@/components/home/create-now-card";
import { ContinueCard } from "@/components/home/continue-card";
import { ForYouCard } from "@/components/home/for-you-card";
import { AccessibilityCard } from "@/components/home/accessibility-card";
import { ModuleBranches } from "@/components/home/module-branches";

import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "BENGOS Home" };

/**
 * BENGOS Home — pulpit sterowania, nie feed.
 *
 * Różnica jest zasadnicza i wynika wprost z briefu: feed pokazuje treść,
 * pulpit pokazuje intencję. Użytkownik nie przewija tu w poszukiwaniu czegoś
 * do obejrzenia — przychodzi z pomysłem i ma zobaczyć, którą drogą go
 * zrealizować. Dlatego wyszukiwarka jest na samej górze, wejścia do tworzenia
 * są widoczne bez przewijania, a feed jest jedną kartą wśród pięciu.
 *
 * ── NAGŁÓWEK Z GRAFIKĄ MARKI ───────────────────────────────────────────
 * Na samej górze pulpitu stoi grafika z podpisami modułów. To jest jedyne
 * miejsce w aplikacji, w którym te napisy mają sens: odsyłają wzrok do tego,
 * co pod nimi, a w pasku o wysokości 40 px byłyby szumem.
 *
 * Grafika jest dekoracją (`alt=""`), bo nie niesie treści, której nie ma
 * gdzie indziej: nazwy modułów stoją pod nią jako PRAWDZIWE odnośniki
 * i to one działają. Obraz bez `alt` kazałby czytnikowi odczytać pięć
 * słów, które zaraz przeczyta drugi raz z listy.
 *
 * ── POPRZEDNIE USUNIĘCIE ZOSTAŁO COFNIĘTE ──────────────────────────────
 * Wcześniejsza wersja usuwała grafikę z powodu uwagi o „marcie okrągłych
 * przycisków wypisanych w obrazie”. Ta uwaga dotyczyła CZEGO INNEGO:
 * tego, żeby nie udawać przycisków, których nie ma. Ponieważ grafikę wolno
 * pokazać, a obowiązek dotyczy przycisków, grafika wróciła na swoje
 * miejsce: obraz ustawia nastrój, a menu pod nim naprawdę działa.
 *
 * ── RYTM WEJŚCIA ───────────────────────────────────────────────────────
 * Elementy wchodzą jeden po drugim, w kolejności czytania: najpierw znak,
 * potem pytanie („co chcesz zrobić?”), potem kim jesteś, potem co możesz
 * zrobić, i dopiero na końcu gdzie wejść. Opóźnienia kończą się na piątej
 * pozycji — dalej przestałyby być rytmem, a zaczęłyby być zwłoką.
 */
export default function HomePage() {
  return (
    <div className="space-y-6">
      {/*
        Tytuł jest dla czytnika ekranu, nie dla oka — znak i nazwa stoją
        w nagłówku powłoki oraz w grafice pod nim. Powtórzenie ich tutaj
        byłoby szumem, a `bengos-visually-hidden` zostawia treść w drzewie
        dostępności: `display: none` usunęłoby ją razem z informacją
        o strukturze.
      */}
      <h1 className="bengos-visually-hidden">BENGOS Home — pulpit</h1>

      <div className="bengos-rise bengos-rise-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.home}
          alt=""
          width={1024}
          height={1024}
          className="mx-auto w-full max-w-md rounded-[var(--bengos-radius-card)] object-contain"
        />
      </div>

      <div className="bengos-rise bengos-rise-2">
        <UniversalSearch />
      </div>

      <div className="bengos-rise bengos-rise-3">
        <IdentityBar />
      </div>

      <div className="bengos-rise bengos-rise-3 grid gap-4 md:grid-cols-2">
        <CreateNowCard />
        <ContinueCard />
      </div>

      <div className="bengos-rise bengos-rise-4 space-y-6">
        <ForYouCard />
        <AccessibilityCard />
      </div>

      <div className="bengos-rise bengos-rise-5">
        <ModuleBranches />
      </div>
    </div>
  );
}
