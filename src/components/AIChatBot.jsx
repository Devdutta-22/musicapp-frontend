import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles, StopCircle, Volume2, VolumeX } from "lucide-react";

export default function AIChatBot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "I'm listening. What vibe are you looking for?" }
    ]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    
    const scrollRef = useRef(null);
    const recognitionRef = useRef(null);

    // API URL
    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");

    // --- 1. SETUP SPEECH RECOGNITION ---
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
                handleSend(transcript); // Auto-send on voice end
            };

            recognitionRef.current.onerror = () => setStatus('idle');
            recognitionRef.current.onend = () => {
                if (status === 'listening') setStatus('idle');
            };
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // --- 2. SEND MESSAGE LOGIC ---
    const handleSend = async (manualText = null) => {
        const textToSend = manualText || input;
        if (!textToSend.trim()) return;

        // Add User Message
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
            const aiReply = data.reply || "I couldn't hear the cosmos clearly.";

            // Add AI Message
            setMessages(prev => [...prev, { role: 'assistant', text: aiReply }]);
            
            // Speak the reply
            if (voiceEnabled) speak(aiReply);
            else setStatus('idle');

        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Connection to the galaxy lost." }]);
            setStatus('idle');
        }
    };

    // --- 3. TEXT TO SPEECH ---
    const speak = (text) => {
        if (!window.speechSynthesis) {
            setStatus('idle');
            return;
        }
        
        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher for "AI" feel
        
        // Try to find a nice female voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => setStatus('idle');

        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (status === 'listening') {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    return (
        <div className="tab-pane ai-container">
            {/* --- VISUALIZER SECTION --- */}
            <div className="siri-orb-container">
                <div className="orb-ring ring-1"></div>
                <div className="orb-ring ring-2"></div>
                <div className="orb-ring ring-3"></div>
                
                {/* The Main Orb */}
                <div className={`siri-orb ${status}`}></div>
                
                {/* Status Text overlay */}
                <div style={{ position: 'absolute', bottom: 40, color: 'rgba(255,255,255,0.6)', fontSize: 14, letterSpacing: 1 }}>
                    {status === 'idle' && "TAP MIC TO SPEAK"}
                    {status === 'listening' && "LISTENING..."}
                    {status === 'processing' && "THINKING..."}
                    {status === 'speaking' && "SPEAKING..."}
                </div>
            </div>

            {/* --- CHAT HISTORY --- */}
            <div className="ai-chat-feed" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 16,
                        display: 'flex', flexDirection: 'column',
                        alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            background: m.role === 'user' ? 'rgba(0, 255, 255, 0.15)' : 'transparent',
                            border: m.role === 'user' ? '1px solid rgba(0, 255, 255, 0.3)' : 'none',
                            padding: '8px 16px',
                            borderRadius: 16,
                            maxWidth: '90%',
                            color: m.role === 'user' ? '#fff' : '#aaa',
                            fontSize: m.role === 'user' ? 15 : 18,
                            textAlign: m.role === 'user' ? 'right' : 'center',
                            fontWeight: m.role === 'user' ? 400 : 500
                        }}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- INPUT CONTROLS --- */}
            <div className="ai-controls">
                <button className="icon-btn" onClick={() => setVoiceEnabled(!voiceEnabled)}>
                    {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} color="#666" />}
                </button>

                <input 
                    className="glass-input" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type or speak..."
                    style={{ borderRadius: 30 }}
                />

                {input.trim() ? (
                    <button className="icon-btn" onClick={() => handleSend()}>
                        <div style={{ background: '#00ffff', borderRadius: '50%', padding: 8 }}>
                            <Send size={20} color="#000" />
                        </div>
                    </button>
                ) : (
                    <button className="icon-btn" onClick={toggleListening}>
                        <div style={{ 
                            background: status === 'listening' ? '#ff0055' : 'rgba(255,255,255,0.1)', 
                            borderRadius: '50%', padding: 12,
                            transition: 'all 0.3s'
                        }}>
                            {status === 'listening' ? <StopCircle size={24} color="#fff"/> : <Mic size={24} color="#fff"/>}
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
