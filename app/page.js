"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
  
  body {
    font-family: 'Inter', sans-serif;
    background-color: #000;
    color: #fff;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #0a0a0a;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #262626;
    border-radius: 10px;
  }

  @keyframes pulse-wave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(2); }
  }

  @keyframes progress {
    0% { stroke-dasharray: 0 100; }
  }

  .circle-bg {
    fill: none;
    stroke: #171717;
    stroke-width: 2.8;
  }

  .circle {
    fill: none;
    stroke: #ffffff;
    stroke-width: 2.8;
    stroke-linecap: round;
    animation: progress 1.5s ease-out forwards;
  }
`;

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finalReport, setFinalReport] = useState("");
  const [score, setScore] = useState(0); // Added for the circle progress
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { user } = useUser();

  // --- VOICE ENGINE (UNCHANGED) ---
  useEffect(() => {
    const initVoices = () => { window.speechSynthesis.getVoices(); };
    initVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = initVoices;
    }
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/\[FINAL_REPORT\]/g, "").replace(/Score: \d+/g, "").trim();
    const sentences = cleanText.split(/[.!?]/);
    
    sentences.forEach((sentence) => {
      if (sentence.trim().length === 0) return;
      const utterance = new SpeechSynthesisUtterance(sentence);
      const voices = window.speechSynthesis.getVoices();
      
      const preferredVoice = voices.find(v => 
        v.name.includes("Google US English") || 
        v.name.includes("Natural") || 
        v.name.includes("Samantha")
      ) || voices[0];

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    });
  };

  // --- LOGIC ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => setMessage(e.results[0][0].transcript);
    recognition.start();
  };

  const processAiResponse = (aiReply) => {
    if (aiReply.includes("[FINAL_REPORT]")) {
      // Extract score using regex (e.g., Score: 85)
      const scoreMatch = aiReply.match(/Score: (\d+)/);
      if (scoreMatch) {
        setScore(parseInt(scoreMatch[1]));
      } else {
        setScore(70); // Fallback
      }
      
      setFinalReport(aiReply.replace("[FINAL_REPORT]", "").replace(/Score: \d+/g, "").trim());
      setIsFinished(true);
      speak("Session concluded. Analyzing performance rubrics and generating score.");
    } else {
      setChatHistory(prev => [...prev, { role: "ai", text: aiReply }]);
      speak(aiReply);
    }
  };

  const systemPromptInstructions = `
    You are Echo AI, an elite executive recruiter. 
    Tone: Professional, rigorous, and human-like. 
    Method: Evaluate using STAR (Situation, Task, Action, Result) and PAR (Problem, Action, Result) rubrics.
    Process: Ask 3-5 high-impact questions. Once finished, generate a detailed assessment.
    Crucial: You MUST start your very final evaluation message with exactly: [FINAL_REPORT] and include a 'Score: X' out of 100.
  `;

  // Triggered when clicking "End Session & Evaluate"
  const triggerFinalReport = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: "The candidate has requested to end the session. Provide the final evaluation with a Score: X out of 100 and the [FINAL_REPORT] dossier.",
        history: chatHistory, 
      });
      processAiResponse(res.data.reply);
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user && chatHistory.length === 0 && !isFinished) {
      (async () => {
        setLoading(true);
        try {
          const res = await axios.post("http://localhost:8000/chat", {
            message: `${systemPromptInstructions} Start the interview for candidate ${user.firstName}. Introduce yourself as Echo AI.`,
            history: [], 
          });
          setChatHistory([{ role: "ai", text: res.data.reply }]);
          speak(res.data.reply);
        } finally { setLoading(false); }
      })();
    }
  }, [user, isFinished]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const newHistory = [...chatHistory, { role: "user", text: message }];
    setChatHistory(newHistory);
    setLoading(true);
    const currentMsg = message;
    setMessage("");

    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: currentMsg,
        history: chatHistory, 
      });
      processAiResponse(res.data.reply);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      <style>{globalStyles}</style>

      <SignedIn>
        <div className="w-full max-w-4xl h-[85vh] flex flex-col border border-neutral-800 bg-neutral-950 rounded-sm shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-900 bg-neutral-950 z-10">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-neutral-700'}`} />
              <span className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 font-bold">
                {isFinished ? "Analysis Complete" : `ECHO AI / Candidate: ${user?.firstName}`}
              </span>
            </div>
            <div className="flex items-center gap-8">
               <button 
                onClick={isFinished ? () => window.location.reload() : triggerFinalReport}
                className="text-[10px] uppercase tracking-widest text-neutral-600 hover:text-white transition-colors font-bold"
              >
                {isFinished ? "New Session" : "End Session & Evaluate"}
              </button>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-none border border-neutral-700" } }} />
            </div>
          </div>

          {!isFinished ? (
            <>
              {/* Chat */}
              <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] ${chat.role === "user" ? "text-right" : "text-left"}`}>
                      <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold block mb-3">
                        {chat.role === "user" ? user?.firstName : "ECHO_AI"}
                      </span>
                      <p className={`text-lg font-light leading-relaxed tracking-tight ${chat.role === "user" ? "text-white" : "text-neutral-400"}`}>
                        {chat.text}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-1 h-3 bg-neutral-800 animate-[pulse-wave_1s_infinite_0ms]" />
                    <div className="w-1 h-3 bg-neutral-800 animate-[pulse-wave_1s_infinite_200ms]" />
                    <div className="w-1 h-3 bg-neutral-800 animate-[pulse-wave_1s_infinite_400ms]" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-8 border-t border-neutral-900 bg-black">
                <div className="flex gap-6 items-end max-w-3xl mx-auto">
                   <button onClick={startListening} className={`mb-3 transition-colors ${isListening ? "text-red-500" : "text-neutral-500 hover:text-white"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  </button>
                  <input
                    className="flex-1 bg-transparent border-b border-neutral-800 py-3 text-lg font-light focus:outline-none focus:border-white transition-colors placeholder:text-neutral-800"
                    placeholder={isListening ? "Listening..." : "Provide response..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage} className="text-[10px] uppercase tracking-[0.2em] font-black border border-neutral-800 px-6 py-3 hover:bg-white hover:text-black transition-all">
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Result View with Circle Progress */
            <div className="flex-1 overflow-y-auto p-16 custom-scrollbar bg-black">
               <div className="max-w-3xl mx-auto flex flex-col items-center">
                  
                  {/* Circle Score UI */}
                  <div className="relative w-40 h-40 mb-10">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold tracking-tighter">{score}</span>
                      <span className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Index</span>
                    </div>
                  </div>

                  <div className="w-full text-center mb-16">
                      <h2 className="text-xs uppercase tracking-[0.5em] text-neutral-600 mb-2">Performance Assessment</h2>
                      <h3 className="text-3xl font-light tracking-tighter uppercase">{user?.firstName} / Candidate Dossier</h3>
                  </div>

                  <div className="w-full space-y-12 text-left border-l border-neutral-900 pl-10">
                    {finalReport.split('\n').filter(l => l.trim()).map((line, i) => (
                      <div key={i}>
                        {line.includes(':') ? (
                          <div className="grid grid-cols-3 gap-4">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{line.split(':')[0]}</span>
                            <span className="col-span-2 text-neutral-300 font-light leading-relaxed text-sm">{line.split(':')[1]}</span>
                          </div>
                        ) : (
                          <p className={`text-sm leading-loose tracking-wide ${line.startsWith('#') ? 'text-xl font-light text-white mt-8 border-b border-neutral-900 pb-2' : 'text-neutral-400'}`}>
                            {line.replace(/###/g, '').replace(/\*\*/g, '')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-24 pt-8 border-t border-neutral-900 flex gap-4">
                    <button onClick={() => window.print()} className="border border-white text-white px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-white hover:text-black transition-all">
                      Export Dossier
                    </button>
                    <button onClick={() => window.location.reload()} className="border border-neutral-800 text-neutral-400 px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-bold hover:text-white transition-all">
                      New Session
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </SignedIn>
      <SignedOut><SignInButton /></SignedOut>
    </main>
  );
}