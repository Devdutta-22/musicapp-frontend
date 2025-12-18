import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, StopCircle, Volume2, VolumeX, Sparkles, Zap, Radio } from "lucide-react";

export default function AIChatBot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Systems online. I am listening..." }
    ]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    
    const scrollRef = useRef(null);
    const recognitionRef = useRef(null);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");

    // --- 1. CLEANUP ON UNMOUNT (Fixes Voice Persistence) ---
    useEffect(() => {
        // When user leaves this tab, STOP TALKING immediately.
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // --- 2. VOICE SETUP ---
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => setStatus('listening');
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                handleSend(transcript);
            };
            recognitionRef.current.onerror = () => setStatus('idle');
            recognitionRef.current.onend = () => {
                if (status === 'listening') setStatus('idle');
            };
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Helper: Remove stars from text
    const cleanText = (text) => text ? text.replace(/\*/g, '').trim() : "";

    // Helper: Get best voice
    const getNaturalVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return voices.find(v => v.name.includes("Google US English")) || 
               voices.find(v => v.name.includes("Microsoft Zira")) || 
               voices.find(v => v.lang === "en-US") || 
               voices[0];
    };

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        
        const clean = cleanText(text);
        const utterance = new SpeechSynthesisUtterance(clean);
        const voice = getNaturalVoice();
        if (voice) utterance.voice = voice;
        
        utterance.rate = 1.05; 
        utterance.pitch = 1.0;

        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => setStatus('idle');

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setStatus('idle'); // Instant UI update
    };

    const handleSend = async (manualText = null) => {
        const textToSend = manualText || input;
        if (!textToSend.trim()) return;

        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setInput('');
        setStatus('processing');

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: textToSend })
            });

            const data = await res.json();
            const rawReply = data.reply || "Signal lost in deep space.";
            const displayReply = cleanText(rawReply);

            setMessages(prev => [...prev, { role: 'assistant', text: displayReply }]);
            
            if (voiceEnabled) speak(displayReply);
            else setStatus('idle');

        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Connection severed." }]);
            setStatus('idle');
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return alert("Voice not supported.");
        if (status === 'listening') recognitionRef.current.stop();
        else recognitionRef.current.start();
    };

    return (
        <div className="tab-pane ai-container">
            
            {/* --- ANIMATED SPACE BACKGROUND --- */}
            <div className="space-bg">
                <div className="stars"></div>
                <div className="stars2"></div>
                <div className="nebula"></div>
            </div>

            {/* --- COSMIC CORE (The Orb) --- */}
            <div className="cosmic-core-container">
                <div className={`cosmic-core ${status}`}>
                    <div className="core-inner"></div>
                    <div className="core-ring"></div>
                    <div className="core-particles"></div>
                </div>
                <div className="status-text">
                    {status === 'idle' && "SYSTEM READY"}
                    {status === 'listening' && "RECEIVING TRANSMISSION..."}
                    {status === 'processing' && "CALCULATING RESPONSE..."}
                    {status === 'speaking' && "BROADCASTING..."}
                </div>
            </div>

            {/* --- CHAT FEED --- */}
            <div className="ai-chat-feed" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`ai-msg-wrapper ${m.role}`}>
                        <div className={`ai-msg ${m.role}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {status === 'processing' && (
                    <div className="ai-msg-wrapper assistant">
                        <div className="ai-msg assistant loading">
                            <Sparkles size={14} className="spin-slow"/> <span>Deciphering...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- FLOATING STOP BUTTON --- */}
            {status === 'speaking' && (
                <button className="stop-btn-pulse" onClick={stopSpeaking}>
                    <div className="pulse-ring"></div>
                    <Radio size={18} /> CUT TRANSMISSION
                </button>
            )}

            {/* --- FUTURISTIC CONTROLS --- */}
            <div className="ai-controls-glass">
                <button className="icon-btn" onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    if (voiceEnabled) stopSpeaking();
                }}>
                    {voiceEnabled ? <Volume2 size={22} color="#00ffff" /> : <VolumeX size={22} color="#555" />}
                </button>

                <div className="input-field-wrapper">
                    <input 
                        className="holo-input" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={status === 'listening' ? "Listening..." : "Enter command..."}
                    />
                </div>

                {input.trim() ? (
                    <button className="action-btn send" onClick={() => handleSend()}>
                        <Send size={20} color="#000" />
                    </button>
                ) : (
                    <button className={`action-btn mic ${status === 'listening' ? 'active' : ''}`} onClick={toggleListening}>
                        {status === 'listening' ? <StopCircle size={24} color="#fff"/> : <Mic size={24} color="#fff"/>}
                    </button>
                )}
            </div>
        </div>
    );
}
