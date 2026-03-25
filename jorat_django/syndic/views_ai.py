"""
Module IA — Jorat Syndic Pro
Endpoints : documents PDF, configuration, chat.
Le LLM n'accède jamais directement à la base de données.
"""
import json
from django.db.models import Sum, Q
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .views import get_user_residence


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_pdf_text(file_obj):
    """Extrait le texte d'un fichier PDF via pypdf (sans dépendance système)."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_obj)
        parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n".join(parts)[:50000]  # max 50k chars
    except Exception as e:
        return f"[Erreur extraction PDF : {e}]"


def _get_config():
    """Retourne la configuration IA globale unique (residence=None)."""
    from .models import AIConfig
    cfg, _ = AIConfig.objects.get_or_create(
        residence=None,
        defaults={
            "api_url":    "https://api.groq.com/openai/v1/chat/completions",
            "model_name": "llama-3.1-8b-instant",
            "system_prompt": (
                "Tu es l'assistant IA de Syndic Pro, une application de gestion de copropriété. "
                "Tu aides les syndics et copropriétaires à comprendre leur situation financière, "
                "les règlements et les procédures. Tu réponds toujours en français, de manière "
                "claire et professionnelle. Tu ne dois jamais inventer de données : si tu n'as "
                "pas l'information, dis-le clairement."
            ),
        }
    )
    return cfg


def _build_business_context(message_lower, residence):
    """Génère un résumé structuré des données réelles selon la question posée."""
    from .models import Lot, CaisseMouvement, Depense
    from django.db.models import Sum as S, Q as Qd
    parts = []

    keywords_caisse = [
        "caisse", "solde", "trésorerie", "trésorier", "balance",
        "argent", "fonds", "disponible", "encaisse",
    ]
    keywords_lots = [
        "lot", "propriétaire", "copropriétaire", "impayé", "impayés",
        "dette", "dettes", "retard", "retards", "paiement", "paiements",
        "doit", "doivent", "situation", "arriéré", "arriérés",
        "recouvrement", "relance", "qui n'a pas payé", "pas payé",
        "en défaut", "solde lot", "reste à payer", "reste dû",
    ]
    keywords_depenses = [
        "dépense", "dépenses", "fournisseur", "charge", "facture", "coût",
        "frais", "dépensé", "sortie",
    ]

    # ── Caisse ──
    if any(k in message_lower for k in keywords_caisse):
        agg = CaisseMouvement.objects.filter(residence=residence).aggregate(
            entrees=S("montant", filter=Qd(sens="DEBIT")),
            sorties=S("montant", filter=Qd(sens="CREDIT")),
        )
        solde = float(agg["entrees"] or 0) - float(agg["sorties"] or 0)
        parts.append(f"SOLDE DE CAISSE ACTUEL : {solde:,.2f} MAD")

    # ── Lots / paiements ──
    if any(k in message_lower for k in keywords_lots):
        lots = Lot.objects.filter(residence=residence).select_related("proprietaire", "groupe")
        impayes, a_jour = [], []
        for lot in lots:
            total_du  = float(lot.details_appels.aggregate(s=S("montant"))["s"] or 0)
            total_pay = float(lot.paiements.aggregate(s=S("montant"))["s"] or 0)
            reste     = total_du - total_pay
            prop      = lot.proprietaire
            nom_prop  = f"{prop.nom} {prop.prenom}".strip() if prop else "Propriétaire inconnu"
            groupe    = lot.groupe.nom_groupe if lot.groupe else ""
            entry = (
                f"  • Lot {lot.numero_lot}"
                + (f" ({groupe})" if groupe else "")
                + f" — {nom_prop}"
                + f" — Dû : {total_du:,.0f} | Payé : {total_pay:,.0f} | Reste : {reste:,.0f} MAD"
            )
            if reste > 0:
                impayes.append(entry)
            else:
                a_jour.append(entry)

        lines = [f"SITUATION DES LOTS — {residence.nom_residence} :"]
        if impayes:
            lines.append(f"\nLOTS AVEC IMPAYÉS ({len(impayes)}) :")
            lines.extend(impayes)
        else:
            lines.append("\nAucun lot avec impayés.")
        if a_jour:
            lines.append(f"\nLOTS À JOUR ({len(a_jour)}) :")
            lines.extend(a_jour)
        parts.append("\n".join(lines))

    # ── Dépenses ──
    if any(k in message_lower for k in keywords_depenses):
        agg   = Depense.objects.filter(residence=residence).aggregate(total=S("montant"))
        total = float(agg["total"] or 0)
        count = Depense.objects.filter(residence=residence).count()
        parts.append(f"DÉPENSES : {count} dépenses enregistrées — total {total:,.2f} MAD")

    return "\n\n".join(parts)


def _call_llm(cfg, system_msg, user_msg, history=None):
    """Appelle l'API LLM (OpenAI-compatible) et retourne le texte de réponse."""
    if not cfg.api_key:
        return (
            "⚠️ L'IA n'est pas encore configurée. "
            "Veuillez ajouter une clé API dans Paramétrage → IA."
        )

    messages = [{"role": "system", "content": system_msg}]
    if history:
        for h in history[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    payload = {
        "model":       cfg.model_name or "llama-3.1-8b-instant",
        "messages":    messages,
        "max_tokens":  1024,
        "temperature": 0.3,
    }
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {cfg.api_key}",
        "User-Agent":    "Mozilla/5.0 (compatible; SyndicPro/1.0)",
    }

    try:
        import http.client, ssl, urllib.parse
        parsed   = urllib.parse.urlparse(cfg.api_url)
        ctx      = ssl.create_default_context()
        conn     = http.client.HTTPSConnection(parsed.netloc, timeout=30, context=ctx)
        path     = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        body = json.dumps(payload).encode("utf-8")
        conn.request("POST", path, body=body, headers=headers)
        resp = conn.getresponse()
        raw  = resp.read().decode("utf-8")
        conn.close()
        if resp.status != 200:
            return f"Erreur API ({resp.status}) : {raw[:300]}"
        return json.loads(raw)["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Erreur de connexion : {e}"


# ── Chemin documentation application ──────────────────────────────────────
import os as _os
_DOCS_PATH = _os.path.join(
    _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))),
    "docs", "documentation_jorat.md"
)

# ── Views ──────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_load_app_docs(request):
    """
    Lit documentation_jorat.md depuis le serveur et le charge/met à jour
    comme AIDocument actif pour la résidence courante.
    """
    from .models import AIDocument
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    if not _os.path.exists(_DOCS_PATH):
        return Response({"detail": f"Fichier documentation introuvable : {_DOCS_PATH}"}, status=404)

    with open(_DOCS_PATH, "r", encoding="utf-8") as f:
        texte = f.read()

    NOM = "Documentation Syndic Pro — Guide complet"
    # Met à jour si déjà existant, sinon crée
    doc, created = AIDocument.objects.update_or_create(
        residence=residence,
        nom=NOM,
        defaults={"texte_extrait": texte, "actif": True},
    )
    return Response({
        "detail": "Documentation chargée avec succès." if created else "Documentation mise à jour.",
        "id":           doc.id,
        "taille_texte": len(texte),
        "created":      created,
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def ai_documents(request):
    from .models import AIDocument
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    if request.method == "GET":
        docs = AIDocument.objects.filter(residence=residence)
        return Response([{
            "id":           d.id,
            "nom":          d.nom,
            "actif":        d.actif,
            "date_upload":  d.created_at.strftime("%Y-%m-%d %H:%M"),
            "taille_texte": len(d.texte_extrait),
        } for d in docs])

    # POST — upload PDF
    fichier = request.FILES.get("fichier")
    nom     = request.data.get("nom", fichier.name if fichier else "Document")
    if not fichier:
        return Response({"detail": "Fichier requis."}, status=400)

    texte = _extract_pdf_text(fichier)
    doc   = AIDocument.objects.create(
        residence=residence, nom=nom, fichier=fichier, texte_extrait=texte
    )
    return Response({
        "id":           doc.id,
        "nom":          doc.nom,
        "actif":        doc.actif,
        "date_upload":  doc.created_at.strftime("%Y-%m-%d %H:%M"),
        "taille_texte": len(doc.texte_extrait),
    }, status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def ai_document_detail(request, pk):
    from .models import AIDocument
    residence = get_user_residence(request)
    try:
        doc = AIDocument.objects.get(pk=pk, residence=residence)
    except AIDocument.DoesNotExist:
        return Response(status=404)

    if request.method == "DELETE":
        doc.fichier.delete(save=False)
        doc.delete()
        return Response(status=204)

    if "actif" in request.data:
        doc.actif = request.data["actif"]
        doc.save()
    return Response({"id": doc.id, "nom": doc.nom, "actif": doc.actif})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def ai_config_view(request):
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    cfg = _get_config()

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
    return Response({"detail": "Configuration sauvegardée.", "configured": bool(cfg.api_key)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    try:
        return _ai_chat_inner(request)
    except Exception as exc:
        import traceback
        return Response({"reply": f"Erreur serveur : {exc}\n{traceback.format_exc()[-500:]}"}, status=200)


def _ai_chat_inner(request):
    from .models import AIDocument
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    message = (request.data.get("message") or "").strip()
    history = request.data.get("history") or []
    if not message:
        return Response({"detail": "Message vide."}, status=400)

    cfg = _get_config()

    # 1. Contexte documentaire (PDFs actifs)
    docs = AIDocument.objects.filter(residence=residence, actif=True)
    doc_context = ""
    if docs.exists():
        chunks = []
        for d in docs:
            text = d.texte_extrait[:3000] if d.texte_extrait else ""
            if text:
                chunks.append(f"=== {d.nom} ===\n{text}")
        if chunks:
            doc_context = "\n\n".join(chunks)

    # 2. Contexte métier (résumés backend — jamais données brutes)
    business_ctx = _build_business_context(message.lower(), residence)

    # 3. Prompt système complet
    system = cfg.system_prompt or "Tu es l'assistant IA de Syndic Pro. Réponds en français."
    system += f"\n\nRésidence : {residence.nom_residence}"

    if doc_context:
        system += f"\n\n--- DOCUMENTS DE RÉFÉRENCE ---\n{doc_context}"
    if business_ctx:
        system += f"\n\n--- DONNÉES ACTUELLES DE LA RÉSIDENCE ---\n{business_ctx}"
    system += (
        "\n\nIMPORTANT : Tu ne dois jamais inventer de chiffres ou de faits. "
        "Si tu n'as pas l'information, dis-le clairement. "
        "Quand des données sont fournies dans ce contexte (DONNÉES ACTUELLES), "
        "utilise-les directement pour répondre. Ne mentionne jamais les APIs, "
        "les URLs, la structure de base de données, ni comment les données ont été obtenues. "
        "Présente simplement les informations comme si tu les connaissais naturellement."
    )

    # 4. Appel LLM
    reply = _call_llm(cfg, system, message, history)
    return Response({"reply": reply})
