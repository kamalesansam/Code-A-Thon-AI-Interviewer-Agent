import os
import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
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

# --- SYSTEM SETTINGS ---
# This ensures the AI behaves like an elite recruiter and uses the correct rubrics.
SYSTEM_BEHAVIOR = (
    "You are ECHO AI, an elite Executive Technical Recruiter. "
    "Your persona: Sophisticated, professional, and rigorous. "
    "\n\nINTERVIEW RULES:"
    "1. Conduct a structured technical and behavioral interview. "
    "2. Ask ONE high-impact question at a time. "
    "3. Do not be overly chatty; stay focused on the candidate's experience. "
    "\n\nEVALUATION RULES:"
    "1. After 4-5 questions, you must conclude the interview. "
    "2. You MUST start your final evaluation message with exactly: [FINAL_REPORT] "
    "3. Evaluate the candidate using the STAR (Situation, Task, Action, Result) "
    "and PAR (Problem, Action, Result) frameworks. "
    "4. Include sections for: TECHNICAL DEPTH, COMMUNICATION, and LEADERSHIP POTENTIAL."
)

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Construct message history
        messages = [{"role": "system", "content": SYSTEM_BEHAVIOR}]
        
        for msg in request.history:
            # Map frontend 'ai' role to 'assistant' for Groq/OpenAI
            role = "assistant" if msg.role == "ai" else "user"
            messages.append({"role": role, "content": msg.text})
            
        # Add current user message
        messages.append({"role": "user", "content": request.message})

        completion = GROQ_CLIENT.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.6, # Lowered slightly for more professional consistency
            max_tokens=1024
        )

        return {"reply": completion.choices[0].message.content}
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"reply": "ECHO AI system error. Connection lost. Please re-transmit."}

@app.post("/speech")
async def text_to_speech(request: TTSRequest):
    try:
        # Using 'shimmer' as requested—it's professional and clear.
        # speed=1.05 for a more measured, executive pace.
        response = OPENAI_CLIENT.audio.speech.create(
            model="tts-1",
            voice="shimmer", 
            input=request.text,
            speed=1.05 
        )
        
        audio_base64 = base64.b64encode(response.content).decode("utf-8")
        return {"audio": audio_base64}
    except Exception as e:
        print(f"TTS Error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)