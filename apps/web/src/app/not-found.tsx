import { ModulePlaceholder } from "@/components/module-placeholder";

/**
 * 404, który mówi prawdę.
 *
 * W aplikacji z siedmioma modułami najczęstsza przyczyna tego ekranu to
 * literówka w adresie albo wejście do modułu, który jeszcze nie istnieje —
 * dlatego ekran odsyła do listy modułów, a nie tylko do pulpitu.
 */
export default function NotFound() {
  return (
    <ModulePlaceholder
      name="tu nie ma"
      stage={1}
      description="Ten adres nie prowadzi do żadnego ekranu. Jeśli wpisywałeś go ręcznie, sprawdź pisownię. Jeśli trafiłeś tu z linku w aplikacji, to jest nasz błąd."
      planned={[
        "Wróć na BENGOS Home — tam są wszystkie rozwidlenia",
        "W liście modułów widać, które ekrany już istnieją, a które powstają",
      ]}
    />
  );
}
