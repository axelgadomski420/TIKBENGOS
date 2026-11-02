"""Szyfrowanie sekretów w spoczynku.

Jeden klucz (Fernet: AES-128-CBC + HMAC-SHA256), jeden format tekstu
zaszyfrowanego. Klucze API użytkowników są jedynym, co tym przechodzi —
nigdy hasła, bo te są hashowane przez Django i nigdy nie muszą wracać
w postaci czytelnej.
"""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        raise RuntimeError(
            "Brak FIELD_ENCRYPTION_KEY. Wygeneruj raz i nie zmieniaj bez "
            "ponownego zaszyfrowania danych: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        # Odszyfrowanie kluczem innym niż ten, którym zaszyfrowano, jest
        # nieodwracalne. Mówimy to wprost, zamiast zwracać puste dane.
        raise RuntimeError(
            "Nie można odszyfrować sekretu — FIELD_ENCRYPTION_KEY zmienił się "
            "po zaszyfrowaniu danych."
        ) from exc
