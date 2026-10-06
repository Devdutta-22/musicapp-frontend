import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, StopCircle, Volume2, VolumeX, Sparkles, Zap, Radio, Music, Play, Disc } from "lucide-react";

export default function AIChatBot({ onPlaySong, allSongs = [] }) {
    const [mode, setMode] = useState('chat'); // 'chat' or 'hum'
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Systems online. I am Lyra. Chat with me or switch to 'Hum to Search' to let me guess what song you're humming!" }
    ]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('idle'); // idle, listening, humming, processing, speaking
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    
    const scrollRef = useRef(null);
    const recognitionRef = useRef(null);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");

    // --- 1. CLEANUP ON UNMOUNT ---
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
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

            recognitionRef.current.onstart = () => {
                setStatus(mode === 'hum' ? 'humming' : 'listening');
            };
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                handleSend(transcript, mode === 'hum');
            };
            recognitionRef.current.onerror = () => setStatus('idle');
            recognitionRef.current.onend = () => {
                if (status === 'listening' || status === 'humming') setStatus('idle');
            };
        }
    }, [mode]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, status]);

    // Helper: Remove formatting symbols
    const cleanText = (text) => text ? text.replace(/\*/g, '').trim() : "";

    // Helper: Extract [PLAY_MATCH: Song Title] or [GUESS: ...]
    const extractSongMatch = (text) => {
        if (!text) return null;
        const match = text.match(/\[(?:PLAY_MATCH|PLAY_SONG|GUESS):\s*([^\]]+)\]/i);
        return match ? match[1].trim() : null;
    };

    // Helper: Clean message for speech (don't read raw brackets)
    const textForSpeech = (text) => {
        return cleanText(text.replace(/\[(?:PLAY_MATCH|PLAY_SONG|GUESS):[^\]]+\]/gi, ''));
    };

    // Helper: Get natural voice
    const getNaturalVoice = () => {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices();
        return voices.find(v => v.name.includes("Google US English")) || 
               voices.find(v => v.name.includes("Microsoft Zira")) || 
               voices.find(v => v.lang === "en-US") || 
               voices[0];
    };

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); 
        
        const clean = textForSpeech(text);
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
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setStatus('idle');
    };

    const handleSend = async (manualText = null, isHummingMode = false) => {
        const textToSend = manualText || input;
        if (!textToSend.trim()) return;

        const isHumming = isHummingMode || mode === 'hum';
        const displayUserMessage = isHumming 
            ? `🎵 [Hummed melody]: "${textToSend}"` 
            : textToSend;

        setMessages(prev => [...prev, { role: 'user', text: displayUserMessage }]);
        setInput('');
        setStatus('processing');

        // Construct enriched prompt for Lyra's melody detective capability
        const promptPayload = isHumming
            ? `[MELODY_DETECT_MODE]: The user hummed, sang, or described the following melody/lyrics: "${textToSend}".
As Lyra, the celestial music AI of Astronote:
1. Guess which song they are humming or thinking of (focus on popular Hindi/Bollywood, English, Pop, Rock, Lo-fi, or global chart-toppers like Arijit Singh, KK, Taylor Swift, Atif Aslam, The Weeknd, Justin Bieber, etc.).
2. Announce your #1 best guess clearly with "Song Title" and "Artist".
3. Add a short 1-sentence explanation of why the melody or rhythm matches.
4. Give 1 or 2 alternate close matches if applicable.
5. Conclude your response on its own line with:
[PLAY_MATCH: Song Title - Artist]`
            : textToSend;

        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: promptPayload })
            });

            const data = await res.json();
            const rawReply = data.reply || "Signal lost in deep space.";
            const displayReply = cleanText(rawReply);
            const guessedSong = extractSongMatch(rawReply);

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: displayReply,
                guessedSong: guessedSong 
            }]);
            
            if (voiceEnabled) speak(displayReply);
            else setStatus('idle');

        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Connection severed with the cosmic node." }]);
            setStatus('idle');
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice recognition is not supported in this browser. Try Chrome or Safari 14.1+.");
            return;
        }
        if (status === 'listening' || status === 'humming') {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    const handlePlaySongMatch = (songQuery) => {
        if (onPlaySong) {
            onPlaySong(songQuery);
        }
    };

    return (
        <div className="tab-pane ai-container">
            
            {/* --- ANIMATED SPACE BACKGROUND --- */}
            <div className="space-bg">
                <div className="stars"></div>
                <div className="stars2"></div>
                <div className="nebula"></div>
            </div>

            {/* --- TOP MODE SWITCHER --- */}
            <div style={{
                position: 'absolute',
                top: 15,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '30px',
                padding: '3px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                maxWidth: '90%'
            }}>
                <button
                    onClick={() => { setMode('chat'); stopSpeaking(); }}
                    style={{
                        background: mode === 'chat' ? 'linear-gradient(90deg, #ff00cc, #9146ff)' : 'transparent',
                        color: mode === 'chat' ? '#fff' : '#aaa',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <Sparkles size={14} /> Chat
                </button>
                <button
                    onClick={() => { setMode('hum'); stopSpeaking(); }}
                    style={{
                        background: mode === 'hum' ? 'linear-gradient(90deg, #00ffff, #3333ff)' : 'transparent',
                        color: mode === 'hum' ? '#000' : '#aaa',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <Music size={14} /> Hum & Guess
                </button>
            </div>

            {/* --- COSMIC CORE (The Orb) --- */}
            <div className="cosmic-core-container">
                <div className={`cosmic-core ${status} ${mode === 'hum' ? 'hum-mode' : ''}`}>
                    <div className="core-inner"></div>
                    <div className="core-ring"></div>
                    <div className="core-particles"></div>
                </div>
                <div className="status-text">
                    {status === 'idle' && (mode === 'hum' ? "TAP MIC & HUM A TUNE..." : "SYSTEM READY")}
                    {status === 'listening' && "RECEIVING TRANSMISSION..."}
                    {status === 'humming' && "🎵 LISTENING TO YOUR MELODY..."}
                    {status === 'processing' && (mode === 'hum' ? "ANALYZING MELODY & GUESSING SONG..." : "CALCULATING RESPONSE...")}
                    {status === 'speaking' && "BROADCASTING..."}
                </div>
            </div>

            {/* --- CHAT FEED --- */}
            <div className="ai-chat-feed" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`ai-msg-wrapper ${m.role}`}>
                        <div className={`ai-msg ${m.role}`}>
                            <div>{m.text}</div>
                            {/* Interactive Song Match Badge */}
                            {m.guessedSong && (
                                <div style={{
                                    marginTop: 10,
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    background: 'rgba(0, 255, 255, 0.1)',
                                    border: '1px solid rgba(0, 255, 255, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#00ffff' }}>
                                        <Disc size={16} />
                                        <span><strong>{m.guessedSong}</strong></span>
                                    </div>
                                    <button 
                                        onClick={() => handlePlaySongMatch(m.guessedSong)}
                                        style={{
                                            background: '#00ffff',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        <Play size={12} fill="#000" /> Play
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {status === 'processing' && (
                    <div className="ai-msg-wrapper assistant">
                        <div className="ai-msg assistant loading">
                            <Sparkles size={14} className="spin-slow"/> 
                            <span>{mode === 'hum' ? 'Decoding melody...' : 'Deciphering...'}</span>
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
                }} title={voiceEnabled ? "Mute voice" : "Enable voice"}>
                    {voiceEnabled ? <Volume2 size={22} color="#00ffff" /> : <VolumeX size={22} color="#555" />}
                </button>

                <div className="input-field-wrapper">
                    <input 
                        className="holo-input" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(null, mode === 'hum')}
                        placeholder={
                            status === 'listening' || status === 'humming' 
                                ? (mode === 'hum' ? "Humming detected... speak/hum into mic" : "Listening...") 
                                : (mode === 'hum' ? "Tap mic to hum, or type tune details..." : "Enter command...")
                        }
                    />
                </div>

                {input.trim() ? (
                    <button className="action-btn send" onClick={() => handleSend(null, mode === 'hum')} title="Send">
                        <Send size={20} color="#000" />
                    </button>
                ) : (
                    <button 
                        className={`action-btn mic ${status === 'listening' || status === 'humming' ? 'active' : ''}`} 
                        onClick={toggleListening}
                        title={status === 'listening' || status === 'humming' ? "Stop recording" : (mode === 'hum' ? "Hum a song" : "Speak to Lyra")}
                        style={mode === 'hum' && status !== 'humming' ? { borderColor: '#00ffff' } : {}}
                    >
                        {status === 'listening' || status === 'humming' ? <StopCircle size={24} color="#fff"/> : <Mic size={24} color={mode === 'hum' ? "#00ffff" : "#fff"}/>}
                    </button>
                )}
            </div>
        </div>
    );
}
