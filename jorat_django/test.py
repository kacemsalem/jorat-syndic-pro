import psycopg2
from psycopg2 import OperationalError
try:
    conn = psycopg2.connect(
        dbname="syndic_db",
        user="openpg",
        password="bhr7777777",
        host="localhost",   # ou l'adresse de ton serveur PostgreSQL
        port="5432"         # port par
    )
    print("Connexion réussie ✅")
    conn.close()
except OperationalError as e:
    print("Erreur de connexion ❌")
    print(e)
