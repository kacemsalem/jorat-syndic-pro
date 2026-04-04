"""Vues réservées au superuser Django."""
from itertools import chain
from django.contrib.auth import get_user_model
from django.core import serializers as dj_serializers
from django.db import transaction
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import datetime, json

User = get_user_model()


def _require_superuser(request):
    if not request.user.is_superuser:
        return Response({"detail": "Accès réservé au superuser."}, status=403)
    return None


# ── Liste des résidences ───────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superuser_residences(request):
    err = _require_superuser(request)
    if err:
        return err

    from .models import Residence, ResidenceMembership, Groupe
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
            "created_at": r.created_at.strftime("%d/%m/%Y") if hasattr(r, "created_at") and r.created_at else "",
            "nb_lots":    r.lots.count(),
            "nb_groupes": Groupe.objects.filter(residence=r).count(),
            "admins": [
                {"id": m.user.id, "username": m.user.username, "email": m.user.email or ""}
                for m in admins
            ],
        })
    return Response(result)


# ── Détail / modification d'une résidence ─────────────────────────────────────
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def superuser_residence_detail(request, pk):
    err = _require_superuser(request)
    if err:
        return err

    from .models import Residence, ResidenceMembership, Groupe, Lot, Paiement, Depense, CaisseMouvement
    try:
        r = Residence.objects.get(pk=pk)
    except Residence.DoesNotExist:
        return Response({"detail": "Résidence introuvable."}, status=404)

    if request.method == "PATCH":
        if "nom_residence" in request.data:
            r.nom_residence = request.data["nom_residence"].strip()
        if "ville_residence" in request.data:
            r.ville_residence = request.data["ville_residence"].strip()
        if not r.nom_residence:
            return Response({"detail": "Le nom est obligatoire."}, status=400)
        r.save(update_fields=["nom_residence", "ville_residence"])
        return Response({"detail": "Résidence mise à jour."})

    admins = (
        ResidenceMembership.objects
        .filter(residence=r, actif=True)
        .select_related("user")
        .order_by("role")
    )
    from django.db.models import Sum
    total_du   = Lot.objects.filter(residence=r).aggregate(s=Sum("tantiemes"))["s"] or 0
    nb_lots    = Lot.objects.filter(residence=r).count()
    nb_groupes = Groupe.objects.filter(residence=r).count()
    nb_paiements = Paiement.objects.filter(residence=r).count()
    nb_depenses  = Depense.objects.filter(residence=r).count()
    solde_caisse = (
        CaisseMouvement.objects.filter(residence=r, sens="DEBIT").aggregate(s=Sum("montant"))["s"] or 0
    ) - (
        CaisseMouvement.objects.filter(residence=r, sens="CREDIT").aggregate(s=Sum("montant"))["s"] or 0
    )

    return Response({
        "id":          r.id,
        "nom":         r.nom_residence,
        "ville":       r.ville_residence or "",
        "created_at":  r.created_at.strftime("%d/%m/%Y") if hasattr(r, "created_at") and r.created_at else "",
        "nb_lots":     nb_lots,
        "nb_groupes":  nb_groupes,
        "nb_paiements": nb_paiements,
        "nb_depenses":  nb_depenses,
        "solde_caisse": float(solde_caisse),
        "admins": [
            {
                "id":       m.user.id,
                "username": m.user.username,
                "email":    m.user.email or "",
                "role":     m.role,
                "actif":    m.actif,
            }
            for m in admins
        ],
    })


# ── Ajouter un administrateur à une résidence ─────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def superuser_add_admin(request, pk):
    err = _require_superuser(request)
    if err:
        return err

    from .models import Residence, ResidenceMembership
    try:
        r = Residence.objects.get(pk=pk)
    except Residence.DoesNotExist:
        return Response({"detail": "Résidence introuvable."}, status=404)

    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    email    = request.data.get("email", "").strip()

    if not username:
        return Response({"detail": "Nom d'utilisateur requis."}, status=400)
    if len(password) < 6:
        return Response({"detail": "Mot de passe minimum 6 caractères."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": f"L'utilisateur « {username} » existe déjà."}, status=400)

    u = User.objects.create_user(username=username, password=password, email=email)
    ResidenceMembership.objects.create(residence=r, user=u, role="ADMIN", actif=True)
    return Response({"detail": f"Admin « {username} » créé et associé à la résidence.", "id": u.id, "username": u.username, "email": u.email or ""})


# ── Activer / désactiver un admin ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def superuser_toggle_admin(request, pk, user_id):
    err = _require_superuser(request)
    if err:
        return err

    from .models import Residence, ResidenceMembership
    try:
        m = ResidenceMembership.objects.get(residence_id=pk, user_id=user_id)
    except ResidenceMembership.DoesNotExist:
        return Response({"detail": "Membership introuvable."}, status=404)

    m.actif = not m.actif
    m.save(update_fields=["actif"])
    return Response({"detail": f"Admin {'activé' if m.actif else 'désactivé'}.", "actif": m.actif})


# ── Reset mot de passe ────────────────────────────────────────────────────────
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


# ── Configuration IA globale ──────────────────────────────────────────────────
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def superuser_ai_config(request):
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


# ── Backup ────────────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superuser_backup(request, pk):
    err = _require_superuser(request)
    if err:
        return err

    from .models import (
        Residence, Groupe, Lot, Personne, AppelCharge, DetailAppelCharge,
        AffectationPaiement, Paiement, Depense, Recette, CaisseMouvement,
        CompteComptable, CategorieDepense, FamilleDepense, Fournisseur, Contrat,
        MandatBureauSyndical, MandatBureauMembre, AssembleeGenerale, Resolution,
        PassationConsignes, SuiviLot, ArchiveComptable, ArchiveDepense,
        ArchivePaiement, ArchiveRecette, ArchiveAffectationPaiement,
    )

    try:
        r = Residence.objects.get(pk=pk)
    except Residence.DoesNotExist:
        return Response({"detail": "Résidence introuvable."}, status=404)

    # Collect all related objects in FK-safe order
    objects = list(chain(
        Residence.objects.filter(pk=pk),
        CompteComptable.objects.filter(residence_id=pk),
        CategorieDepense.objects.filter(residence_id=pk),
        FamilleDepense.objects.filter(residence_id=pk),
        Fournisseur.objects.filter(residence_id=pk),
        Personne.objects.filter(residence_id=pk),
        Groupe.objects.filter(residence_id=pk),
        Lot.objects.filter(residence_id=pk),
        AppelCharge.objects.filter(residence_id=pk),
        DetailAppelCharge.objects.filter(appel__residence_id=pk),
        Paiement.objects.filter(residence_id=pk),
        AffectationPaiement.objects.filter(paiement__residence_id=pk),
        Depense.objects.filter(residence_id=pk),
        Recette.objects.filter(residence_id=pk),
        CaisseMouvement.objects.filter(residence_id=pk),
        Contrat.objects.filter(residence_id=pk),
        AssembleeGenerale.objects.filter(residence_id=pk),
        Resolution.objects.filter(assemblee_generale__residence_id=pk),
        MandatBureauSyndical.objects.filter(residence_id=pk),
        MandatBureauMembre.objects.filter(mandat__residence_id=pk),
        PassationConsignes.objects.filter(assemblee__residence_id=pk),
        SuiviLot.objects.filter(lot__residence_id=pk),
        ArchiveComptable.objects.filter(residence_id=pk),
        ArchiveDepense.objects.filter(archive__residence_id=pk),
        ArchivePaiement.objects.filter(archive__residence_id=pk),
        ArchiveAffectationPaiement.objects.filter(archive_paiement__archive__residence_id=pk),
        ArchiveRecette.objects.filter(archive__residence_id=pk),
    ))

    data_json = dj_serializers.serialize("json", objects, indent=2)

    # Wrap with metadata
    meta = {
        "version":      "2.0",
        "exported_at":  datetime.datetime.now().isoformat(),
        "residence_id": pk,
        "residence_nom": r.nom_residence,
        "nb_objects":   len(objects),
        "data":         json.loads(data_json),
    }

    nom_safe = r.nom_residence.replace(" ", "_").replace("/", "-")[:30]
    date_str = datetime.date.today().strftime("%Y%m%d")
    filename = f"backup_{nom_safe}_{date_str}.json"

    response = HttpResponse(
        json.dumps(meta, ensure_ascii=False, indent=2),
        content_type="application/json",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ── Restore ───────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def superuser_restore(request, pk):
    err = _require_superuser(request)
    if err:
        return err

    from .models import (
        Residence, Groupe, Lot, Personne, AppelCharge, DetailAppelCharge,
        AffectationPaiement, Paiement, Depense, Recette, CaisseMouvement,
        CompteComptable, CategorieDepense, FamilleDepense, Fournisseur, Contrat,
        MandatBureauSyndical, MandatBureauMembre, AssembleeGenerale, Resolution,
        PassationConsignes, SuiviLot, ArchiveComptable, ArchiveDepense,
        ArchivePaiement, ArchiveRecette, ArchiveAffectationPaiement,
    )

    try:
        Residence.objects.get(pk=pk)
    except Residence.DoesNotExist:
        return Response({"detail": "Résidence introuvable."}, status=404)

    backup_file = request.FILES.get("backup")
    if not backup_file:
        return Response({"detail": "Fichier backup requis (champ 'backup')."}, status=400)

    try:
        raw = backup_file.read().decode("utf-8")
        meta = json.loads(raw)
    except Exception as e:
        return Response({"detail": f"Fichier invalide : {e}"}, status=400)

    if "data" not in meta:
        return Response({"detail": "Format de backup invalide (clé 'data' manquante)."}, status=400)

    version = meta.get("version", "1.0")

    try:
        with transaction.atomic():
            # ── 1. Supprimer toutes les données liées (ordre inverse des FKs)
            ArchiveAffectationPaiement.objects.filter(archive_paiement__archive__residence_id=pk).delete()
            ArchiveRecette.objects.filter(archive__residence_id=pk).delete()
            ArchivePaiement.objects.filter(archive__residence_id=pk).delete()
            ArchiveDepense.objects.filter(archive__residence_id=pk).delete()
            ArchiveComptable.objects.filter(residence_id=pk).delete()
            SuiviLot.objects.filter(lot__residence_id=pk).delete()
            PassationConsignes.objects.filter(assemblee__residence_id=pk).delete()
            MandatBureauMembre.objects.filter(mandat__residence_id=pk).delete()
            MandatBureauSyndical.objects.filter(residence_id=pk).delete()
            Resolution.objects.filter(assemblee_generale__residence_id=pk).delete()
            AssembleeGenerale.objects.filter(residence_id=pk).delete()
            Contrat.objects.filter(residence_id=pk).delete()
            CaisseMouvement.objects.filter(residence_id=pk).delete()
            Recette.objects.filter(residence_id=pk).delete()
            Depense.objects.filter(residence_id=pk).delete()
            AffectationPaiement.objects.filter(paiement__residence_id=pk).delete()
            Paiement.objects.filter(residence_id=pk).delete()
            DetailAppelCharge.objects.filter(appel__residence_id=pk).delete()
            AppelCharge.objects.filter(residence_id=pk).delete()
            Lot.objects.filter(residence_id=pk).delete()
            Groupe.objects.filter(residence_id=pk).delete()
            Personne.objects.filter(residence_id=pk).delete()
            Fournisseur.objects.filter(residence_id=pk).delete()
            FamilleDepense.objects.filter(residence_id=pk).delete()
            CategorieDepense.objects.filter(residence_id=pk).delete()
            CompteComptable.objects.filter(residence_id=pk).delete()

            # ── 2. Re-importer les objets avec leurs PKs d'origine
            data_str = json.dumps(meta["data"], ensure_ascii=False)
            nb_imported = 0
            for obj in dj_serializers.deserialize("json", data_str):
                # Ne pas écraser la Residence elle-même
                if obj.object.__class__.__name__ == "Residence":
                    continue
                obj.save()
                nb_imported += 1

    except Exception as e:
        return Response({"detail": f"Erreur lors de la restauration : {e}"}, status=500)

    return Response({
        "detail": f"Restauration réussie. {nb_imported} objets importés.",
        "nb_imported": nb_imported,
    })
