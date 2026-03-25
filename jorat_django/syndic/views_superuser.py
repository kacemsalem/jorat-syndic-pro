"""Vues réservées au superuser Django."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()


def _require_superuser(request):
    if not request.user.is_superuser:
        return Response({"detail": "Accès réservé au superuser."}, status=403)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superuser_residences(request):
    err = _require_superuser(request)
    if err:
        return err

    from .models import Residence, ResidenceMembership
    residences = Residence.objects.prefetch_related("lots").order_by("created_at")
    result = []
    for r in residences:
        admins = (
            ResidenceMembership.objects
            .filter(residence=r, role="ADMIN", actif=True)
            .select_related("user")
        )
        result.append({
            "id":         r.id,
            "nom":        r.nom_residence,
            "ville":      r.ville_residence or "",
            "created_at": r.created_at.strftime("%Y-%m-%d") if hasattr(r, "created_at") and r.created_at else "",
            "nb_lots":    r.lots.count(),
            "admins": [
                {"id": m.user.id, "username": m.user.username, "email": m.user.email or ""}
                for m in admins
            ],
        })
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def superuser_set_password(request):
    err = _require_superuser(request)
    if err:
        return err

    user_id  = request.data.get("user_id")
    password = request.data.get("password", "").strip()
    if not user_id or len(password) < 6:
        return Response({"detail": "user_id requis et mot de passe ≥ 6 caractères."}, status=400)

    try:
        u = User.objects.get(id=user_id)
        u.set_password(password)
        u.save()
        return Response({"detail": f"Mot de passe de « {u.username} » mis à jour."})
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def superuser_ai_config(request):
    """Configuration IA globale unique pour tout le projet."""
    err = _require_superuser(request)
    if err:
        return err

    from .models import AIConfig
    cfg, _ = AIConfig.objects.get_or_create(
        residence=None,
        defaults={
            "api_url":    "https://api.groq.com/openai/v1/chat/completions",
            "model_name": "llama-3.1-8b-instant",
        },
    )

    if request.method == "GET":
        return Response({
            "system_prompt": cfg.system_prompt,
            "api_url":       cfg.api_url,
            "api_key":       "***" if cfg.api_key else "",
            "model_name":    cfg.model_name,
            "configured":    bool(cfg.api_key),
        })

    for field in ["system_prompt", "api_url", "model_name"]:
        if field in request.data:
            setattr(cfg, field, request.data[field])
    if "api_key" in request.data and request.data["api_key"] not in ("***", ""):
        cfg.api_key = request.data["api_key"]
    cfg.save()
    return Response({"detail": "Configuration IA sauvegardée.", "configured": bool(cfg.api_key)})
