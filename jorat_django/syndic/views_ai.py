"""
Module IA — Jorat Syndic Pro
Endpoints : documents PDF, configuration, chat.
Le LLM n'accède jamais directement à la base de données.
"""
import json
import re
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
    """
    Génère un résumé structuré des données réelles selon la question posée.
    Chaque bloc est protégé par try/except — une erreur n'interrompt pas les autres.
    Le LLM ne reçoit que des résumés texte, jamais de données brutes ni de structure SQL.
    """
    from django.db.models import Sum as S, Q as Qd
    parts = []

    # ── Dictionnaire des mots-clés par domaine ─────────────────────────────
    KW = {
        "caisse": [
            "caisse", "solde", "trésorerie", "balance", "argent",
            "disponible", "encaissé", "encaisse", "liquidité",
        ],
        "lots": [
            "lot", "propriétaire", "copropriétaire", "impayé", "impayés",
            "dette", "dettes", "retard", "paiement", "paiements",
            "doit", "situation", "arriéré", "arriérés", "recouvrement",
            "relance", "pas payé", "en défaut", "reste à payer", "reste dû",
            "qui n'a pas payé", "solde lot",
        ],
        "depenses": [
            "dépense", "dépenses", "fournisseur", "facture", "coût",
            "frais", "dépensé", "sortie", "charge",
        ],
        "recettes": [
            "recette", "recettes", "entrée", "revenu", "produit",
        ],
        "appels": [
            "appel", "appels", "appel de charge", "appel de fond",
            "exercice", "tantième", "répartition",
        ],
        "bureau": [
            "bureau", "membres", "président", "vice-président", "trésorier",
            "secrétaire", "syndic", "mandat", "conseil syndical",
        ],
        "ag": [
            "assemblée", "ag", "assemblée générale", "ordre du jour",
            "procès-verbal", "pv",
        ],
        "resolutions": [
            "résolution", "résolutions", "adopté", "rejeté", "vote",
            "délibération", "décision",
        ],
        "votes_ligne": [
            "vote en ligne", "vote électronique", "résultat vote",
            "oui", "non", "neutre", "clôturé", "scrutin",
        ],
        "passation": [
            "passation", "passation de consigne", "consigne",
            "syndic sortant", "syndic entrant", "remise",
        ],
        "loi": [
            "loi", "article", "légal", "légalement", "juridique", "droit",
            "18-00", "1800", "copropriété", "statut", "règlement",
            "parties communes", "parties privatives", "quote-part",
            "tantième", "assemblée générale obligatoire", "convocation légale",
            "charges légales", "syndicat", "règles", "obligations", "droits",
        ],
        "rapport": [
            "rapport", "rapport financier", "taux de recouvrement",
            "bilan", "kpi", "résumé financier", "global",
        ],
        "fournisseurs": [
            "fournisseur", "fournisseurs", "prestataire", "prestataires",
            "entreprise", "societe", "société", "contact", "telephone",
        ],
        "contrats": [
            "contrat", "contrats", "contrat de service", "prestation",
            "montant contrat", "durée contrat", "renouvellement",
        ],
        "personnes": [
            "personne", "personnes", "propriétaire", "copropriétaire",
            "résident", "résidents", "habitant", "occupant", "nom",
            "prénom", "contact", "téléphone", "email", "liste des",
        ],
        "groupes": [
            "groupe", "groupes", "bâtiment", "bâtiments", "bloc", "blocs",
            "tour", "tours", "immeuble",
        ],
        "modeles": [
            "modèle", "modèles", "modèle de dépense", "gabarit",
        ],
        "categories": [
            "catégorie", "catégories", "famille", "familles", "type de dépense",
        ],
    }

    def _match(keys):
        return any(k in message_lower for k in keys)

    # ── 0. BASELINE — toujours envoyé (vue d'ensemble de toutes les données) ─
    try:
        from .models import (
            Lot, Groupe, CaisseMouvement, Depense, Recette,
            Paiement, AppelCharge, Fournisseur, Contrat,
        )
        nb_lots      = Lot.objects.filter(residence=residence).count()
        nb_groupes   = Groupe.objects.filter(residence=residence).count()
        nb_personnes = Lot.objects.filter(residence=residence, proprietaire__isnull=False).values("proprietaire").distinct().count()
        nb_depenses  = Depense.objects.filter(residence=residence).count()
        nb_recettes  = Recette.objects.filter(residence=residence).count()
        nb_paiements = Paiement.objects.filter(lot__residence=residence).count()
        nb_appels    = AppelCharge.objects.filter(residence=residence).count()
        nb_fournis   = Fournisseur.objects.filter(residence=residence).count()
        nb_contrats  = Contrat.objects.filter(residence=residence).count()
        agg_caisse   = CaisseMouvement.objects.filter(residence=residence).aggregate(
            e=S("montant", filter=Qd(sens="DEBIT")), s=S("montant", filter=Qd(sens="CREDIT"))
        )
        solde = float(agg_caisse["e"] or 0) - float(agg_caisse["s"] or 0)
        total_dep = float(Depense.objects.filter(residence=residence).aggregate(t=S("montant"))["t"] or 0)
        total_pay = float(Paiement.objects.filter(lot__residence=residence).aggregate(t=S("montant"))["t"] or 0)
        parts.append(
            f"RÉSUMÉ GÉNÉRAL — {residence.nom_residence} :\n"
            f"  Lots : {nb_lots} · Groupes : {nb_groupes} · Copropriétaires : {nb_personnes}\n"
            f"  Solde caisse : {solde:,.2f} MAD · Dépenses : {total_dep:,.2f} MAD · Paiements encaissés : {total_pay:,.2f} MAD\n"
            f"  Enregistrements — Dépenses : {nb_depenses} · Recettes : {nb_recettes} · Paiements : {nb_paiements}\n"
            f"  Appels de charge/fond : {nb_appels} · Fournisseurs : {nb_fournis} · Contrats : {nb_contrats}"
        )
    except Exception:
        pass

    # ── 1. CAISSE ──────────────────────────────────────────────────────────
    if _match(KW["caisse"]) or _match(KW["rapport"]):
        try:
            from .models import CaisseMouvement
            agg = CaisseMouvement.objects.filter(residence=residence).aggregate(
                entrees=S("montant", filter=Qd(sens="DEBIT")),
                sorties=S("montant", filter=Qd(sens="CREDIT")),
            )
            entrees = float(agg["entrees"] or 0)
            sorties = float(agg["sorties"] or 0)
            solde   = entrees - sorties
            nb      = CaisseMouvement.objects.filter(residence=residence).count()
            parts.append(
                f"CAISSE — {residence.nom_residence} :\n"
                f"  Solde actuel   : {solde:,.2f} MAD\n"
                f"  Total entrées  : {entrees:,.2f} MAD\n"
                f"  Total sorties  : {sorties:,.2f} MAD\n"
                f"  Nb mouvements  : {nb}"
            )
        except Exception:
            pass

    # ── 2. LOTS / PAIEMENTS / IMPAYÉS ─────────────────────────────────────
    if _match(KW["lots"]):
        try:
            from .models import Lot
            lots = Lot.objects.filter(residence=residence).select_related("proprietaire", "groupe")
            impayes, a_jour = [], []
            total_du_global = total_pay_global = 0.0

            for lot in lots:
                total_du  = float(lot.details_appels.aggregate(s=S("montant"))["s"] or 0)
                total_pay = float(lot.paiements.aggregate(s=S("montant"))["s"] or 0)
                reste     = total_du - total_pay
                total_du_global  += total_du
                total_pay_global += total_pay
                prop     = lot.proprietaire
                nom_prop = f"{prop.nom} {prop.prenom}".strip() if prop else "Propriétaire inconnu"
                groupe   = lot.groupe.nom_groupe if lot.groupe else ""
                entry = (
                    f"  • Lot {lot.numero_lot}"
                    + (f" ({groupe})" if groupe else "")
                    + f" — {nom_prop}"
                    + f" — Dû : {total_du:,.0f} | Payé : {total_pay:,.0f} | Reste : {reste:,.0f} MAD"
                )
                (impayes if reste > 0 else a_jour).append(entry)

            taux = (total_pay_global / total_du_global * 100) if total_du_global else 0
            lines = [
                f"SITUATION DES LOTS — {residence.nom_residence} :",
                f"  Total dû : {total_du_global:,.0f} MAD | Total payé : {total_pay_global:,.0f} MAD"
                f" | Taux recouvrement : {taux:.1f}%",
            ]
            if impayes:
                lines.append(f"\nLOTS AVEC IMPAYÉS ({len(impayes)}) :")
                lines.extend(impayes)
            else:
                lines.append("\nAucun lot avec impayés — tous les lots sont à jour.")
            if a_jour:
                lines.append(f"\nLOTS À JOUR ({len(a_jour)}) :")
                lines.extend(a_jour)
            parts.append("\n".join(lines))
        except Exception:
            pass

    # ── 3. DÉPENSES ────────────────────────────────────────────────────────
    if _match(KW["depenses"]):
        try:
            from .models import Depense
            agg   = Depense.objects.filter(residence=residence).aggregate(total=S("montant"))
            total = float(agg["total"] or 0)
            count = Depense.objects.filter(residence=residence).count()
            # 5 dernières dépenses
            recentes = Depense.objects.filter(residence=residence).order_by("-date_depense")[:5]
            lignes = [f"DÉPENSES — {residence.nom_residence} :"]
            lignes.append(f"  {count} dépenses — total {total:,.2f} MAD")
            if recentes:
                lignes.append("  Dernières dépenses :")
                for d in recentes:
                    lignes.append(
                        f"    • {d.date_depense.strftime('%d/%m/%Y') if d.date_depense else '?'}"
                        f" — {d.libelle} — {float(d.montant):,.2f} MAD"
                    )
            parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 4. RECETTES ────────────────────────────────────────────────────────
    if _match(KW["recettes"]):
        try:
            from .models import Recette
            agg   = Recette.objects.filter(residence=residence).aggregate(total=S("montant"))
            total = float(agg["total"] or 0)
            count = Recette.objects.filter(residence=residence).count()
            recentes = Recette.objects.filter(residence=residence).order_by("-date_recette")[:5]
            lignes = [f"RECETTES — {residence.nom_residence} :"]
            lignes.append(f"  {count} recettes — total {total:,.2f} MAD")
            if recentes:
                lignes.append("  Dernières recettes :")
                for r in recentes:
                    lignes.append(
                        f"    • {r.date_recette.strftime('%d/%m/%Y') if r.date_recette else '?'}"
                        f" — {r.libelle} — {float(r.montant):,.2f} MAD"
                    )
            parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 5. APPELS DE CHARGE / FOND ─────────────────────────────────────────
    if _match(KW["appels"]):
        try:
            from .models import AppelCharge
            for type_c, label in [("CHARGE", "charges"), ("FOND", "fonds")]:
                appels = AppelCharge.objects.filter(
                    residence=residence, type_charge=type_c
                ).order_by("-exercice")[:3]
                if appels.exists():
                    lignes = [f"APPELS DE {label.upper()} (3 derniers) :"]
                    for a in appels:
                        nb_lots = a.details.count() if hasattr(a, "details") else "?"
                        lignes.append(
                            f"  • Exercice {a.exercice}"
                            + (f" — {a.description}" if getattr(a, "description", None) else "")
                            + f" — {nb_lots} lots"
                        )
                    parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 6. BUREAU SYNDICAL ─────────────────────────────────────────────────
    if _match(KW["bureau"]):
        try:
            from .models import MandatBureauSyndical, MandatBureauMembre
            mandat = (
                MandatBureauSyndical.objects
                .filter(residence=residence, actif=True)
                .order_by("-date_debut")
                .first()
            ) or (
                MandatBureauSyndical.objects
                .filter(residence=residence)
                .order_by("-date_debut")
                .first()
            )
            if mandat:
                membres = MandatBureauMembre.objects.filter(mandat=mandat).select_related("personne")
                lignes = [
                    f"BUREAU SYNDICAL {'ACTIF' if mandat.actif else 'DERNIER'} — {residence.nom_residence} :",
                    f"  Mandat : {mandat.date_debut} → {mandat.date_fin or 'en cours'}",
                ]
                if membres.exists():
                    lignes.append("  Membres :")
                    for m in membres:
                        nom = (
                            f"{m.personne.nom} {m.personne.prenom}".strip()
                            if m.personne else "Inconnu"
                        )
                        lignes.append(f"    • {m.get_fonction_display()} : {nom}")
                else:
                    lignes.append("  Aucun membre enregistré.")
                parts.append("\n".join(lignes))
            else:
                parts.append(f"BUREAU SYNDICAL : Aucun mandat enregistré pour {residence.nom_residence}.")
        except Exception:
            pass

    # ── 7. ASSEMBLÉES GÉNÉRALES ────────────────────────────────────────────
    if _match(KW["ag"]):
        try:
            from .models import AssembleeGenerale
            ags = AssembleeGenerale.objects.filter(
                residence=residence
            ).order_by("-date_ag")[:5]
            if ags.exists():
                lignes = [f"ASSEMBLÉES GÉNÉRALES — {residence.nom_residence} (5 dernières) :"]
                for ag in ags:
                    lignes.append(
                        f"  • {ag.date_ag.strftime('%d/%m/%Y') if ag.date_ag else '?'}"
                        f" — {ag.type_ag} — {ag.statut}"
                    )
                parts.append("\n".join(lignes))
            else:
                parts.append(f"ASSEMBLÉES GÉNÉRALES : Aucune AG enregistrée.")
        except Exception:
            pass

    # ── 8. RÉSOLUTIONS AG ─────────────────────────────────────────────────
    if _match(KW["resolutions"]) and not _match(KW["votes_ligne"]):
        try:
            from .models import Resolution
            resols = Resolution.objects.filter(
                assemblee__residence=residence
            ).order_by("-assemblee__date_ag")[:10]
            if resols.exists():
                adoptees = [r for r in resols if r.resultat == "Adoptée"]
                rejetees = [r for r in resols if r.resultat == "Rejetée"]
                lignes = [
                    f"RÉSOLUTIONS AG — {residence.nom_residence} :",
                    f"  {resols.count()} résolutions récentes — {len(adoptees)} adoptées, {len(rejetees)} rejetées",
                ]
                for r in resols[:5]:
                    lignes.append(
                        f"  • {r.titre} — {r.resultat}"
                        + (f" (Pour : {r.voix_pour}, Contre : {r.voix_contre})" if r.voix_pour else "")
                    )
                parts.append("\n".join(lignes))
            else:
                parts.append("RÉSOLUTIONS AG : Aucune résolution enregistrée.")
        except Exception:
            pass

    # ── 9. VOTES EN LIGNE ─────────────────────────────────────────────────
    if _match(KW["votes_ligne"]) or _match(KW["resolutions"]):
        try:
            from .models import ResolutionVote
            votes = ResolutionVote.objects.filter(
                residence=residence
            ).order_by("-date_cloture_vote")[:10]
            if votes.exists():
                lignes = [f"VOTES EN LIGNE — {residence.nom_residence} :"]
                for v in votes:
                    total = (v.nb_oui or 0) + (v.nb_non or 0) + (v.nb_neutre or 0)
                    statut_label = getattr(v, "statut_calcule", None) or v.statut if hasattr(v, "statut") else "?"
                    lignes.append(
                        f"  • {v.intitule}"
                        + (f" [{statut_label}]" if statut_label else "")
                        + (
                            f" — Résultats : {v.nb_oui} OUI / {v.nb_non} NON / {v.nb_neutre} Neutre"
                            f" ({total} votants)"
                            if total > 0 else " — Aucun vote enregistré"
                        )
                    )
                parts.append("\n".join(lignes))
            else:
                parts.append("VOTES EN LIGNE : Aucun vote en ligne enregistré.")
        except Exception:
            pass

    # ── 10. PASSATION DE CONSIGNES ────────────────────────────────────────
    if _match(KW["passation"]):
        try:
            from .models import PassationConsignes
            passation = (
                PassationConsignes.objects
                .filter(residence=residence)
                .order_by("-date_passation")
                .first()
            )
            if passation:
                parts.append(
                    f"PASSATION DE CONSIGNES — {residence.nom_residence} :\n"
                    f"  Date          : {passation.date_passation.strftime('%d/%m/%Y') if passation.date_passation else '?'}\n"
                    f"  Syndic sortant : {passation.nom_syndic_sortant or '?'}\n"
                    f"  Syndic entrant : {passation.nom_syndic_entrant or '?'}\n"
                    f"  Trésorier sortant : {passation.nom_tresorier_sortant or '?'}\n"
                    f"  Trésorier entrant : {passation.nom_tresorier_entrant or '?'}\n"
                    f"  Solde caisse  : {float(passation.solde_caisse or 0):,.2f} MAD\n"
                    f"  Solde banque  : {float(passation.solde_banque or 0):,.2f} MAD"
                )
            else:
                parts.append("PASSATION : Aucune passation de consignes enregistrée.")
        except Exception:
            pass

    # ── 11. RAPPORT FINANCIER GLOBAL ──────────────────────────────────────
    if _match(KW["rapport"]):
        try:
            from .models import Lot, Paiement, Depense, Recette, CaisseMouvement
            nb_lots       = Lot.objects.filter(residence=residence).count()
            total_depenses = float(Depense.objects.filter(residence=residence).aggregate(s=S("montant"))["s"] or 0)
            total_recettes = float(Recette.objects.filter(residence=residence).aggregate(s=S("montant"))["s"] or 0)

            # Taux recouvrement global
            from .models import DetailAppelCharge
            total_du  = float(DetailAppelCharge.objects.filter(lot__residence=residence).aggregate(s=S("montant"))["s"] or 0)
            total_pay = float(Paiement.objects.filter(lot__residence=residence).aggregate(s=S("montant"))["s"] or 0)
            taux = (total_pay / total_du * 100) if total_du else 0

            # Solde caisse
            agg = CaisseMouvement.objects.filter(residence=residence).aggregate(
                e=S("montant", filter=Qd(sens="DEBIT")),
                s=S("montant", filter=Qd(sens="CREDIT")),
            )
            solde = float(agg["e"] or 0) - float(agg["s"] or 0)

            parts.append(
                f"RAPPORT FINANCIER GLOBAL — {residence.nom_residence} :\n"
                f"  Lots             : {nb_lots}\n"
                f"  Solde caisse     : {solde:,.2f} MAD\n"
                f"  Total encaissé   : {total_pay:,.2f} MAD\n"
                f"  Total dépensé    : {total_depenses:,.2f} MAD\n"
                f"  Autres recettes  : {total_recettes:,.2f} MAD\n"
                f"  Total dû (appels): {total_du:,.2f} MAD\n"
                f"  Taux recouvrement: {taux:.1f}%"
            )
        except Exception:
            pass

    # ── 12. FOURNISSEURS ──────────────────────────────────────────────────
    if _match(KW["fournisseurs"]) or _match(KW["contrats"]):
        try:
            from .models import Fournisseur
            fournis = Fournisseur.objects.filter(residence=residence).order_by("nom")
            if fournis.exists():
                lignes = [f"FOURNISSEURS — {residence.nom_residence} ({fournis.count()}) :"]
                for f in fournis:
                    ligne = f"  • {f.nom}"
                    if getattr(f, "telephone", None): ligne += f" — Tél : {f.telephone}"
                    if getattr(f, "email", None):     ligne += f" — Email : {f.email}"
                    if getattr(f, "categorie", None): ligne += f" — Catégorie : {f.categorie}"
                    lignes.append(ligne)
                parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 13. CONTRATS ──────────────────────────────────────────────────────
    if _match(KW["contrats"]):
        try:
            from .models import Contrat
            contrats = Contrat.objects.filter(residence=residence).select_related("fournisseur").order_by("-date_debut")
            if contrats.exists():
                lignes = [f"CONTRATS — {residence.nom_residence} ({contrats.count()}) :"]
                for c in contrats:
                    fnom = c.fournisseur.nom if getattr(c, "fournisseur", None) and c.fournisseur else "?"
                    montant = f" — {float(c.montant):,.2f} MAD" if getattr(c, "montant", None) else ""
                    debut   = str(c.date_debut) if getattr(c, "date_debut", None) else "?"
                    fin     = str(c.date_fin) if getattr(c, "date_fin", None) else "en cours"
                    lignes.append(f"  • {c.libelle} — {fnom}{montant} — {debut} → {fin}")
                parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 14. COPROPRIÉTAIRES / PERSONNES ──────────────────────────────────
    if _match(KW["personnes"]):
        try:
            from .models import Lot
            lots = (Lot.objects.filter(residence=residence)
                    .select_related("proprietaire", "representant")
                    .order_by("numero_lot"))
            lignes = [f"COPROPRIÉTAIRES — {residence.nom_residence} ({lots.count()} lots) :"]
            for l in lots:
                p = l.proprietaire or l.representant
                if p:
                    nom = f"{p.nom} {p.prenom or ''}".strip()
                    tel   = p.telephone or ""
                    email = p.email or ""
                    ligne = f"  • Lot {l.numero_lot} — {nom}"
                    if tel:   ligne += f" — Tél : {tel}"
                    if email: ligne += f" — Email : {email}"
                else:
                    ligne = f"  • Lot {l.numero_lot} — (aucun propriétaire)"
                lignes.append(ligne)
            parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 15. GROUPES / BÂTIMENTS ───────────────────────────────────────────
    if _match(KW["groupes"]):
        try:
            from .models import Groupe, Lot
            groupes = Groupe.objects.filter(residence=residence).order_by("nom_groupe")
            if groupes.exists():
                lignes = [f"GROUPES/BÂTIMENTS — {residence.nom_residence} :"]
                for g in groupes:
                    nb = Lot.objects.filter(groupe=g).count()
                    lignes.append(f"  • {g.nom_groupe} — {nb} lot(s)")
                parts.append("\n".join(lignes))
        except Exception:
            pass

    # ── 16. CATÉGORIES DE DÉPENSE ─────────────────────────────────────────
    if _match(KW["categories"]) or _match(KW["modeles"]):
        try:
            from .models import CategorieDepense
            cats = CategorieDepense.objects.filter(residence=residence).order_by("nom")
            if cats.exists():
                lignes = [f"CATÉGORIES DE DÉPENSE ({cats.count()}) :"]
                for c in cats:
                    lignes.append(f"  • {c.nom}" + (f" — {c.famille}" if getattr(c, "famille", None) else ""))
                parts.append("\n".join(lignes))
        except Exception:
            pass

    return "\n\n".join(parts)


def _call_llm(cfg, system_msg, user_msg, history=None):
    """Appelle l'API LLM (OpenAI-compatible) et retourne le texte de réponse."""
    if not cfg.api_key:
        return (
            "⚠️ L'IA n'est pas encore configurée. "
            "Veuillez ajouter une clé API dans Paramétrage → IA."
        )

    # Historique : max 3 échanges (6 messages) tronqués à 400 chars chacun
    messages = [{"role": "system", "content": system_msg}]
    if history:
        for h in history[-6:]:
            content = (h.get("content") or "")[:400]
            messages.append({"role": h["role"], "content": content})
    messages.append({"role": "user", "content": user_msg[:1_500]})

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
        path     = parsed.path.rstrip("/") or "/"
        if not path.endswith("/chat/completions"):
            path += "/chat/completions"
        if parsed.query:
            path += "?" + parsed.query
        body = json.dumps(payload).encode("utf-8")
        conn.request("POST", path, body=body, headers=headers)
        resp = conn.getresponse()
        raw  = resp.read().decode("utf-8")
        conn.close()
        if resp.status == 429:
            return (
                "⚠️ Quota API dépassé (erreur 429).\n\n"
                "Solutions :\n"
                "• Attendez 1 minute puis réessayez (limite : 15 req/min sur le tier gratuit Gemini)\n"
                "• Si la limite journalière est atteinte (1 500 req/jour), réessayez demain\n"
                "• Ou passez sur Groq (gratuit, sans quota strict) : console.groq.com → API Keys"
            )
        if resp.status != 200:
            return f"Erreur API ({resp.status}) : {raw[:300]}"
        return json.loads(raw)["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Erreur de connexion : {e}"


# ── Dossier documentation application ─────────────────────────────────────
import os as _os
from django.conf import settings as _settings
_DOCS_DIR = _os.path.join(str(_settings.BASE_DIR), "docs")

# Nom lisible pour chaque fichier .md (fallback : stem title-cased)
_DOC_NAMES = {
    "documentation_jorat_ia": "Documentation Syndic Pro — Guide complet",
    "loi1800":                 "Loi n°18-00 — Statut de la copropriété (Maroc)",
}


def _md_files():
    """Retourne la liste des fichiers .md dans _DOCS_DIR."""
    if not _os.path.isdir(_DOCS_DIR):
        return []
    return [
        f for f in _os.listdir(_DOCS_DIR)
        if f.endswith(".md") and _os.path.isfile(_os.path.join(_DOCS_DIR, f))
    ]


# ── Views ──────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_load_app_docs(request):
    """
    Lit tous les fichiers .md du dossier docs/ et les charge comme AIDocuments actifs.
    - Superuser → charge pour TOUTES les résidences
    - Admin normal → charge pour sa résidence uniquement
    """
    from .models import AIDocument, Residence

    fichiers = _md_files()
    if not fichiers:
        return Response({"detail": f"Aucun fichier .md trouvé dans : {_DOCS_DIR}"}, status=404)

    # Lire tous les fichiers
    docs_data = []
    for fname in fichiers:
        stem = fname[:-3]  # retirer .md
        nom  = _DOC_NAMES.get(stem) or stem.replace("_", " ").replace("-", " ").title()
        path = _os.path.join(_DOCS_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            texte = f.read()
        docs_data.append({"nom": nom, "texte": texte, "fichier": fname})

    def _upsert_docs(residence):
        nb_created = nb_updated = 0
        for d in docs_data:
            _, created = AIDocument.objects.update_or_create(
                residence=residence,
                nom=d["nom"],
                defaults={"texte_extrait": d["texte"], "actif": True},
            )
            if created:
                nb_created += 1
            else:
                nb_updated += 1
        return nb_created, nb_updated

    # Superuser : charge pour la résidence ciblée (residence_id en param) ou toutes
    if request.user.is_superuser:
        rid = request.data.get("residence_id") or request.query_params.get("residence_id")
        if rid:
            try:
                residences = [Residence.objects.get(pk=rid)]
            except Residence.DoesNotExist:
                return Response({"detail": "Résidence introuvable."}, status=400)
        else:
            residences = list(Residence.objects.all())
        if not residences:
            return Response({"detail": "Aucune résidence dans la base."}, status=400)
        total_created = total_updated = 0
        for res in residences:
            c, u = _upsert_docs(res)
            total_created += c; total_updated += u
        return Response({
            "detail": (
                f"{len(docs_data)} fichier(s) chargé(s) pour {len(residences)} résidence(s) "
                f"({total_created} créés, {total_updated} mis à jour)."
            ),
            "fichiers": [d["fichier"] for d in docs_data],
        })

    # Admin normal : charger pour sa résidence
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence assignée à ce compte."}, status=400)

    nb_created, nb_updated = _upsert_docs(residence)
    return Response({
        "detail": f"{len(docs_data)} fichier(s) chargé(s) ({nb_created} créés, {nb_updated} mis à jour).",
        "fichiers": [d["fichier"] for d in docs_data],
        "nb_created": nb_created,
        "nb_updated": nb_updated,
    })


def _doc_to_dict(d):
    return {
        "id":           d.id,
        "nom":          d.nom,
        "actif":        d.actif,
        "date_upload":  d.created_at.strftime("%Y-%m-%d %H:%M"),
        "taille_texte": len(d.texte_extrait),
        "residence_nom": d.residence.nom_residence if d.residence else "—",
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def ai_documents(request):
    from .models import AIDocument, Residence

    # ── Superuser : scoper à residence_id si fourni, sinon toutes ──
    if request.user.is_superuser:
        if request.method == "GET":
            rid = request.query_params.get("residence_id")
            qs  = AIDocument.objects.select_related("residence")
            if rid:
                qs = qs.filter(residence_id=rid)
            docs = qs.all()
            return Response([_doc_to_dict(d) for d in docs])
        # POST superuser : upload pour toutes les résidences
        fichier = request.FILES.get("fichier")
        nom     = request.data.get("nom", fichier.name.replace(".pdf", "") if fichier else "Document")
        if not fichier:
            return Response({"detail": "Fichier requis."}, status=400)
        texte = _extract_pdf_text(fichier)
        created_docs = []
        for res in Residence.objects.all():
            doc = AIDocument.objects.create(residence=res, nom=nom, texte_extrait=texte)
            created_docs.append(_doc_to_dict(doc))
        return Response(created_docs, status=201)

    # ── Admin normal : sa résidence uniquement ──
    residence = get_user_residence(request)
    if not residence:
        return Response({"detail": "Aucune résidence."}, status=400)

    if request.method == "GET":
        docs = AIDocument.objects.filter(residence=residence)
        return Response([_doc_to_dict(d) for d in docs])

    fichier = request.FILES.get("fichier")
    nom     = request.data.get("nom", fichier.name.replace(".pdf", "") if fichier else "Document")
    if not fichier:
        return Response({"detail": "Fichier requis."}, status=400)
    texte = _extract_pdf_text(fichier)
    doc   = AIDocument.objects.create(residence=residence, nom=nom, fichier=fichier, texte_extrait=texte)
    return Response(_doc_to_dict(doc), status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def ai_document_detail(request, pk):
    from .models import AIDocument
    try:
        # Superuser peut accéder à n'importe quel document
        if request.user.is_superuser:
            doc = AIDocument.objects.get(pk=pk)
        else:
            residence = get_user_residence(request)
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
    # Config globale — pas de vérification de résidence requise
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


# ── Budget prompt (chars ≈ tokens × 4) ────────────────────────────────────
# Objectif : rester sous ~4 000 tokens = ~16 000 chars pour le prompt système.
# L'historique et le message user sont gérés séparément dans _call_llm.
_BUDGET_SYSTEM_BASE = 1_200   # prompt de base + nom résidence + instructions
_BUDGET_DOCS        = 8_000   # chunks PDF pertinents — équilibre qualité/quota (Groq 8k+, Gemini gratuit)
_BUDGET_BUSINESS    = 5_000   # données live DB (baseline + handlers étendus)
# Total système ≈ 18 700 chars ≈ 4 675 tokens — safe pour llama-3.1-8b (8192t) et Gemini Flash (1M)


def _keyword_score(text, words):
    """Compte combien de mots-clés apparaissent dans le texte."""
    t = text.lower()
    return sum(1 for w in words if w in t)


def _select_doc_chunks(doc_text, user_words, budget, max_chunks=10):
    """
    Découpe le document en sections (par double saut de ligne ou ## titre),
    note chaque section selon la pertinence, retourne les meilleures
    sections dans la limite du budget (chars).
    """
    # Découpe prioritaire : titres markdown, puis articles de loi, puis paragraphes
    import re
    raw = re.split(r'\n(?=#{1,3} )', doc_text)
    if len(raw) == 1:
        # Tente le découpage par "Article X :" (lois, règlements)
        raw = re.split(r'(?=\bArticle\s+\d+\s*:)', doc_text)
    if len(raw) == 1:
        raw = [c.strip() for c in doc_text.split("\n\n") if c.strip()]

    if not raw:
        return doc_text[:budget]

    # Évaluation de pertinence
    scored = sorted(raw, key=lambda c: -_keyword_score(c, user_words))

    selected, total = [], 0
    for chunk in scored[:max_chunks]:
        chunk = chunk.strip()
        if not chunk:
            continue
        if total + len(chunk) > budget:
            remaining = budget - total
            if remaining > 200:
                selected.append(chunk[:remaining] + "…")
            break
        selected.append(chunk)
        total += len(chunk)
        if total >= budget:
            break

    return "\n\n".join(selected) if selected else doc_text[:budget]


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

    # Mots-clés extraits de la question (pour la sélection de chunks pertinents)
    msg_lower  = message.lower()
    # Inclure les nombres et mots courts (len > 1) pour capturer "13", "art", etc.
    user_words = [w for w in re.sub(r'[^\w\s]', ' ', msg_lower).split() if len(w) > 1]
    # Ajouter les références "article N" comme token composite
    for m in re.finditer(r'article\s+(\d+)', msg_lower):
        user_words.append(f"article {m.group(1)}")
        user_words.append(m.group(1))  # numéro seul aussi

    # ── 1. Chunks PDF pertinents ──────────────────────────────────────────
    docs = AIDocument.objects.filter(residence=residence, actif=True)
    doc_context = ""
    if docs.exists():
        doc_list = list(docs)
        # Budget réparti entre les docs actifs (max 3 docs pris en compte)
        nb_docs   = min(len(doc_list), 3)
        per_doc   = _BUDGET_DOCS // nb_docs
        chunks    = []
        # Trier les docs par pertinence (ceux dont le nom correspond à la question d'abord)
        doc_list.sort(key=lambda d: -_keyword_score(d.nom, user_words))
        for d in doc_list[:nb_docs]:
            text = _select_doc_chunks(d.texte_extrait or "", user_words, per_doc)
            if text:
                chunks.append(f"=== {d.nom} ===\n{text}")
        if chunks:
            doc_context = "\n\n".join(chunks)

    # ── 2. Données métier live (tronquées au budget) ──────────────────────
    business_ctx = _build_business_context(msg_lower, residence)[:_BUDGET_BUSINESS]

    # ── 3. Prompt système assemblé ────────────────────────────────────────
    system = (cfg.system_prompt or "Tu es l'assistant IA de Syndic Pro. Réponds en français.")
    system = system[:_BUDGET_SYSTEM_BASE]
    system += f"\nRésidence : {residence.nom_residence}"

    if doc_context:
        system += f"\n\n--- DOCUMENTS DE RÉFÉRENCE ---\n{doc_context}"
    if business_ctx:
        system += f"\n\n--- DONNÉES ACTUELLES DE LA RÉSIDENCE ---\n{business_ctx}"
    system += (
        "\n\nIMPORTANT : Utilise les données fournies ci-dessus pour répondre directement. "
        "Ne mentionne jamais les APIs, URLs ou structure de base de données. "
        "N'invente aucun chiffre. Si l'information manque, dis-le clairement."
    )

    # ── 4. Appel LLM ──────────────────────────────────────────────────────
    reply = _call_llm(cfg, system, message, history)
    return Response({"reply": reply})
