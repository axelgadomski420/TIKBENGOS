# PURRE PETS — Wdrożenie produkcyjne

**PURRE PETS — Where exceptional breeds find exceptional homes.**  
**PURRE PETS — Tam, gdzie wyjątkowe rasy znajdują wyjątkowe domy.**

## Jedna komenda (zalecane)

Na świeżym Ubuntu 24.04 (Oracle Cloud, 1 OCPU / 6 GB RAM):

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/install.sh | sudo bash
```

Skrypt jest idempotentny. Instaluje:

- Java 17, MySQL 8, Node 20, Nginx, Certbot, Redis, Tesseract
- Ollama + model Qwen2.5 3B (lokalny AI ≤ 3 GB RAM)
- FastAPI AI Service (`purre-ai.service`)
- Backend Spring Boot (`purre-pets.service`)
- Frontend Angular (Nginx SPA)
- Firewall (tylko 22/80/443)

## DNS

```
A     @      92.5.154.243
A     www    92.5.154.243
```

Po ustawieniu DNS:

```bash
sudo certbot --nginx -d purrepets.pl -d www.purrepets.pl --redirect
```

## Cloudflare

1. Dodaj rekordy A (Proxy włączone).
2. SSL/TLS → Full (strict) po certyfikacie.
3. WAF + Rate Limiting zalecane.
4. Cache Level: Standard.

## Usługi

```bash
systemctl status purre-pets
systemctl status purre-ai
journalctl -u purre-pets -f
journalctl -u purre-ai -f
```

## AI (lokalne)

- Ollama + Qwen2.5:3b
- Endpointy: `/ai/moderate`, `/ai/classify`, `/ai/extract`, `/ai/assistant`, `/ai/risk`
- Fallback na reguły przy niedostępności modelu

## Bezpieczeństwo

- Backend, MySQL, Redis, AI nasłuchują tylko na 127.0.0.1
- UFW blokuje wszystko poza SSH/HTTP/HTTPS
- Hasła MySQL w `/root/.purre_mysql` (chmod 600)
- Nie commituj `.env` z sekretami
