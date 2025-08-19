#!/usr/bin/env python3
"""
Script de test pour vérifier l'API OpenAI
"""

import os
from dotenv import load_dotenv
from openai import OpenAI

# Charger les variables d'environnement
load_dotenv()

def test_openai():
    try:
        # Récupérer l'API key
        api_key = os.getenv("OPENAI_API_KEY")
        print(f"API Key trouvée: {'Oui' if api_key else 'Non'}")
        
        if not api_key:
            print(" Erreur: API key non trouvée dans le fichier .env")
            return False
        
        # Créer le client OpenAI
        client = OpenAI(api_key=api_key)
        
        # Test simple
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Dis-moi bonjour en français"}
            ],
            max_tokens=50
        )
        
        print(" Test réussi!")
        print(f"Réponse: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        return False

if __name__ == "__main__":
    print(" Test de l'API OpenAI...")
    test_openai()
