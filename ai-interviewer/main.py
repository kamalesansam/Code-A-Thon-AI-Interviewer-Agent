import os
import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

# Load the keys from the .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients using environment variables
GROQ_CLIENT = Groq(api_key=os.getenv("GROQ_API_KEY"))
OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]

class TTSRequest(BaseModel):
    text: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        messages = [{
            "role": "system",
            "content": (
                "You are EchoAI, a warm and professional Senior Technical Recruiter. "
                "Conduct a structured interview. Ask ONE short, engaging question at a time. "
                "When the interview is done, start your response with 'Summary Report'."
            )
        }]
        
        for msg in request.history:
            role = "assistant" if msg.role == "ai" else "user"
            messages.append({"role": role, "content": msg.text})
            
        messages.append({"role": "user", "content": request.message})

        completion = GROQ_CLIENT.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
        )

        return {"reply": completion.choices[0].message.content}
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"reply": "Connection glitch. Let's try that again!"}

@app.post("/speech")
async def text_to_speech(request: TTSRequest):
    try:
        # speed=1.15 is the sweet spot for "natural but efficient"
        response = OPENAI_CLIENT.audio.speech.create(
            model="tts-1",
            voice="shimmer", 
            input=request.text,
            speed=1.15
        )
        
        audio_base64 = base64.b64encode(response.content).decode("utf-8")
        return {"audio": audio_base64}
    except Exception as e:
        print(f"TTS Error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)