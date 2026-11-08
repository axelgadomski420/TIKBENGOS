"""
API marketplace — montowane pod /market.

Płatności: provider = "manual" dopóki właściciel nie zdecyduje o Stripe/PayU.
Interfejs mówi wprost, że rozliczenie jest ręczne.
"""

from ninja import Router

from .models import MarketItem

router = Router()


@router.get("/items")
def list_items(request, kind: str | None = None, q: str | None = None):
    qs = MarketItem.objects.filter(state="published")
    if kind:
        qs = qs.filter(kind=kind)
    if q:
        qs = qs.filter(title__icontains=q)
    return [
        {
            "id": item.id,
            "sellerId": str(item.seller_id),
            "kind": item.kind,
            "title": item.title,
            "summary": item.summary,
            "priceMinor": item.price_minor,
            "currency": item.currency,
            "previewUrl": item.preview_url,
            "license": item.license,
            "createdAt": item.created_at.isoformat(),
            "publishedAt": item.published_at.isoformat() if item.published_at else None,
        }
        for item in qs[:100]
    ]


@router.get("/items/{item_id}")
def get_item(request, item_id: str):
    try:
        item = MarketItem.objects.get(id=item_id, state="published")
    except MarketItem.DoesNotExist:
        return {"error": "not_found"}, 404
    return {
        "id": item.id,
        "sellerId": str(item.seller_id),
        "kind": item.kind,
        "title": item.title,
        "summary": item.summary,
        "description": item.description,
        "priceMinor": item.price_minor,
        "currency": item.currency,
        "previewUrl": item.preview_url,
        "license": item.license,
        "createdAt": item.created_at.isoformat(),
        "publishedAt": item.published_at.isoformat() if item.published_at else None,
    }
