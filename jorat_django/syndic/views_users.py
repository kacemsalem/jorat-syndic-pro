"""
Gestion des utilisateurs de résidence (admin only).
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ResidenceMembership, Lot
from .views import get_user_residence

User = get_user_model()


def _require_admin(request):
    """Return (membership, error_response). error_response is None if OK."""
    membership = ResidenceMembership.objects.filter(
        user=request.user, actif=True
    ).select_related("residence").first()
    if not membership:
        return None, Response({"detail": "Aucune résidence liée."}, status=403)
    if membership.role not in ("ADMIN", "SUPER_ADMIN"):
        return None, Response({"detail": "Accès réservé aux administrateurs."}, status=403)
    return membership, None


# ── List & Create ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def residence_users_list(request):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    if request.method == "GET":
        memberships = (
            ResidenceMembership.objects
            .filter(residence=residence)
            .select_related("user", "lot")
            .order_by("role", "user__username")
        )
        data = []
        for m in memberships:
            data.append({
                "membership_id": m.id,
                "user_id":       m.user.id,
                "username":      m.user.username,
                "email":         m.user.email,
                "role":          m.role,
                "actif":         m.actif,
                "must_change_password": m.must_change_password,
                "lot_id":        m.lot_id,
                "lot_numero":    m.lot.numero_lot if m.lot else None,
            })
        return Response(data)

    # POST — create user
    username = (request.data.get("username") or "").strip()
    password = (request.data.get("password") or "").strip()
    email    = (request.data.get("email") or "").strip()
    role     = request.data.get("role", "RESIDENT")
    lot_id   = request.data.get("lot_id")

    errors = {}
    if not username:
        errors["username"] = "Le nom d'utilisateur est obligatoire."
    elif User.objects.filter(username=username).exists():
        errors["username"] = "Ce nom d'utilisateur est déjà pris."
    if len(password) < 4:
        errors["password"] = "Le mot de passe doit contenir au moins 4 caractères."
    if role not in dict(ResidenceMembership.ROLE_CHOICES):
        errors["role"] = "Rôle invalide."
    lot = None
    if lot_id:
        try:
            lot = Lot.objects.get(pk=lot_id, residence=residence)
        except Lot.DoesNotExist:
            errors["lot_id"] = "Lot introuvable."
    if errors:
        return Response(errors, status=400)

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password, email=email)
        m = ResidenceMembership.objects.create(
            user=user,
            residence=residence,
            role=role,
            actif=True,
            lot=lot,
            must_change_password=True,
        )

    return Response({
        "membership_id": m.id,
        "user_id":       user.id,
        "username":      user.username,
        "email":         user.email,
        "role":          m.role,
        "actif":         m.actif,
        "must_change_password": m.must_change_password,
        "lot_id":        m.lot_id,
        "lot_numero":    lot.numero_lot if lot else None,
    }, status=201)


# ── Update & Reset password ───────────────────────────────────────────────────

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def residence_user_detail(request, pk):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    try:
        m = ResidenceMembership.objects.select_related("user", "lot").get(
            pk=pk, residence=residence
        )
    except ResidenceMembership.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)

    # Prevent admin from deleting/deactivating their own account
    if m.user == request.user and request.method == "DELETE":
        return Response({"detail": "Vous ne pouvez pas supprimer votre propre compte."}, status=400)

    if request.method == "DELETE":
        m.user.delete()
        return Response(status=204)

    # PATCH
    user = m.user
    data = request.data

    if "username" in data:
        new_username = (data["username"] or "").strip()
        if not new_username:
            return Response({"username": "Ne peut pas être vide."}, status=400)
        if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
            return Response({"username": "Ce nom d'utilisateur est déjà pris."}, status=400)
        user.username = new_username
        user.save(update_fields=["username"])

    if "email" in data:
        user.email = (data["email"] or "").strip()
        user.save(update_fields=["email"])

    if "role" in data:
        if data["role"] not in dict(ResidenceMembership.ROLE_CHOICES):
            return Response({"role": "Rôle invalide."}, status=400)
        if m.user == request.user and data["role"] != m.role:
            return Response({"role": "Vous ne pouvez pas modifier votre propre rôle."}, status=400)
        m.role = data["role"]

    if "actif" in data:
        if m.user == request.user and not data["actif"]:
            return Response({"actif": "Vous ne pouvez pas vous désactiver vous-même."}, status=400)
        m.actif = bool(data["actif"])

    if "lot_id" in data:
        lot_id = data["lot_id"]
        if lot_id:
            try:
                m.lot = Lot.objects.get(pk=lot_id, residence=residence)
            except Lot.DoesNotExist:
                return Response({"lot_id": "Lot introuvable."}, status=400)
        else:
            m.lot = None

    m.save()

    return Response({
        "membership_id": m.id,
        "user_id":       user.id,
        "username":      user.username,
        "email":         user.email,
        "role":          m.role,
        "actif":         m.actif,
        "must_change_password": m.must_change_password,
        "lot_id":        m.lot_id,
        "lot_numero":    m.lot.numero_lot if m.lot else None,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_user_password(request, pk):
    admin_membership, err = _require_admin(request)
    if err:
        return err
    residence = admin_membership.residence

    try:
        m = ResidenceMembership.objects.select_related("user").get(
            pk=pk, residence=residence
        )
    except ResidenceMembership.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable."}, status=404)

    new_password = (request.data.get("password") or "").strip()
    if len(new_password) < 4:
        return Response({"password": "Le mot de passe doit contenir au moins 4 caractères."}, status=400)

    m.user.set_password(new_password)
    m.user.save(update_fields=["password"])
    m.must_change_password = True
    m.save(update_fields=["must_change_password"])

    return Response({"detail": "Mot de passe réinitialisé."})


# ── Change own password (first login) ────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_own_password(request):
    new_password = (request.data.get("new_password") or "").strip()
    if len(new_password) < 6:
        return Response({"new_password": "Le mot de passe doit contenir au moins 6 caractères."}, status=400)

    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])

    # Clear the flag
    ResidenceMembership.objects.filter(user=request.user, actif=True).update(must_change_password=False)

    # Re-authenticate to keep session alive
    from django.contrib.auth import update_session_auth_hash
    update_session_auth_hash(request, request.user)

    return Response({"detail": "Mot de passe mis à jour."})
