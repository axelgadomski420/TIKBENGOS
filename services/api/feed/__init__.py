# Pakiet aplikacji feedu.
#
# Plik MUSI mieć jakąś treść, a nie być niedomkniętym docstringiem.
# Wcześniejsza wersja zawierała tylko trzy cudzysłowy bez zamknięcia, co dawało
# `SyntaxError: unterminated triple-quoted string literal` przy starcie Django.
# API nie mogło wystartować, a kontener wchodził w pętlę restartów.
