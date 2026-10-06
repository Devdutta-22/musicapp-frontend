import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard';
import PlaylistPanel from './PlaylistPanel';
import Leaderboard from './Leaderboard'; 
import AIChatBot from './AIChatBot';
import YouTube from 'react-youtube';
import '../App.css';
import {
    Home, Search, Library, User, PlusCircle,
    Play, Pause, Heart, ChevronDown, Zap, Mic2, ListMusic, MoreHorizontal,
    ListPlus, PlayCircle, ArrowRightCircle,
    Shuffle, Repeat, Repeat1, Trash2, ArrowUp, ArrowDown, Telescope, Sparkles, Sparkle,RotateCcw, ArrowLeft, Rocket, Orbit,
    X, Minimize2, MessageCircle, Trophy, Bot, Globe, Share2, 
    Youtube, Mic
} from "lucide-react";

// --- CSS FOR IOS TOGGLE ---
const CUSTOM_STYLES = `
.ios-toggle-container {
    position: relative;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 30px;
    height: 44px;
    display: flex;
    align-items: center;
    padding: 4px;
    margin-bottom: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.ios-toggle-pill {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: calc(50% - 4px);
    background: #ffffff;
    border-radius: 26px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    z-index: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.ios-toggle-btn {
    flex: 1;
    z-index: 2;
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: color 0.3s ease;
    height: 100%;
}
`;

const PERSON_PLACEHOLDER = '/person-placeholder.png';

const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

const FEATURED_ARTISTS = [
    { name: "Arijit Singh", image: "/artists/arijit.jpg" }, 
    { name: "Shreya Ghoshal", image: "/artists/shreya.jpg" },
    { name: "Sonu Nigam", image: "/artists/sonu.jpg" },
    { name: "Sunidhi Chauhan", image:"/artists/sunidhi.jpg"},
    { name: "K.K.", image:"/artists/kk.jpg"},
    { name: "Taylor Swift", image:"/artists/taylor.jpg" },
    { name: "Atif Aslam", image:"/artists/atif.jpg"},
    { name: "Kishore Kumar", image:"/artists/kishore.jpg"}, 
    { name: "Mohit Chauhan", image:"/artists/mohit.jpg"}, 
    { name: "Ariana Grande", image: "/artists/ariana.jpg" },
    { name: "Armaan Malik", image: "/artists/armaan.jpg" },
    { name: "A.R. Rahman", image: "/artists/ar.jpg"},
    { name: "Justin Bieber", image:"/artists/justin.jpg" },
];

const SPECIAL_IDS = [250, 277, 248, 470]; 

export default function MusicApp({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
    const [searchMode, setSearchMode] = useState('local'); 
    
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [specialView, setSpecialView] = useState(null); 
    const [songCurrentTime, setSongCurrentTime] = useState(0);

    const [libraryTab, setLibraryTab] = useState('liked');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(null);

    const [homeFeed, setHomeFeed] = useState([]);
    const [discoveryFeed, setDiscoveryFeed] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [songCache, setSongCache] = useState({});

    const [artistSongsFromDb, setArtistSongsFromDb] = useState([]);
    const [isArtistLoading, setIsArtistLoading] = useState(false);

    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [songProgress, setSongProgress] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off');
    const [sleepTime, setSleepTime] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListeningSearch, setIsListeningSearch] = useState(false);
    const searchRecognitionRef = useRef(null);
    const sleepIntervalRef = useRef(null);

    // --- AUTOPLAY & RECOMMENDATION ENGINE STATE ---
    const [autoplay, setAutoplay] = useState(true);
    const [isFetchingRecs, setIsFetchingRecs] = useState(false);
    const recsInFlightRef = useRef(false);

    // --- VOICE SEARCH FUNCTIONALITY ---
    const toggleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert("Voice search is not supported in this browser. Please use Chrome or Safari 14.1+.");
            return;
        }
        if (isListeningSearch) {
            if (searchRecognitionRef.current) {
                try { searchRecognitionRef.current.stop(); } catch (e) {}
            }
            setIsListeningSearch(false);
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => setIsListeningSearch(true);
            rec.onresult = (event) => {
                const text = event.results[0][0].transcript;
                if (text) {
                    setSearchTerm(text.trim());
                }
                setIsListeningSearch(false);
            };
            rec.onerror = (err) => {
                console.warn("Voice search error:", err);
                setIsListeningSearch(false);
            };
            rec.onend = () => setIsListeningSearch(false);

            searchRecognitionRef.current = rec;
            rec.start();
        } catch (err) {
            console.warn("Could not start voice search:", err);
            setIsListeningSearch(false);
        }
    };

    // --- PLAY SONG FROM LYRA'S HUMMING DETECTION ---
    const handlePlayGuessedSong = (songTitleOrQuery) => {
        if (!songTitleOrQuery) return;
        const clean = songTitleOrQuery.replace(/^\[(?:PLAY_MATCH|PLAY_SONG|GUESS):\s*|\]$/gi, '').trim();
        // Look in loaded songs
        const pool = [...allSongs, ...homeFeed, ...discoveryFeed];
        const match = pool.find(s => 
            s.title?.toLowerCase().includes(clean.toLowerCase()) || 
            clean.toLowerCase().includes(s.title?.toLowerCase())
        );
        if (match) {
            playSong(match, [match]);
        } else {
            // Fallback: populate search and switch to global YouTube search
            setSearchTerm(clean);
            setSearchMode('global');
            setActiveTab('search');
        }
    };

    // --- YOUTUBE CONTROL REFS ---
    const playerRef = useRef(null);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const closeMenu = () => {
            setOpenMenuId(null);
            setShowPlaylistSelector(null);
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");
    const YT_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; 
    
    const authHeaders = useMemo(() => ({ headers: { "X-User-Id": user?.id || 0 } }), [user?.id]);

    // --- YOUTUBE SYNC LOGIC ---
    // 1. Sync Playing State: React -> YouTube
    useEffect(() => {
        if (queue[currentIndex] && getSongById(queue[currentIndex])?.isYouTube && playerRef.current) {
            if (playing) {
                playerRef.current.playVideo();
            } else {
                playerRef.current.pauseVideo();
            }
        }
    }, [playing, currentIndex, queue]);

    // 2. Sync Progress: YouTube -> React (Polling)
    useEffect(() => {
        let interval;
        if (queue[currentIndex] && getSongById(queue[currentIndex])?.isYouTube && playing) {
            interval = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const curr = playerRef.current.getCurrentTime();
                    const dur = playerRef.current.getDuration();
                    setSongCurrentTime(curr);
                    setDuration(dur);
                    if (dur > 0) {
                        setSongProgress((curr / dur) * 100);
                    }
                }
            }, 1000); // Update every second
        }
        return () => clearInterval(interval);
    }, [playing, currentIndex, queue]);

    // 3. Handle Manual Seek (Passed to Player)
    const handleSeek = (newTime) => {
        if (playerRef.current) {
            playerRef.current.seekTo(newTime, true);
            setSongCurrentTime(newTime);
        }
    };

    function formatTime(seconds) {
        if (!seconds) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // --- EXISTING LOGIC ---
    useEffect(() => {
        if (selectedArtist && selectedArtist.name) {
            setIsArtistLoading(true);
            setArtistSongsFromDb([]); 
            axios.get(`${API_BASE}/api/songs/search?q=${encodeURIComponent(selectedArtist.name)}`, authHeaders)
                .then(res => setArtistSongsFromDb(res.data))
                .catch(err => console.error(err))
                .finally(() => setIsArtistLoading(false));
        }
    }, [selectedArtist, API_BASE, authHeaders]);

    const specialSongsList = useMemo(() => {
        const pool = [...allSongs, ...homeFeed, ...discoveryFeed];
        const uniquePool = Array.from(new Map(pool.map(item => [item.id, item])).values());
        return uniquePool.filter(s => SPECIAL_IDS.includes(s.id));
    }, [allSongs, homeFeed, discoveryFeed]);

    useEffect(() => {
        if (!window.history.state) window.history.replaceState({ tab: 'home', player: false }, '');
        const handlePopState = (event) => {
            const state = event.state || { tab: 'home', player: false };
            setActiveTab(state.tab);
            setIsFullScreenPlayer(!!state.player);
            if (state.tab === 'home') { setSelectedArtist(null); setSpecialView(null); }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const goHome = () => {
        setActiveTab('home'); setSelectedArtist(null); setSpecialView(null);
        window.history.replaceState({ tab: 'home' }, '');
    };

    const handleNavClick = (tab) => {
        if (tab === activeTab && !selectedArtist && !specialView) return;
        if (tab === 'home') {
             window.history.back(); setSelectedArtist(null); setSpecialView(null);
        } else {
            const newState = { tab, player: false };
            if (activeTab === 'home') window.history.pushState(newState, '');
            else window.history.replaceState(newState, '');
            setActiveTab(tab); setIsFullScreenPlayer(false); setSelectedArtist(null); setSpecialView(null);
        }
    };

    const openPlayer = () => {
        if (isFullScreenPlayer) return;
        window.history.pushState({ tab: activeTab, player: true }, '');
        setIsFullScreenPlayer(true);
    };

    const closePlayer = () => {
        if (isLyricsExpanded) { setIsLyricsExpanded(false); return; }
        window.history.back();
    };

    useEffect(() => { loadFeeds(); }, []);

    async function loadFeeds() {
        setLoading(true);
        try {
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
            setHomeFeed(recent.data);
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
            setDiscoveryFeed(random.data);
            fetchLibraryData(); fetchAllSongs(); 
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function fetchAllSongs() {
        try { const res = await axios.get(`${API_BASE}/api/songs`, authHeaders); setAllSongs(res.data); } catch (e) {}
    }

    async function fetchLibraryData() {
        try {
            const liked = await axios.get(`${API_BASE}/api/songs/liked`, authHeaders);
            setLikedSongs(liked.data);
            const pl = await axios.get(`${API_BASE}/api/playlists`, authHeaders).catch(() => ({ data: [] }));
            setPlaylists(pl.data || []);
        } catch (e) {}
    }
    useEffect(() => { if (activeTab === 'library') fetchLibraryData(); }, [activeTab]);

    const searchYouTube = async (term) => {
        if (!YT_KEY) return [];
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: { part: 'snippet', maxResults: 15, q: term, type: 'video', key: YT_KEY }
            });
            return response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                artistName: item.snippet.channelTitle,
                coverUrl: item.snippet.thumbnails.high.url,
                isYouTube: true 
            }));
        } catch (error) { return []; }
    };

    // --- SMART RECOMMENDATION ENGINE (AI Vibe + YouTube Radio) ---
    const fetchRecommendationsForSong = async (seedSong) => {
        if (!seedSong) return [];
        const cleanTitle = (seedSong.title || '').replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const cleanArtist = (seedSong.artistName || '').replace(/VEVO|Official|Records|Channel/gi, '').trim();

        // Tier 1: Ask Lyra AI for 3-4 vibey matching songs
        try {
            const aiPrompt = `Return ONLY a valid JSON array of 3 songs that closely match the genre, tempo, mood, and artist style of "${cleanTitle}" by "${cleanArtist}". Do not write any markdown, no backticks, no explanatory text, just the raw JSON array in this exact schema: [{"title":"Song Name","artist":"Artist Name"}]`;
            const chatRes = await axios.post(`${API_BASE}/api/chat`, { message: aiPrompt }, { timeout: 7000 });
            if (chatRes.data?.reply) {
                const raw = chatRes.data.reply.trim();
                const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const recs = [];
                        for (const item of parsed.slice(0, 3)) {
                            const query = `${item.title} ${item.artist}`;
                            const ytMatches = await searchYouTube(query);
                            const top = ytMatches.find(m => m.id !== seedSong.id && !queue.includes(m.id));
                            if (top) recs.push(top);
                        }
                        if (recs.length > 0) {
                            return recs;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("AI recommendation fallback triggered:", err?.message);
        }

        // Tier 2: YouTube Radio / Mix search query
        try {
            const radioQuery = `${cleanArtist} ${cleanTitle} audio mix`;
            const radioMatches = await searchYouTube(radioQuery);
            const filtered = radioMatches.filter(m => m.id !== seedSong.id && !queue.includes(m.id));
            if (filtered.length > 0) {
                return filtered.slice(0, 4);
            }
        } catch (err) {
            console.warn("YouTube Radio mix error:", err?.message);
        }

        // Tier 3: Local catalog random recommendations
        const localCatalog = [...homeFeed, ...discoveryFeed, ...allSongs].filter(
            s => s.id !== seedSong.id && !queue.includes(s.id)
        );
        if (localCatalog.length > 0) {
            return shuffleArray(localCatalog).slice(0, 4);
        }

        return [];
    };

    const appendRecommendations = async (seedSong) => {
        if (!autoplay || recsInFlightRef.current || !seedSong) return;
        recsInFlightRef.current = true;
        setIsFetchingRecs(true);
        try {
            const recs = await fetchRecommendationsForSong(seedSong);
            if (recs && recs.length > 0) {
                setSongCache(prev => {
                    const next = { ...prev };
                    recs.forEach(r => { next[r.id] = r; });
                    return next;
                });
                setQueue(prev => {
                    const newIds = recs.map(r => r.id).filter(id => !prev.includes(id));
                    return [...prev, ...newIds];
                });
            }
        } catch (e) {
            console.warn("Could not append recommendations:", e);
        } finally {
            recsInFlightRef.current = false;
            setIsFetchingRecs(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (searchTerm.length > 1) {
                if (searchMode === 'global') {
                    const ytResults = await searchYouTube(searchTerm);
                    setSearchResults(ytResults);
                } else {
                    try {
                        const res = await axios.get(`${API_BASE}/api/songs/search?q=${searchTerm}`, authHeaders);
                        setSearchResults(res.data);
                    } catch (e) { }
                }
            } else { setSearchResults([]); }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, searchMode]);

    function getSongById(id) {
        if (songCache[id]) return songCache[id];
        const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs, ...allSongs, ...artistSongsFromDb];
        return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
    }
    const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

    const handleShare = (song) => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?songId=${song.id}`;
        if (navigator.share) navigator.share({ title: song.title, text: `Listen to ${song.title} on Astronote`, url: shareUrl }).catch(() => {});
        else { navigator.clipboard.writeText(shareUrl); alert("Link copied to clipboard!"); }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedId = params.get('songId');
        if (sharedId && allSongs.length > 0) {
            const song = allSongs.find(s => s.id === parseInt(sharedId));
            if (song) {
                playSong(song, [song]);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [allSongs]);

    const playSong = (song, contextList) => {
        if (!song) return;
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (song.isYouTube) {
            setQueue([song.id]);
            setCurrentIndex(0);
            if (autoplay) {
                appendRecommendations(song);
            }
        } else {
            let newQueue = contextList && contextList.length > 0 ? contextList.map(s => s.id) : [song.id];
            if (shuffle) newQueue = shuffleArray(newQueue);
            setQueue(newQueue);
            setCurrentIndex(newQueue.indexOf(song.id));
        }
        setPlaying(true);
    };

    const playNow = (song) => {
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (song.isYouTube) { playSong(song); return; }
        if (queue.length === 0) { playSong(song); return; }
        const newQueue = [...queue];
        const insertIndex = currentIndex + 1;
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue);
        setCurrentIndex(insertIndex);
        setPlaying(true);
    };

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const toggleShuffle = () => setShuffle(prev => !prev);
    const toggleRepeat = () => setRepeatMode(prev => prev === 'off' ? 'all' : (prev === 'all' ? 'one' : 'off'));

    const toggleLike = async (songId) => {
        if (currentSong?.isYouTube) return; 
        const update = (list) => list.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
        setHomeFeed(update); setDiscoveryFeed(update); setSearchResults(update); setLikedSongs(update); setAllSongs(update);
        setArtistSongsFromDb(update);
        try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); fetchLibraryData(); } catch (e) { }
    };

    const addToPlaylist = async (playlistId, songId) => {
        try {
            await axios.post(`${API_BASE}/api/playlists/${playlistId}/songs`, { songId }, authHeaders);
            alert("Added to playlist!");
            setShowPlaylistSelector(null);
        } catch (e) { alert("Failed to add."); }
    };

    const playNext = (song) => {
        // --- REMOVED GUARD CLAUSE FOR YOUTUBE ---
        // if (song.isYouTube) return;
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (queue.length === 0) { playSong(song); return; }
        const newQueue = [...queue];
        const insertIndex = currentIndex + 1;
        const existingIdx = newQueue.indexOf(song.id);
        if (existingIdx > -1 && existingIdx !== currentIndex) {
            newQueue.splice(existingIdx, 1);
            if (existingIdx < insertIndex) insertIndex--;
        }
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue);
    };

    const addToQueue = (song) => {
        // --- REMOVED GUARD CLAUSE FOR YOUTUBE ---
        // if (song.isYouTube) return;
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (queue.length === 0) { playSong(song); return; }
        if (!queue.includes(song.id)) setQueue([...queue, song.id]);
    };

    const clearQueue = () => {
        if (currentIndex === -1) return;
        if (window.confirm("Clear queue except current song?")) {
            setQueue([queue[currentIndex]]);
            setCurrentIndex(0);
        }
    };

    const restoreQueue = () => {
        if (homeFeed.length === 0) return;
        if (window.confirm("Restore queue from Fresh Arrivals?")) {
            const newQ = homeFeed.map(s => s.id);
            setQueue(newQ);
            const newIdx = newQ.indexOf(currentSong?.id);
            setCurrentIndex(newIdx !== -1 ? newIdx : 0);
        }
    };

    const moveItem = (oldIndex, newIndex) => {
        if (oldIndex < 0 || oldIndex >= queue.length || newIndex < 0 || newIndex >= queue.length) return;
        setQueue(prev => {
            const q = [...prev];
            const [item] = q.splice(oldIndex, 1);
            q.splice(newIndex, 0, item);
            if (currentIndex === oldIndex) setCurrentIndex(newIndex);
            else if (currentIndex >= newIndex && currentIndex < oldIndex) setCurrentIndex(c => c + 1);
            else if (currentIndex <= newIndex && currentIndex > oldIndex) setCurrentIndex(c => c - 1);
            return q;
        });
    };

    const removeAtIndex = (idx) => {
        setQueue(prev => {
            const newQ = [...prev];
            newQ.splice(idx, 1);
            if (idx < currentIndex) setCurrentIndex(c => c - 1);
            return newQ;
        });
    };

    const handleNextSong = async () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < queue.length) {
            setCurrentIndex(nextIdx);
            setPlaying(true);
            // Prefetch next batch if nearing queue end
            if (autoplay && queue.length - nextIdx <= 2) {
                const nextSeed = getSongById(queue[nextIdx]);
                appendRecommendations(nextSeed);
            }
        } else if (repeatMode === 'all') {
            setCurrentIndex(0);
            setPlaying(true);
        } else if (autoplay) {
            // Queue is exhausted: fetch new recommendations immediately for infinite autoplay
            const activeSeed = currentSong || (queue[currentIndex] ? getSongById(queue[currentIndex]) : null);
            if (activeSeed && !recsInFlightRef.current) {
                setIsFetchingRecs(true);
                recsInFlightRef.current = true;
                try {
                    const recs = await fetchRecommendationsForSong(activeSeed);
                    if (recs && recs.length > 0) {
                        setSongCache(prev => {
                            const next = { ...prev };
                            recs.forEach(r => { next[r.id] = r; });
                            return next;
                        });
                        const newIds = recs.map(r => r.id);
                        setQueue(prev => [...prev, ...newIds]);
                        setCurrentIndex(nextIdx);
                        setPlaying(true);
                        return;
                    }
                } catch (e) {
                    console.warn("Infinite autoplay failed:", e);
                } finally {
                    recsInFlightRef.current = false;
                    setIsFetchingRecs(false);
                }
            }
            setPlaying(false);
        } else {
            setPlaying(false);
        }
    };

    const handlePrevSong = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setPlaying(true);
        } else if (repeatMode === 'all') {
            setCurrentIndex(queue.length - 1);
            setPlaying(true);
        }
    };

    const recordListen = async (duration, genre) => {
        if (currentSong?.isYouTube) return;
        try {
            const mins = Math.ceil((duration || 180) / 60);
            await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: mins, genre: genre || "Unknown" });
            user.totalMinutesListened += mins;
        } catch (e) { }
    };

    useEffect(() => {
        if (!currentSong || !('mediaSession' in navigator)) return;
        if (typeof MediaMetadata === 'function') {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentSong.title,
                    artist: currentSong.artistName,
                    album: "Astronote Music",
                    artwork: [{ src: currentSong.coverUrl || PERSON_PLACEHOLDER, sizes: '512x512', type: 'image/png' }]
                });
            } catch (error) {
                console.warn('Media Session metadata is unavailable.', error);
            }
        }

        // Safari exposes Media Session partially and throws for unsupported actions.
        const registerAction = (action, handler) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (error) {
                if (error.name !== 'NotSupportedError' && error.name !== 'TypeError') {
                    console.warn(`Media Session action "${action}" is unavailable.`, error);
                }
            }
        };

        registerAction('play', () => setPlaying(true));
        registerAction('pause', () => setPlaying(false));
        registerAction('previoustrack', handlePrevSong);
        registerAction('nexttrack', handleNextSong);
    }, [currentSong, currentIndex, queue]);

    useEffect(() => {
        if (sleepTime !== null && sleepTime > 0) {
            sleepIntervalRef.current = setTimeout(() => {
                setSleepTime(prev => prev <= 1 ? (setPlaying(false), null) : prev - 1);
            }, 60000);
        }
        return () => clearTimeout(sleepIntervalRef.current);
    }, [sleepTime]);

    // --- REUSABLE COMPONENTS ---
    const SongRow = ({ s, list, onClick }) => (
        <div className="glass-row" onClick={onClick ? onClick : () => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb" onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="row-info">
                <div className="row-title">{s.title}</div>
                <div className="row-artist">{s.artistName}</div>
            </div>
            <div className="row-actions">
                {!s.isYouTube && (
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(s.id) }}>
                        <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "rgba(255,255,255,0.5)"} />
                    </button>
                )}
                <div className="context-menu-container">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}>
                        <MoreHorizontal size={20} color="rgba(255,255,255,0.7)" />
                    </button>
                    {openMenuId === s.id && (
                        <div className="context-menu" onClick={e => e.stopPropagation()}>
                            <button className="menu-item" onClick={() => { playNow(s); setOpenMenuId(null); }}><PlayCircle /> Play Now</button>
                            
                            {/* --- CHANGED: Buttons exposed for YouTube songs too --- */}
                            <button className="menu-item" onClick={() => { playNext(s); setOpenMenuId(null); }}><ArrowRightCircle /> Play Next</button>
                            <button className="menu-item" onClick={() => { addToQueue(s); setOpenMenuId(null); }}><ListPlus /> Add to Queue</button>
                            
                            {/* Playlist still restricted to local */}
                            {!s.isYouTube && (
                                <button className="menu-item" onClick={() => { setShowPlaylistSelector(s.id); setOpenMenuId(null); }}><ListMusic /> Add to Playlist</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {showPlaylistSelector === s.id && (
                <div className="glass-dropdown-menu" style={{ position: 'fixed', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 250, padding: 10, background: 'rgba(20, 10, 40, 0.95)', border: '1px solid #ffffff44', borderRadius: 10 }}>
                    <div className="menu-header" style={{ marginBottom: 10, borderBottom: '1px solid #ffffff22' }}>Select Playlist</div>
                    {playlists.map(pl => (
                        <button key={pl.id} className="menu-option" onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id, s.id); }}>{pl.name}</button>
                    ))}
                    <button className="menu-option danger" style={{ marginTop: 10, background: '#ff0055aa' }} onClick={(e) => { e.stopPropagation(); setShowPlaylistSelector(null); }}>Cancel</button>
                </div>
            )}
        </div>
    );

    const HomeSongCard = ({ s, list }) => (
        <div className="glass-card song-card" onClick={() => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="marquee-container">
                <p className={`song-title ${(s.title || '').length > 15 ? 'marquee-text' : ''}`}>{s.title || 'Unknown title'}</p>
            </div>
            <div className="marquee-container">
                <p className={`song-artist ${(s.artistName || '').length > 15 ? 'marquee-text' : ''}`}>{s.artistName || 'Unknown artist'}</p>
            </div>
        </div>
    );

    const MainViewContent = useMemo(() => {
        return (
            <>
                <style>{CUSTOM_STYLES}</style>
                {activeTab === 'home' && (
                    <div className="tab-pane home-animate">
                        <header className="glass-header">
                            <img src="/my-brand.png" alt="Logo" height="32" />
                            <div className="header-text">
                                <h1>Hi, {user.username}</h1>
                                <p>Welcome to your galaxy.</p>
                            </div>
                        </header>

                        <div className="usp-slider">
                            {USP_FEATURES.map((feat, i) => (
                                <div key={i} className="glass-card usp-card" style={{ background: feat.accent }}>
                                    <div className="usp-icon">{feat.icon}</div>
                                    <h3>{feat.title}</h3>
                                    <p>{feat.subtitle}</p>
                                </div>
                            ))}
                        </div>

                        <div className="dashboard-grid">
                            <div className="mini-card" onClick={() => handleNavClick('leaderboard')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/trophy.jpeg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><Trophy size={16}/> Rankings</div></div>
                            </div>
                            <div className="mini-card" onClick={() => handleNavClick('planet')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/planetscard.jpeg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><Sparkle size={16}/> Your Aura</div></div>
                            </div>
                            <div className="mini-card full-width" onClick={() => handleNavClick('all-songs')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/my-art.jpg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><ListMusic size={16}/> Browse All Music</div></div>
                            </div>
                        </div>

                        <h2 className="section-title">Top Artists</h2>
                        <div className="horizontal-scroll">
                            {FEATURED_ARTISTS.map((artist, i) => (
                                <div 
                                    key={i} 
                                    className="song-card"
                                    onClick={() => { setSelectedArtist(artist); setActiveTab('artist-view'); }}
                                    style={{ width: 120, marginRight: 16, cursor: 'pointer' }}
                                >
                                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', marginBottom: 8 }}>
                                        <img 
                                            src={artist.image} 
                                            alt={artist.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
                                        />
                                    </div>
                                    <p className="song-title" style={{ textAlign: 'center', fontSize: 13 }}>
                                        {artist.name}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <h2 className="section-title">Specials</h2>
                        <div 
                            className="artistic-box" 
                            onClick={() => { setSpecialView('christmas'); setActiveTab('special-view'); }}
                            style={{
                                position: 'relative',
                                height: '140px',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                backgroundImage: 'url(/banners/christmas-banner.png)', 
                                backgroundSize: 'cover',
                                backgroundPosition: 'center right',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                paddingLeft: '20px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                marginTop: '10px'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)',
                                zIndex: 1
                            }}></div>

                            <div style={{ zIndex: 2, position: 'relative', textAlign: 'left' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    fontSize: '1.2rem', 
                                    fontWeight: 'bold', 
                                    color: 'white',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    <Sparkles size={18} color="#00ffff"/> Christmas Hits
                                </div>
                                <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#ddd', 
                                    marginTop: '4px',
                                    fontWeight: '400'
                                }}>
                                    Feel the magic of the season
                                </div>
                            </div>
                        </div>

                        <h2 className="section-title">Cosmic Arrivals</h2>
                        <div className="horizontal-scroll">
                            {homeFeed.map(s => <HomeSongCard key={s.id} s={s} list={homeFeed} />)}
                        </div>

                        <h2 className="section-title">Discovery</h2>
                        <div className="horizontal-scroll">
                            {discoveryFeed.map(s => <HomeSongCard key={s.id} s={s} list={discoveryFeed} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'artist-view' && selectedArtist && (
                    <div className="tab-pane">
                        <div className="glass-header">
                            <button className="icon-btn" onClick={goHome}><ArrowLeft size={24} color="white" /></button>
                            <div className="header-text">
                                <h1>{selectedArtist.name}</h1>
                                <p>Artist Discography</p>
                            </div>
                        </div>
                        <div className="list-vertical">
                            {isArtistLoading && <div style={{textAlign:'center', padding:20, color:'#888'}}>Loading tracks...</div>}
                            
                            {!isArtistLoading && artistSongsFromDb.length > 0 ? (
                                artistSongsFromDb.map(s => <SongRow key={s.id} s={s} list={artistSongsFromDb} />)
                            ) : !isArtistLoading && (
                                <div style={{textAlign:'center', color:'#888', marginTop: 20}}>
                                    No songs found matching "{selectedArtist.name}".<br/>
                                    <span style={{fontSize:12}}>Ensure artist name matches exactly in your database.</span>
                                </div>
                            )}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'special-view' && specialView === 'christmas' && (
                    <div className="tab-pane">
                        <div style={{
                            position: 'relative',
                            height: '160px', 
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center', 
                            alignItems: 'flex-start', 
                            padding: '20px',
                            marginBottom: '20px',
                            boxSizing: 'border-box',
                            backgroundImage: 'url(/banners/christmas-banner.png)', 
                            backgroundSize: 'cover',
                            backgroundPosition: 'center right',
                            borderRadius: '0 0 20px 20px',
                            overflow: 'hidden'
                        }}>
                            <button 
                                className="icon-btn" 
                                onClick={goHome} 
                                style={{ 
                                    position: 'absolute', 
                                    top: '15px', 
                                    left: '15px', 
                                    zIndex: 10,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '50%',
                                    padding: '5px'
                                }}
                            >
                                <ArrowLeft size={20} color="white" />
                            </button>

                            <div style={{ 
                                zIndex: 2, 
                                marginTop: '20px',
                                maxWidth: '60%',
                                textAlign: 'left'
                            }}>
                                <h1 style={{ 
                                    fontSize: '1.5rem',
                                    fontWeight: '700', 
                                    margin: '0 0 4px 0', 
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    Christmas Specials
                                </h1>
                                <p style={{ 
                                    fontSize: '0.85rem',
                                    margin: 0, 
                                    opacity: 0.9, 
                                    fontWeight: '400' 
                                }}>
                                    Curated for the Holidays
                                </p>
                            </div>
                        </div>

                        <div className="list-vertical">
                            {specialSongsList.length > 0 ? (
                                specialSongsList.map(s => <SongRow key={s.id} s={s} list={specialSongsList} />)
                            ) : (
                                <div style={{textAlign:'center', padding:20, color:'#aaa', fontSize: 14}}>
                                    No songs found matching IDs.<br/>
                                    <span style={{fontSize:12, opacity:0.7}}>Check SPECIAL_IDS in MusicApp.jsx</span>
                                </div>
                            )}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'all-songs' && (
                    <div className="tab-pane">
                        <div className="glass-header">
                            <button className="icon-btn" onClick={() => handleNavClick('home')}><ArrowLeft size={24} color="white" /></button>
                            <div className="header-text"><h1>All Songs</h1><p>{allSongs.length} Tracks</p></div>
                        </div>
                        <div className="list-vertical">
                            {allSongs.map(s => <SongRow key={s.id} s={s} list={allSongs} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="tab-pane">
                        <div className="ios-toggle-container">
                            <div 
                                className="ios-toggle-pill" 
                                style={{ left: searchMode === 'local' ? '4px' : 'calc(50% + 0px)' }}
                            ></div>
                            <button 
                                className="ios-toggle-btn" 
                                onClick={() => setSearchMode('local')}
                                style={{ color: searchMode === 'local' ? '#000' : '#fff' }}
                            >
                                Library
                            </button>
                            <button 
                                className="ios-toggle-btn" 
                                onClick={() => setSearchMode('global')}
                                style={{ color: searchMode === 'global' ? '#000' : '#fff' }}
                            >
                                <Youtube size={16} color={searchMode === 'global' ? "#ff0000" : "#ff0000"} /> Global
                            </button>
                        </div>

                        <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Search size={20} className="search-icon" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                            <input 
                                className="glass-input" 
                                placeholder={isListeningSearch ? "🎙️ Listening... speak now..." : (searchMode === 'global' ? "Search YouTube..." : "Search Library...")}
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                autoFocus 
                                style={{ paddingLeft: 40, paddingRight: 80 }} 
                            />
                            <div style={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 2 }}>
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="icon-btn" style={{ padding: 4 }} title="Clear">
                                        <X size={18} color="#ccc" />
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    className="icon-btn" 
                                    onClick={toggleVoiceSearch}
                                    title={isListeningSearch ? "Stop voice search" : "Voice search"}
                                    style={{
                                        padding: '6px',
                                        borderRadius: '50%',
                                        background: isListeningSearch ? 'rgba(255, 0, 85, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                                        border: isListeningSearch ? '1px solid #ff0055' : '1px solid rgba(255, 255, 255, 0.15)',
                                        animation: isListeningSearch ? 'pulseMic 1s infinite' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Mic size={18} color={isListeningSearch ? "#ff0055" : "#00ffff"} />
                                </button>
                            </div>
                        </div>
                        <div className="list-vertical">
                            {searchResults.map(s => <SongRow key={s.id} s={s} list={searchResults} onClick={() => playNow(s)} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="tab-pane">
                        <h2 className="page-title">Upload Music</h2>
                        <UploadCard onUploaded={loadFeeds} />
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <AIChatBot 
                        onPlaySong={handlePlayGuessedSong} 
                        allSongs={allSongs}
                    />
                )}

                {activeTab === 'leaderboard' && <Leaderboard user={user} />}

                {activeTab === 'library' && (
                    <div className="tab-pane">
                        <h2 className="page-title">Your Library</h2>
                        <div className="lib-box-container">
                            <div className={`lib-box ${libraryTab === 'liked' ? 'active' : ''}`} onClick={() => setLibraryTab('liked')}>
                                <Heart size={32} fill={libraryTab === 'liked' ? "#fff" : "none"} color="#fff" />
                                <span className="lib-box-title">Liked Songs</span>
                            </div>
                            <div className={`lib-box ${libraryTab === 'playlists' ? 'active' : ''}`} onClick={() => setLibraryTab('playlists')}>
                                <ListMusic size={32} color="#fff" />
                                <span className="lib-box-title">Playlists</span>
                            </div>
                        </div>
                        {libraryTab === 'liked' && (
                            likedSongs.length === 0 
                            ? <div style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No liked songs yet.</div>
                            : <div className="list-vertical">{likedSongs.map(s => <SongRow key={s.id} s={s} list={likedSongs} />)}</div>
                        )}
                        {libraryTab === 'playlists' && (
                            <PlaylistPanel playlists={playlists} onRefresh={fetchLibraryData} user={user} onPlayPlaylist={(pl) => { if (pl.songs?.length) playSong(pl.songs[0], pl.songs); }} />
                        )}
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'planet' && (
                    <div className="tab-pane">
                        <PlanetCard user={user} onClose={() => handleNavClick('home')} />
                        <button className="glass-btn logout-btn" onClick={onLogout}>Sign Out</button>
                        <div className="spacer"></div>
                    </div>
                )}
            </>
        );
    }, [activeTab, homeFeed, discoveryFeed, allSongs, searchResults, libraryTab, likedSongs, playlists, user, searchTerm, isListeningSearch, openMenuId, showPlaylistSelector, queue, currentIndex, shuffle, repeatMode, specialSongsList, artistSongsFromDb, isArtistLoading, selectedArtist, specialView, searchMode]);

    return (
        <div className="glass-shell">
            <div className="glass-viewport" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                {MainViewContent}
            </div>

            {currentSong && (
                <>
                    <div className={`glass-modal ${isFullScreenPlayer ? 'open' : ''} ${isLyricsExpanded ? 'transparent-mode' : ''}`}>
                        <div className="modal-scroll-body">
                            <div style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                                <div className="modal-header">
                                    <button onClick={closePlayer} className="icon-btn"><ChevronDown size={32} /></button>
                                    <button 
                                        className="icon-btn" 
                                        onClick={(e) => { e.stopPropagation(); handleShare(currentSong); }}
                                        style={{ marginLeft: 'auto', marginRight: '10px' }}
                                    >
                                        <Share2 size={24} color="white" />
                                    </button>
                                </div>
                                
                                <div className="art-glow-container" style={{ position: 'relative', overflow: 'hidden' }}>
                                    {currentSong.isYouTube ? (
                                        <div style={{ width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                             {/* NOTE: We set controls: 0 to hide default youtube player controls */}
                                             <YouTube 
                                                videoId={currentSong.id} 
                                                onReady={(e) => { 
                                                    playerRef.current = e.target; 
                                                    setDuration(e.target.getDuration());
                                                    e.target.playVideo(); 
                                                }}
                                                onError={(error) => {
                                                    console.warn('YouTube playback failed.', error.data);
                                                    playerRef.current = null;
                                                    setPlaying(false);
                                                }}
                                                opts={{
                                                    height: '100%',
                                                    width: '100%',
                                                    playerVars: { 
                                                        autoplay: 1, 
                                                        modestbranding: 1, 
                                                        controls: 0, // HIDE NATIVE CONTROLS
                                                        disablekb: 1,
                                                        fs: 0,
                                                        rel: 0
                                                    }
                                                }} 
                                                style={{ width: '100%', height: '100%' }}
                                                onEnd={handleNextSong}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" alt="" />
                                            <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" alt="" />
                                        </>
                                    )}
                                </div>

                                <div className="modal-meta"><h1>{currentSong.title}</h1><p>{currentSong.artistName}</p></div>
                            </div>
                            
                            <div className="modal-controls-wrapper" style={{ opacity: isLyricsExpanded ? 0 : 1, pointerEvents: isLyricsExpanded ? 'none' : 'auto', height: isLyricsExpanded ? 0 : 'auto', overflow: 'hidden' }}>
                                <Player 
                                    // Shared Props
                                    song={currentSong} 
                                    playing={playing} 
                                    onToggle={() => setPlaying(!playing)} 
                                    onNext={handleNextSong} 
                                    onPrev={handlePrevSong} 
                                    onToggleLike={() => toggleLike(currentSong.id)} 
                                    repeatMode={repeatMode} 
                                    onToggleRepeat={toggleRepeat} 
                                    shuffle={shuffle} 
                                    onToggleShuffle={toggleShuffle} 
                                    sleepTime={sleepTime} 
                                    onSetSleepTimer={setSleepTime}
                                    autoplay={autoplay}
                                    onToggleAutoplay={() => setAutoplay(prev => !prev)}
                                    
                                    // YouTube Specifics
                                    isYouTube={currentSong.isYouTube}
                                    currentTime={songCurrentTime} 
                                    duration={duration}           
                                    onSeek={handleSeek}
                                    
                                    // Local Specifics
                                    onEnded={() => { 
                                        recordListen(currentSong.durationSeconds, currentSong.genre); 
                                        handleNextSong(); 
                                    }} 
                                    onProgress={(c, t) => { 
                                        setSongProgress(t ? (c / t) * 100 : 0); 
                                        setSongCurrentTime(c); 
                                    }} 
                                />
                            </div>

                            <div className="modal-section" style={isLyricsExpanded ? { position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:2000, overflowY:'auto' } : {}}>
                                <div className={isLyricsExpanded ? '' : 'glass-inset'}>
                                    <LyricsPanel song={currentSong} currentTime={songCurrentTime} onExpand={() => setIsLyricsExpanded(true)} isFullMode={isLyricsExpanded} />
                                    {isLyricsExpanded && <button className="icon-btn" onClick={() => setIsLyricsExpanded(false)} style={{ position: 'fixed', top: 20, right: 20, zIndex: 2001, background: 'rgba(255,255,255,0.1)', padding: 8 }}><Minimize2 size={24} color="white"/></button>}
                                </div>
                            </div>

                            <div className="modal-section" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                                <div className="section-header" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ListMusic size={20} color="#aaa" />
                                        <h3>Up Next</h3>
                                        {isFetchingRecs && (
                                            <span style={{ fontSize: '11px', color: '#00ffff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Sparkles size={12} className="spin-slow" />
                                                Loading similar...
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button 
                                            type="button"
                                            className="icon-btn"
                                            onClick={() => setAutoplay(prev => !prev)}
                                            title="Autoplay recommended tracks infinitely"
                                            style={{
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                background: autoplay ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                border: autoplay ? '1px solid rgba(0, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                color: autoplay ? '#00ffff' : '#888',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <Sparkles size={12} />
                                            <span>Autoplay</span>
                                        </button>
                                        <button className="icon-btn" onClick={clearQueue} title="Clear Queue"><Trash2 size={18}/></button>
                                        <button className="icon-btn" onClick={restoreQueue} title="Restore Queue"><RotateCcw size={18}/></button>
                                    </div>
                                </div>
                                <div className="list-vertical">
                                    {queue.map((id, i) => {
                                        if (i < currentIndex - 2 || i > currentIndex + 20) return null;
                                        const s = getSongById(id);
                                        const isCurrent = i === currentIndex;
                                        return (
                                            <div key={`${id}-${i}`} className={`glass-row compact ${isCurrent ? 'active-row' : ''}`}>
                                                <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb small" alt="" />
                                                <div className="row-info"><div className="row-title" style={{ color: isCurrent ? 'var(--neon)' : 'white' }}>{s.title}</div><div className="row-artist">{s.artistName}</div></div>
                                                <div className="row-actions">
                                                    {!isCurrent && <button className="icon-btn" onClick={() => { setCurrentIndex(i); setPlaying(true); }}><Play size={14} /></button>}
                                                    <button className="icon-btn" onClick={() => moveItem(i, i - 1)}><ArrowUp size={16} /></button>
                                                    <button className="icon-btn" onClick={() => moveItem(i, i + 1)}><ArrowDown size={16} /></button>
                                                    <button className="icon-btn" onClick={() => removeAtIndex(i)}><Trash2 size={16} color="#666" /></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="spacer"></div>
                        </div>
                    </div>
                    {!isFullScreenPlayer && (
                        <div className="glass-dock" onClick={openPlayer}>
                            <div className="dock-left">
                                <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="dock-thumb" alt="" />
                                <div className="dock-info"><div className="dock-title">{currentSong.title}</div><div className="dock-artist">{currentSong.artistName}</div></div>
                            </div>
                            <div className="dock-right">
                                {!currentSong.isYouTube && (
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id) }}><Heart size={20} fill={currentSong.liked ? "#ff00cc" : "none"} color={currentSong.liked ? "#ff00cc" : "white"} /></button>
                                )}
                                <button className="icon-btn dock-play" onClick={(e) => { e.stopPropagation(); setPlaying(!playing) }}>{playing ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" style={{ marginLeft: 2 }} />}</button>
                            </div>
                            <div className="dock-progress"><div className="dock-progress-fill" style={{ width: `${songProgress}%` }}></div></div>
                        </div>
                    )}
                </>
            )}

            <nav className="glass-nav" style={{ display: isLyricsExpanded ? 'none' : 'flex' }}>
                <button className={activeTab === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}>
                    <Home size={24} /><span>Home</span>
                </button>
                <button className={activeTab === 'search' ? 'active' : ''} onClick={() => handleNavClick('search')}>
                    <Search size={24} /><span>Search</span>
                </button>
                <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => handleNavClick('ai')}>
                    <Bot size={24} /><span>Lyra</span>
                </button>
                <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => handleNavClick('upload')}>
                    <Rocket size={24} /><span>Upload</span>
                </button>
                <button className={activeTab === 'library' ? 'active' : ''} onClick={() => handleNavClick('library')}>
                    <Library size={24} /><span>Library</span>
                </button>
            </nav>
        </div>
    );
}
