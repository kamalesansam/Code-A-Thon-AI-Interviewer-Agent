import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

print("--- Available Models for your API Key ---")
for model in client.models.list():
    # We only care about models that can 'generateContent'
    if 'generateContent' in model.supported_actions:
        print(f"Model Name: {model.name}")