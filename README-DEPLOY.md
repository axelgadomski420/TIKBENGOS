# PURRE PETS — Wdrożenie produkcyjne

**PURRE PETS — Where exceptional breeds find exceptional homes.**

## Jedna komenda

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/TIKBENGOS/main/deploy/install.sh | sudo bash
```

## DNS

```
A     @      92.5.154.243
A     www    92.5.154.243
```

Po DNS:
```bash
sudo certbot --nginx -d purrepets.pl -d www.purrepets.pl --redirect
```

## Usługi

```bash
systemctl status purre-pets
systemctl status purre-ai
journalctl -u purre-pets -f
```

## AI lokalne

Ollama + Qwen2.5:3b — endpointy `/ai/moderate`, `/ai/classify`, `/ai/extract`, `/ai/assistant`, `/ai/risk`
