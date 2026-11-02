import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "BENGOS Profile" };

export default function ProfilePage() {
  return (
    <ModulePlaceholder
      name="Profile"
      stage={2}
      description="Tożsamość, twórczość, projekty, osiągnięcia i ustawienia asystenta. Jedno konto dla wszystkich modułów — rola i zgody, nie drugie konto."
      planned={[
        "Profil publiczny: nazwa, awatar, biografia, witryna, liczniki",
        "Twoja twórczość: wideo, utwory, posty, projekty kodu",
        "Ustawienia asystenta i kluczy API",
        "Zgody: kamera, mikrofon, GitHub, powiadomienia — każde osobno i odwoływalne",
      ]}
    />
  );
}
