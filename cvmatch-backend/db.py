# db.py
import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

load_dotenv()

# Fonction pour obtenir une connexion à la base de données
def get_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "cvmatch_db"),
            autocommit=False
        )
        return conn
    except Error as e:
        print("Erreur connexion MySQL:", e)
        return None
