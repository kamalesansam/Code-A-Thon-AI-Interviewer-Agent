"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";

const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function Home() {
  const { user, isLoaded } = useUser();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalReport, setFinalReport] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  // --- VOICE SYSTEM (OpenAI TTS via FastAPI) ---
  const speak = async (text) => {
    try {
      const response = await axios.post("http://localhost:8000/speech", { text });
      const audioData = response.data.audio;
      const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
      audio.play().catch(e => console.error("Audio Playback Error:", e));
    } catch (error) {
      console.error("Speech Generation Error:", error);
    }
  };

  // --- SPEECH-TO-TEXT (Microphone) ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setMessage(e.results[0][0].transcript);
    recognition.start();
  };

  // --- CORE CHAT LOGIC ---
  const sendMessage = async (customMsg = null) => {
    const msgToSend = customMsg || message;
    if (!msgToSend.trim()) return;

    // If it's the internal automatic greeting, don't show it in the UI bubbles
    const isInternalGreeting = customMsg && customMsg.includes("Let's start the interview");
    
    if (!isInternalGreeting) {
      setChatHistory(prev => [...prev, { role: "user", text: msgToSend }]);
    }
    
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: msgToSend,
        history: chatHistory, 
      });

      const aiReply = res.data.reply;

      if (aiReply.includes("Summary Report") || aiReply.includes("Final Evaluation")) {
        setFinalReport(aiReply);
        setIsFinished(true);
        speak("Diagnostics complete. I am generating your performance report now.");
      } else {
        setChatHistory(prev => [...prev, { role: "ai", text: aiReply }]);
        speak(aiReply);
      }
    } catch (error) {
      console.error("Communication Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- INITIAL GREETING (Triggered when user logs in) ---
  useEffect(() => {
    if (isLoaded && user && chatHistory.length === 0 && !isFinished) {
      const initialGreeting = `Hello Echo-01, my name is ${user.firstName}. Let's start the interview.`;
      sendMessage(initialGreeting);
    }
  }, [isLoaded, user, isFinished]);

  if (!isLoaded) return null; // Wait for Clerk to load

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 text-slate-900 font-sans">
      <style>{globalStyles}</style>

      {/* --- LOGGED OUT VIEW --- */}
      <SignedOut>
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md border border-slate-200">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black mb-3 text-slate-800">Echo-01</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">The high-speed AI diagnostic tool for technical interview preparation.</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 text-white w-full py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
              Get Started
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      {/* --- LOGGED IN VIEW --- */}
      <SignedIn>
        <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[750px] overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center px-8">
            <div className="flex items-center gap-4">
              <UserButton afterSignOutUrl="/" />
              <div>
                <h1 className="font-black text-slate-800 tracking-tight text-lg leading-none">Echo-01</h1>
                {!isFinished && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active Session</span>}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!isFinished && chatHistory.length > 0 && (
                <button 
                  onClick={() => sendMessage("The interview is over. Please provide my final evaluation and score now.")}
                  className="text-[10px] font-black bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase"
                >
                  End
                </button>
              )}
              <button 
                onClick={() => { setIsFinished(false); setChatHistory([]); setFinalReport(""); }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                {isFinished ? "Restart" : "Reset"}
              </button>
            </div>
          </div>

          {!isFinished ? (
            <>
              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 px-5 rounded-2xl shadow-sm ${
                      chat.role === "user" 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{chat.text}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-50 p-4 rounded-2xl flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input & Mic */}
              <div className="p-8 bg-white border-t border-slate-50 flex gap-4 items-center">
                <button
                  onClick={startListening}
                  className={`p-4 rounded-2xl transition-all ${
                    isListening ? "bg-red-500 text-white scale-110 shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 005.945 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                  </svg>
                </button>
                
                <input
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder={isListening ? "Listening..." : "Tell Echo-01 something..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                
                <button 
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg shadow-blue-100"
                >
                  SEND
                </button>
              </div>
            </>
          ) : (
            /* Results View */
            <div className="flex-1 overflow-y-auto p-10 bg-white animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="max-w-prose mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight underline decoration-blue-500 decoration-4 underline-offset-8">Diagnostic Report</h2>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
                  <div className="prose prose-slate max-w-none text-slate-700 font-medium">
                    {finalReport.split('\n').map((line, i) => (
                      <p key={i} className={`mb-2 ${line.startsWith('###') ? 'text-xl font-bold text-blue-700 mt-6' : ''}`}>
                        {line.replace(/###/g, '').replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>
                </div>
                <button onClick={() => window.print()} className="mt-8 w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl">
                  Save PDF Report
                </button>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
      
      <p className="mt-6 text-slate-400 text-[10px] uppercase font-bold tracking-[0.3em]">Neural Interface v1.0 • Echo-01</p>
    </main>
  );
}