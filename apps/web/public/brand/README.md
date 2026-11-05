# Grafiki marki BENGOS — skąd są i jak je odtworzyć
#
# Ten plik istnieje po to, żeby nikt nie zgadywał pochodzenia plików
# w `apps/web/public/brand/`. Grafiki użyte w nagłówku powłoki to
# wersja dostarczona przez właściciela projektu — nie generowane
# i nie zaciągnięte z zewnątrz.
#
# `bengos-logo.jpg` — 1024x1024, znak marki: głowa tygrysa w holograficznej
# kuli, napis „BENGOS” nad głową, ciemne tło. Używany w nagłówku powłoki
# (`src/components/app-shell.tsx`) jako odnośnik do pulpitu.
#
# `bengos-icon-1024.png` — 1024x1024, kwadratowa wersja znaku przygotowana
# na podstawie `bengos-logo.jpg`. Leży gotowa na wypadek, gdyby projekt
# dostał ikony PWA — manifest (`public/manifest.webmanifest`) nadal wskazuje
# `/icons/icon-*.png`, których w repozytorium NIE MA. Ten plik ich nie
# zastępuje i manifest nie jest w nim zmieniany, bo zmiana rozmiarów ikon
# PWA to decyzja produktowa, nie uzupełnienie braku.
#
# Obraz w nagłówku ma `alt=""`, a nazwę podaje `aria-label` odnośnika.
# Powód jest w komentarzu `app-shell.tsx`: znak niesie nazwę wpisaną
# w grafikę, więc powtórzenie jej w `alt` kazałoby czytnikowi ekranu
# przeczytać „BENGOS” dwa razy.
