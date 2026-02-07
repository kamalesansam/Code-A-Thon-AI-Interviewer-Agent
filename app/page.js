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
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalReport, setFinalReport] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // --- VOICE SYSTEM ---

  // 1. Prime the voices as soon as the page loads
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel(); // Stop any overlapping speech
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Priority list for "Siri/Alexa" style quality
    const preferredVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Samantha") || 
      v.name.includes("Microsoft Aria") || 
      v.name.includes("Siri") ||
      v.name.includes("Premium")
    );

    if (preferredVoice) utterance.voice = preferredVoice;

    // Human-like pacing
    utterance.rate = 0.95; // Slightly slower sounds more natural
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  };

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

  // --- LOGIC ---

  useEffect(() => {
    if (chatHistory.length === 0 && !isFinished) {
      (async () => {
        setLoading(true);
        try {
          const res = await axios.post("http://localhost:8000/chat", {
            message: "Start the interview by introducing yourself.",
            history: [], 
          });
          setChatHistory([{ role: "ai", text: res.data.reply }]);
          speak(res.data.reply);
        } finally { setLoading(false); }
      })();
    }
  }, [isFinished]);

  const sendMessage = async (customMsg = null) => {
    const msgToSend = customMsg || message;
    if (!msgToSend.trim()) return;

    const newHistory = [...chatHistory, { role: "user", text: msgToSend }];
    setChatHistory(newHistory);
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: msgToSend,
        history: chatHistory, 
      });

      const aiReply = res.data.reply;
      if (aiReply.includes("Summary Report")) {
        setFinalReport(aiReply);
        setIsFinished(true);
        speak("The interview is over. I'm preparing your report now.");
      } else {
        setChatHistory([...newHistory, { role: "ai", text: aiReply }]);
        speak(aiReply);
      }
    } finally { setLoading(false); }
  };

  // --- RENDER ---
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-slate-900">
      <style>{globalStyles}</style>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col h-[750px] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h1 className="font-bold text-slate-800 tracking-tight text-xl">
              {isFinished ? "Interview Results" : "Rachel Lee"}
            </h1>
          </div>
          <button 
            onClick={() => { window.speechSynthesis.cancel(); setIsFinished(false); setChatHistory([]); }}
            className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            {isFinished ? "Restart" : "Reset"}
          </button>
        </div>

        {!isFinished ? (
          <>
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatHistory.map((chat, i) => (
                <div key={i} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    chat.role === "user" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-800"
                  }`}>
                    <p className="text-sm leading-relaxed">{chat.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input / Mic */}
            <div className="p-6 bg-white border-t border-slate-50 flex gap-4 items-center">
              <button
                onClick={startListening}
                className={`p-4 rounded-full transition-all ${
                  isListening ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 005.945 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              </button>
              <input
                className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 text-slate-800"
                placeholder={isListening ? "Listening..." : "Tell Rachel something..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={() => sendMessage()} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                Send
              </button>
            </div>
          </>
        ) : (
          /* Report View */
          <div className="flex-1 overflow-y-auto p-10 text-center animate-in fade-in duration-500">
             <div className="prose prose-slate mx-auto text-left bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                {finalReport.split('\n').map((line, i) => (
                  <p key={i} className={`mb-2 ${line.startsWith('###') ? 'text-xl font-bold text-blue-700 mt-6' : ''}`}>
                    {line.replace(/###/g, '').replace(/\*\*/g, '')}
                  </p>
                ))}
             </div>
             <button onClick={() => window.print()} className="mt-8 bg-slate-900 text-white py-4 px-12 rounded-2xl font-black shadow-xl">
               EXPORT PDF
             </button>
          </div>
        )}
      </div>
    </main>
  );
}