from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.middleware.csrf import get_token
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from syndic.views import me_view
from syndic.models import Residence, ResidenceMembership

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Identifiants incorrects."}, status=400)
    login(request, user)
    return Response({"detail": "Connecté."})


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({"detail": "Déconnecté."})


@api_view(["POST"])
@permission_classes([AllowAny])
def setup_view(request):
    """Create a new residence with its first admin account (atomic)."""
    nom_residence = (request.data.get("nom_residence") or "").strip()
    ville         = (request.data.get("ville_residence") or "").strip()
    username      = (request.data.get("username") or "").strip()
    password      = request.data.get("password") or ""
    email         = (request.data.get("email") or "").strip()

    errors = {}
    if not nom_residence:
        errors["nom_residence"] = "Le nom de la résidence est obligatoire."
    if not ville:
        errors["ville_residence"] = "La ville est obligatoire."
    if not username:
        errors["username"] = "Le nom d'utilisateur est obligatoire."
    if len(password) < 6:
        errors["password"] = "Le mot de passe doit contenir au moins 6 caractères."
    if not errors and User.objects.filter(username=username).exists():
        errors["username"] = "Ce nom d'utilisateur est déjà pris."
    if not errors and Residence.objects.filter(nom_residence=nom_residence, ville_residence=ville).exists():
        errors["nom_residence"] = "Une résidence avec ce nom existe déjà dans cette ville."
    if errors:
        return Response(errors, status=400)

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password, email=email)
        residence = Residence.objects.create(
            nom_residence=nom_residence,
            ville_residence=ville,
        )
        ResidenceMembership.objects.create(
            user=user,
            residence=residence,
            role="ADMIN",
            actif=True,
        )

    # Auto-login after creation
    authenticated = authenticate(request, username=username, password=password)
    if authenticated:
        login(request, authenticated)

    return Response({"detail": "Résidence créée et compte admin activé."}, status=201)


urlpatterns = [
    path("admin/",      admin.site.urls),
    path("api/",        include("syndic.urls")),
    path("api/me/",     me_view,    name="me"),
    path("api/login/",  login_view, name="login"),
    path("api/csrf/",   csrf_view,  name="csrf"),
    path("api/setup/",  setup_view,  name="setup"),
    path("api/logout/", logout_view, name="logout"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
