# 🤖 Echo-01: Neural Interview Engine

Echo-01 is a high-speed, voice-first AI recruitment platform designed to simulate technical interviews. By combining **Llama 3** for low-latency reasoning and **OpenAI TTS** for human-like speech, Echo-01 provides a realistic, high-pressure environment for candidates to practice their skills.



---

## 🚀 The Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** | High-performance UI & Client-side logic |
| **Backend** | **FastAPI** | High-concurrency API for LLM orchestration |
| **Inference** | **Groq (Llama 3.3)** | Sub-second text response generation |
| **Voice (TTS)** | **OpenAI TTS-1** | Neural, emotional text-to-speech |
| **Auth** | **Clerk** | Secure Google & Email authentication |
| **Styling** | **Tailwind CSS** | Modern, responsive interface design |

---

## ✨ Key Features

* **🎙️ Real-time Voice Interaction:** Low-latency speech synthesis makes the bot feel alive and conversational.
* **🧠 Adaptive Questioning:** Echo-01 tracks conversation history to ask follow-up questions based on your answers.
* **🔐 Secure Sessions:** Clerk-powered authentication ensures personalized experiences and data privacy.
* **📊 Performance Diagnostics:** Receive a detailed "Summary Report" with a score and feedback.
* **⚡ Sub-Second Latency:** Utilizing Groq’s LPU technology to ensure the AI "thinks" faster than a human.

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/kamalesansam/Code-A-Thon-AI-Interviewer-Agent.git
cd Code-A-Thon-AI-Interviewer-Agent
```
Installation & Setup1. 
Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/echo-01-ai-recruiter.git
cd echo-01-ai-recruiter
```

2. Frontend Setup (Next.js)Bash# Install dependencies
```bash
npm install
```

# Run development server
```bash
npm run dev
```

3. Backend Setup (FastAPI)Bashcd ai-interviewer

# Install dependencies
```bash
# Enter the backend folder
cd ai-interviewer

# Install dependencies
pip install fastapi uvicorn groq openai python-dotenv

# Start the server
python main.py
```



# Start the server
python main.py

📝 Roadmap
[x] Initial Voice & Chat Integration

[x] User Authentication (Clerk)

[ ] Resume Parsing: Upload PDF to tailor questions to your background.

[ ] Technical Live Coding: Integrated code editor for real-time problem solving.

[ ] Multi-Voice Support: Choose between different interviewer personalities.


🛡️ License & Security
This project is built for educational purposes.
