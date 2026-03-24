from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_rapport import (
    rapport_financier_json, rapport_financier_excel, rapport_financier_pdf,
    situation_export_excel, situation_export_pdf,
    situation_paiements_view, send_email_view,
)
from .views_comptabilite import (
    journal_view, grand_livre_view, balance_view, cpc_view, bilan_view,
    journal_export_excel, balance_export_excel, cpc_export_excel, bilan_export_excel,
    journal_export_pdf, balance_export_pdf, cpc_export_pdf, bilan_export_pdf,
)
from .views_export import export_excel
from .views_import import import_excel, import_template
from .views_resident import resident_portal_view
from .views_users import (
    residence_users_list,
    residence_user_detail,
    reset_user_password,
    change_own_password,
)
from .views_init import init_complete
from .views import passation_list_create, passation_detail, passation_refresh_caisse, passation_reserves, passation_situation_lots
from .views_archive import archive_list, archive_create, archive_restore
from .views_ai import ai_documents, ai_document_detail, ai_config_view, ai_chat
from .views_vote import (
    resolution_vote_list_create, resolution_vote_detail,
    resolution_vote_envoyer_notifs, resolution_vote_resultats,
    resolution_vote_mes, resolution_vote_accuser, resolution_vote_voter,
)
from .views_notifications import create_notification, resident_notifications_view, mark_notification_read
from .views_messages import messages_list, message_update, message_submit, message_mes, admin_resident_lot
from .views import (
    MandatBureauSyndicalViewSet,
    MandatBureauMembreViewSet,
    TravauxViewSet,
    NotificationViewSet,
    ResidenceViewSet,
    GroupeViewSet,
    LotViewSet,
    PersonneViewSet,
    PaiementViewSet,
    AffectationPaiementViewSet,
    AppelChargeViewSet,
    DetailAppelChargeViewSet,
    CategorieDepenseViewSet,
    FournisseurViewSet,
    CompteComptableViewSet,
    DepenseViewSet,
    FamilleDepenseViewSet,
    ModeleDepenseViewSet,
    CaisseMouvementViewSet,
    RecetteViewSet,
    me_view,
    BureauSyndicalViewSet,
    AssembleeGeneraleViewSet,
    ResolutionViewSet,
    DocumentGouvernanceViewSet,
)

router = DefaultRouter()
router.register(r"residences",              ResidenceViewSet,           basename="residence")
router.register(r"groupes",                 GroupeViewSet,              basename="groupe")
router.register(r"lots",                    LotViewSet,                 basename="lot")
router.register(r"personnes",               PersonneViewSet,            basename="personne")
router.register(r"paiements",               PaiementViewSet,            basename="paiement")
router.register(r"affectations",            AffectationPaiementViewSet, basename="affectation")
router.register(r"appels-charge",           AppelChargeViewSet,         basename="appel-charge")
router.register(r"details-appel",           DetailAppelChargeViewSet,   basename="detail-appel")
router.register(r"categories-depense",      CategorieDepenseViewSet,    basename="categorie-depense")
router.register(r"familles-depense",        FamilleDepenseViewSet,      basename="famille-depense")
router.register(r"modeles-depense",         ModeleDepenseViewSet,       basename="modele-depense")
router.register(r"fournisseurs",            FournisseurViewSet,         basename="fournisseur")
router.register(r"comptes-comptables",      CompteComptableViewSet,     basename="compte-comptable")
router.register(r"depenses",                DepenseViewSet,             basename="depense")

router.register(r"caisse-mouvements",       CaisseMouvementViewSet,     basename="caisse-mouvement")
router.register(r"recettes",                RecetteViewSet,             basename="recette")
router.register(r"bureau-syndical",         BureauSyndicalViewSet,      basename="bureau-syndical")
router.register(r"assemblees",              AssembleeGeneraleViewSet,   basename="assemblee")
router.register(r"resolutions",             ResolutionViewSet,          basename="resolution")
router.register(r"documents-gouvernance",   DocumentGouvernanceViewSet,      basename="document-gouvernance")
router.register(r"mandats-bureau",          MandatBureauSyndicalViewSet,     basename="mandat-bureau")
router.register(r"membres-bureau",          MandatBureauMembreViewSet,        basename="membre-bureau")
router.register(r"travaux",                 TravauxViewSet,                   basename="travaux")
router.register(r"notifications",           NotificationViewSet,              basename="notification")

urlpatterns = [
    path("", include(router.urls)),
    path("api/me/", me_view, name="me"),
    path("rapport-financier/",              rapport_financier_json,  name="rapport-json"),
    path("rapport-financier/export/excel/", rapport_financier_excel, name="rapport-excel"),
    path("rapport-financier/export/pdf/",   rapport_financier_pdf,   name="rapport-pdf"),
    path("situation/export/excel/",         situation_export_excel,       name="situation-excel"),
    path("situation/export/pdf/",           situation_export_pdf,         name="situation-pdf"),
    path("situation-paiements/",            situation_paiements_view,     name="situation-paiements"),
    path("send-email/",                     send_email_view,              name="send-email"),
    path("export/excel/",                   export_excel,            name="export-excel"),
    path("import/excel/",                   import_excel,            name="import-excel"),
    path("import/template/",               import_template,         name="import-template"),
    path("resident/",                       resident_portal_view,    name="resident-portal"),
    path("residence-users/",                residence_users_list,    name="residence-users-list"),
    path("residence-users/<int:pk>/",       residence_user_detail,   name="residence-users-detail"),
    path("residence-users/<int:pk>/reset-password/", reset_user_password, name="residence-users-reset-password"),
    path("change-password/",               change_own_password,     name="change-password"),
    path("init-complete/",                 init_complete,           name="init-complete"),
    path("passations/",                    passation_list_create,   name="passation-list"),
    path("passations/<int:pk>/",           passation_detail,        name="passation-detail"),
    path("passations/<int:pk>/refresh-caisse/", passation_refresh_caisse, name="passation-refresh"),
    path("passations/<int:pk>/reserves/",  passation_reserves,      name="passation-reserves"),
    path("passations/<int:pk>/situation/", passation_situation_lots,name="passation-situation"),
    path("archives/",                      archive_list,            name="archive-list"),
    path("archives/create/",              archive_create,          name="archive-create"),
    path("archives/<int:pk>/restore/",    archive_restore,         name="archive-restore"),
    path("notification-send/",            create_notification,         name="notification-create"),
    path("notification-mes/",             resident_notifications_view, name="resident-notifications"),
    path("notification-read/<int:pk>/",   mark_notification_read,      name="notification-read"),

    # ── Résolutions par vote ─────────────────────────────────
    path("resolutions-vote/",                        resolution_vote_list_create,   name="rv-list"),
    path("resolutions-vote/<int:pk>/",               resolution_vote_detail,        name="rv-detail"),
    path("resolutions-vote/<int:pk>/envoyer-notifs/",resolution_vote_envoyer_notifs,name="rv-notifs"),
    path("resolutions-vote/<int:pk>/resultats/",     resolution_vote_resultats,     name="rv-resultats"),
    path("resolutions-vote/<int:pk>/voter/",         resolution_vote_voter,         name="rv-voter"),
    path("resolutions-vote/<int:pk>/accuser/",       resolution_vote_accuser,       name="rv-accuser"),
    path("resolutions-vote/mes/",                    resolution_vote_mes,           name="rv-mes"),

    # ── Espace résident — messages ────────────────────────────
    path("messages-resident/",            messages_list,       name="messages-resident-list"),
    path("messages-resident/<int:pk>/",   message_update,      name="messages-resident-update"),
    path("messages-resident/submit/",     message_submit,      name="messages-resident-submit"),
    path("messages-resident/mes/",        message_mes,         name="messages-resident-mes"),
    path("resident-lot-preview/<int:lot_id>/", admin_resident_lot, name="admin-resident-lot"),

    # ── Comptabilité ─────────────────────────────────────────
    path("comptabilite/journal/",              journal_view,          name="compta-journal"),
    path("comptabilite/grand-livre/",          grand_livre_view,      name="compta-grand-livre"),
    path("comptabilite/balance/",              balance_view,          name="compta-balance"),
    path("comptabilite/cpc/",                  cpc_view,              name="compta-cpc"),
    path("comptabilite/bilan/",                bilan_view,            name="compta-bilan"),
    path("comptabilite/journal/excel/",        journal_export_excel,  name="compta-journal-excel"),
    path("comptabilite/balance/excel/",        balance_export_excel,  name="compta-balance-excel"),
    path("comptabilite/cpc/excel/",            cpc_export_excel,      name="compta-cpc-excel"),
    path("comptabilite/bilan/excel/",          bilan_export_excel,    name="compta-bilan-excel"),
    path("comptabilite/journal/pdf/",          journal_export_pdf,    name="compta-journal-pdf"),
    path("comptabilite/balance/pdf/",          balance_export_pdf,    name="compta-balance-pdf"),
    path("comptabilite/cpc/pdf/",              cpc_export_pdf,        name="compta-cpc-pdf"),
    path("comptabilite/bilan/pdf/",            bilan_export_pdf,      name="compta-bilan-pdf"),

    # ── Module IA ────────────────────────────────────────────
    path("ai/documents/",           ai_documents,       name="ai-documents"),
    path("ai/documents/<int:pk>/",  ai_document_detail, name="ai-document-detail"),
    path("ai/config/",              ai_config_view,     name="ai-config"),
    path("ai/chat/",                ai_chat,            name="ai-chat"),
]