// src/components/MusicApp.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard'; 
import '../App.css';
import { QRCodeCanvas } from "qrcode.react";
import { 
  Heart, Trash2, ArrowUp, ArrowDown, Play, Pause,
  MoreVertical, ListMusic, Shuffle, 
  QrCode, ChevronDown, ChevronLeft, ChevronRight, 
  Search, Upload, Rocket, ListPlus, SkipForward, PlayCircle,
  RotateCcw, ArrowLeft, Sparkle, LogOut, User ,Globe,
  TrendingUp, HardHat, Zap, Orbit, Clock, Download 
} from "lucide-react"; 

const PERSON_PLACEHOLDER = '/person-placeholder.png';

// --- CUSTOM HOOKS ---

// 1. Optimized Interval Hook (Pauses in Background)
const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        function tick() {
            // CRITICAL FIX: Do not run interval if document is hidden to prevent background kills
            if (!document.hidden) {
                savedCallback.current();
            }
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

// --- DATA DEFINITIONS ---

const ALL_PROMOS = [
    // --- PAGE 1 (Default View) ---
    { title: "Planet Evolution", subtitle: "See your taste define your world.", icon: <Orbit size={20} color="#00ffff" />, accent: "#0f3460" },
    { title: "Go Premium Today", subtitle: "Unlimited uploads & lossless audio.", icon: <TrendingUp size={20} color="#ff00cc" />, accent: "#6e1c4e" },
    { title: "Collaborative Playlists", subtitle: "Share your queue with friends.", icon: <ListMusic size={20} color="#ffff00" />, accent: "#4c4e1c" },
    { title: "Sleep Timer Pro", subtitle: "Auto-pause after a set time.", icon: <Clock size={20} color="#ffae00" />, accent: "#60420f" },
    
    // --- PAGE 2 (Sliding View) ---
    { title: "Lossless Audio", subtitle: "Hear every note, crystal clear.", icon: <Zap size={20} color="#ff00ff" />, accent: "#3e163e" },
    { title: "Custom Themes", subtitle: "Unlock exclusive color palettes.", icon: <Sparkle size={20} color="#ffffff" />, accent: "#1c6e6e" },
    { title: "Fast Loading", subtitle: "Progressive library download.", icon: <Rocket size={20} color="#00ff00" />, accent: "#35600f" },
    { title: "Ad-Free Experience", subtitle: "Enjoy music with zero interruption.", icon: <SkipForward size={20} color="#cccccc" />, accent: "#4e4c4c" },
];

// --- SUB-COMPONENTS ---

function AdBoxGrid({ onFeatureClick }) {
    const [pageIndex, setPageIndex] = useState(0);
    const containerRef = useRef(null);

    const CARDS_PER_PAGE = 4;
    const TOTAL_PAGES = Math.ceil(ALL_PROMOS.length / CARDS_PER_PAGE);

    const handleScroll = (direction) => {
        setPageIndex(prev => {
            const newIndex = (prev + direction + TOTAL_PAGES) % TOTAL_PAGES;
            if (containerRef.current) {
                const scrollPos = containerRef.current.clientWidth * newIndex;
                containerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' }); 
            }
            return newIndex;
        });
    };

    // Auto-scroll every 8 seconds (Hook handles background pause)
    useInterval(() => {
        handleScroll(1);
    }, 8000); 

    return (
        <div className="ad-grid-wrapper">
            <div className="ad-grid-scroll-container" ref={containerRef}>
                {[...Array(TOTAL_PAGES)].map((_, page) => (
                    <div key={page} className="ad-grid-page">
                        {ALL_PROMOS.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE).map((card, index) => (
                            <div 
                                key={page * CARDS_PER_PAGE + index}
                                className="ad-box-item" 
                                style={{ background: card.accent }}
                                onClick={() => onFeatureClick(page * CARDS_PER_PAGE + index)}
                            >
                                {card.icon}
                                <div className="ad-content">
                                    <div className="ad-title">{card.title}</div>
                                    <div className="ad-subtitle">{card.subtitle}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            
            {/* Page Indicators */}
            <div className="ad-grid-dots">
                {[...Array(TOTAL_PAGES)].map((_, index) => (
                    <span 
                        key={index} 
                        className={`ad-dot ${index === pageIndex ? 'active' : ''}`}
                        onClick={() => { setPageIndex(index); handleScroll(index - pageIndex); }}
                    />
                ))}
            </div>

            {/* Navigation Arrows */}
            {TOTAL_PAGES > 1 && (
                <>
                    <button className="ad-arrow left" onClick={() => handleScroll(-1)}>&lt;</button>
                    <button className="ad-arrow right" onClick={() => handleScroll(1)}>&gt;</button>
                </>
            )}
        </div>
    );
}

function CoverImage({ srcs = [], alt, className }) {
  const [src, setSrc] = useState(srcs.find(Boolean) || PERSON_PLACEHOLDER);
  useEffect(() => setSrc(srcs.find(Boolean) || PERSON_PLACEHOLDER), [JSON.stringify(srcs)]);
  const onError = (e) => { if (e.currentTarget.src !== PERSON_PLACEHOLDER) e.currentTarget.src = PERSON_PLACEHOLDER; };
  return <img src={src} alt={alt} className={className} onError={onError} />;
}
// --- MAIN COMPONENT ---

export default function MusicApp({ user, onLogout }) {
  // 1. Data State
  const [songs, setSongs] = useState([]);          
  const [queue, setQueue] = useState([]);          
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  
  // 2. UI State
  const [showUpload, setShowUpload] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); 
  const [shuffle, setShuffle] = useState(false);
  const [showPlanet, setShowPlanet] = useState(false); 
  const [showExitPrompt, setShowExitPrompt] = useState(false); 
  const [exitMascot, setExitMascot] = useState({}); 
  const [showAccountMenu, setShowAccountMenu] = useState(false); // New Account Menu

  // 3. Scroll & Layout State
  const [showAdBar, setShowAdBar] = useState(true); 
  const scrollRef = useRef(null); 
  const lastScrollY = useRef(0); 
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Loading & Utils
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [songProgress, setSongProgress] = useState(0);
  const [openMenuSongId, setOpenMenuSongId] = useState(null);
  const menuRef = useRef(null);
  const songsRef = useRef(songs);
  
  // 5. Timer & PWA
  const [sleepTime, setSleepTime] = useState(null); 
  const sleepIntervalRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Constants
  const [showQR, setShowQR] = useState(false); 
  const qrUrl = window.location.href.replace("localhost", window.location.hostname);
  const current = songs.find(s => s.id === queue[currentIndex]) || null;
  const mascotExpressions = [
    { img: '/mascots/mascot-sad.png', msg: "Don't leave me alone in space!", sub: "I'll be floating here with your music waiting for you to come back!" },
    { img: '/mascots/mascot-crying.png', msg: "Please don't go!", sub: "The stars won't be the same without you listening!" },
    { img: '/mascots/mascot-lonely.png', msg: "It's so quiet without you!", sub: "Your playlists keep me company in the void!" },
    { img: '/mascots/mascot-puppy-eyes.png', msg: "Just one more song?", sub: "I promise this next track will blow your mind!" },
    { img: '/mascots/mascot-waving.png', msg: "Come back soon, okay?", sub: "I'll keep your queue warm for you!" }
  ];

  // Sync ref
  useEffect(() => { songsRef.current = songs }, [songs]);


  // --- HANDLERS: SCROLL LOGIC (Desktop Optimized) ---
  useEffect(() => {
    const handleScroll = () => {
        if (!scrollRef.current) return;
        
        const currentScrollY = scrollRef.current.scrollTop;
        const scrollDifference = currentScrollY - lastScrollY.current;
        const scrollThreshold = 10; 
        
        // CRITICAL: Only hide header on desktop (width > 768px)
        if (!isLibraryCollapsed && window.innerWidth > 768) { 
            if (currentScrollY > 60) { 
                if (scrollDifference > scrollThreshold) {
                    if (showAdBar) setShowAdBar(false);
                } else if (scrollDifference < -scrollThreshold) {
                    if (!showAdBar) setShowAdBar(true);
                }
            }
        }
        
        // Always show if near top
        if (currentScrollY <= 20) {
            if (!showAdBar) setShowAdBar(true);
        }
        lastScrollY.current = currentScrollY;
    };

    const element = scrollRef.current;
    if (element) {
        element.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
        if (element) element.removeEventListener('scroll', handleScroll, { passive: true });
    };
  }, [isLibraryCollapsed, showAdBar]); 

  // --- HANDLERS: PLAYBACK (Stabilized with useCallback) ---
  
  const playNext = useCallback(({ manual = false } = {}) => {
    setQueue(currentQueue => {
        if (!currentQueue.length) return currentQueue;
        return currentQueue;
    });
    
    setCurrentIndex(prevIndex => {
        if (queue.length === 0) return prevIndex;
        if (repeatMode === 'one' && !manual) { 
            setPlaying(true); 
            return prevIndex; 
        }
        const nextIdx = prevIndex + 1;
        if (nextIdx < queue.length) {
            setPlaying(true);
            return nextIdx;
        } else {
             if (repeatMode === 'all') { 
                 setPlaying(true);
                 return 0; 
             } else { 
                 setPlaying(false);
                 return prevIndex; 
             }
        }
    });
  }, [queue.length, repeatMode]);

  const playPrev = useCallback(() => {
    if (!queue.length) return;
    setCurrentIndex(prevIndex => {
        if (prevIndex > 0) { 
            setPlaying(true);
            return prevIndex - 1; 
        } else { 
            if (repeatMode === 'all') { 
                setPlaying(true);
                return queue.length - 1; 
            } else { 
                setPlaying(true);
                return prevIndex;
            } 
        }
    });
  }, [queue.length, repeatMode]);

  const toggleLike = useCallback((songId) => {
    setSongs(prev => prev.map(s => {
      if (s.id !== songId) return s;
      const newLiked = !s.liked;
      const newCount = Math.max(0, (s.likeCount || 0) + (newLiked ? 1 : -1));
      return { ...s, liked: newLiked, likeCount: newCount };
    }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(s => {
      const newS = !s;
      if (newS) {
        setQueue(q => shuffleArray(q));
        setCurrentIndex(0);
      } else {
        setQueue(() => songsRef.current.map(s => s.id));
        setCurrentIndex(() => {
          const id = current?.id;
          return id ? (songsRef.current.map(s => s.id).indexOf(id)) : 0;
        });
      }
      return newS;
    });
  }, [current]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(r => {
      if (r === 'off') return 'all';
      if (r === 'all') return 'one';
      return 'off';
    });
  }, []);

  const playSong = useCallback((song) => {
    if (!song) return;
    setQueue(prevQ => {
        const q = [...prevQ];
        const idx = q.indexOf(song.id);
        if (idx !== -1) {
             setCurrentIndex(idx);
             return q;
        } else {
             const insertAt = Math.max(0, currentIndex + 1);
             q.splice(insertAt, 0, song.id);
             setCurrentIndex(insertAt);
             return q;
        }
    });
    setPlaying(true);
    if (window.innerWidth <= 768) { setIsLibraryCollapsed(true); }
  }, [currentIndex]);


  // --- UTILS & FETCH ---
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const recordListen = useCallback(async (durationSeconds, songGenre) => {
    if (!user || !durationSeconds) return;
    const API_BASE = "https://musicapp-o3ow.onrender.com"; 
    const minutes = Math.ceil(durationSeconds / 60);
    const genrePayload = songGenre || "Unknown";
    try {
      await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: minutes, genre: genrePayload });
      if (user) { user.totalMinutesListened = (user.totalMinutesListened || 0) + minutes; }
    } catch (e) { console.error("Stats Error:", e); }
  }, [user]);

  async function fetchSongs() {
    setIsLoading(true);
    try {
      const API = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/,''); 
      const requestUrl = `${API}/api/songs`; 
      const res = await axios.get(requestUrl);
      const data = (res.data || []).map(s => ({
        ...s,
        liked: !!s.liked,
        likeCount: typeof s.likeCount === 'number' ? s.likeCount : 0
      }));
      
      const INITIAL_BATCH = 30;
      const initialSongs = data.slice(0, INITIAL_BATCH);
      const remainingSongs = data.slice(INITIAL_BATCH);
      const randomizedInitial = shuffleArray(initialSongs);
      
      setSongs(randomizedInitial);
      if (randomizedInitial.length && queue.length === 0) {
        setQueue(randomizedInitial.map(d => d.id));
        setCurrentIndex(0);
      }
      setIsLoading(false);

      if (remainingSongs.length > 0) {
        setIsLoadingMore(true);
        setTimeout(() => {
          const allSongs = shuffleArray([...initialSongs, ...remainingSongs]);
          setSongs(allSongs);
          setQueue(prevQueue => {
             const existing = new Set(prevQueue);
             const newIds = allSongs.filter(s => !existing.has(s.id)).map(s => s.id);
             return [...prevQueue, ...newIds];
          });
          setIsLoadingMore(false);
        }, 500); 
      }
    } catch (e) {
      console.error(e);
      setSongs([]);
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchSongs(); }, []); 

  // --- EFFECTS: PWA & SYSTEM ---
  
  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Back Button Logic (Optimized)
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    const isModalOpen = showPlanet || showUpload || isLibraryCollapsed || showExitPrompt || showAccountMenu;
    const handleBackButton = (event) => {
        if (showExitPrompt) { setShowExitPrompt(false); return; }
        if (showAccountMenu) { setShowAccountMenu(false); return; }
        if (showPlanet) { setShowPlanet(false); return; }
        if (showUpload) { setShowUpload(false); return; }
        if (isLibraryCollapsed) { setIsLibraryCollapsed(false); return; }
        const randomExpression = mascotExpressions[Math.floor(Math.random() * mascotExpressions.length)];
        setExitMascot(randomExpression);
        setShowExitPrompt(true);
    };
    window.addEventListener('popstate', handleBackButton);
    if (isModalOpen) { window.history.pushState(null, '', window.location.href); }
    return () => { window.removeEventListener('popstate', handleBackButton); };
  }, [showPlanet, showUpload, isLibraryCollapsed, showExitPrompt, showAccountMenu]);

  // Save State on Close
  useEffect(() => {
    const saveState = () => {
      if (queue.length === 0) return;
      const stateToSave = { queue, currentIndex, shuffle, repeatMode, isLibraryCollapsed, timestamp: Date.now() };
      localStorage.setItem('musicAppState', JSON.stringify(stateToSave));
    };
    const handleVisibility = () => { if (document.hidden) saveState(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', saveState);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', saveState);
    };
  }, [queue, currentIndex, shuffle, repeatMode, isLibraryCollapsed]);

  // Restore State
  useEffect(() => {
    try {
      const saved = localStorage.getItem('musicAppState');
      if (saved) {
        const state = JSON.parse(saved);
        if (Date.now() - (state.timestamp || 0) < 24 * 60 * 60 * 1000) {
          if (state.queue?.length) { setQueue(state.queue); setCurrentIndex(state.currentIndex ?? -1); }
          if (state.shuffle !== undefined) setShuffle(state.shuffle);
          if (state.repeatMode) setRepeatMode(state.repeatMode);
          if (state.isLibraryCollapsed !== undefined) setIsLibraryCollapsed(state.isLibraryCollapsed);
        } else { localStorage.removeItem('musicAppState'); }
      }
    } catch (e) { console.error(e); }
  }, []);

  // Sleep Timer
  useEffect(() => {
    if (sleepTime !== null && sleepTime > 0) {
      sleepIntervalRef.current = setTimeout(() => {
        setSleepTime(prev => { if (prev <= 1) { setPlaying(false); return null; } return prev - 1; });
      }, 60000);
    }
    return () => clearTimeout(sleepIntervalRef.current);
  }, [sleepTime]);

  // Click Outside Account Menu
  useEffect(() => {
    function onDocClick(e) {
      const btn = document.getElementById('account-menu-btn');
      const menu = document.getElementById('account-menu');
      if (btn && !btn.contains(e.target) && menu && !menu.contains(e.target)) {
        setShowAccountMenu(false);
      }
    }
    window.addEventListener('click', onDocClick);
    const handleEsc = (e) => { if (e.key === 'Escape') setShowAccountMenu(false); };
    window.addEventListener('keydown', handleEsc);
    return () => {
        window.removeEventListener('click', onDocClick);
        window.removeEventListener('keydown', handleEsc);
    };
  }, []); 

  // Media Session
  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: "Rhino Music",
      artwork: [{ src: current.coverUrl || current.artistImageUrl || PERSON_PLACEHOLDER, sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext({ manual: true }));
  }, [current, playing, playNext, playPrev]);

  // Derived State & Handlers
  const visibleSongs = songs.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (s.title || '').toLowerCase().includes(q) || (s.artistName || '').toLowerCase().includes(q);
  });

  const handleAdClick = (index) => {
      if (index === 0) setShowPlanet(true);
      else console.log(`Clicked Ad ${index}`);
  };

  function addToQueue(songId) { if (!songId) return; setQueue(prev => [...prev, songId]); setOpenMenuSongId(null); }
  function playNextNow(songId) { if (!songId) return; setQueue(prev => { const q = [...prev]; q.splice(Math.max(0, currentIndex + 1), 0, songId); return q; }); setOpenMenuSongId(null); }
    /* ---------- RENDER ---------- */
  return (
    <div className="app-shell" style={{ alignItems: 'stretch' }}>
      
      {/* --- SIDEBAR --- */}
      <aside 
        className={`library card-surface ${isLibraryCollapsed ? 'collapsed' : ''}`} 
        style={{ 
          width: isLibraryCollapsed ? '80px' : `${sidebarWidth}px`, 
          minWidth: isLibraryCollapsed ? '80px' : `${sidebarWidth}px`,
          maxWidth: isLibraryCollapsed ? '80px' : '720px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: isLibraryCollapsed ? 0 : 12, flexShrink: 0 }}>
          <div onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, minWidth: 0 }}>
            <img src="/my-brand.png" alt="Astronotes" style={{ height: 33, width: 'auto', maxWidth: '120px', objectFit: 'contain' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, position: 'relative' }}>
              {!isLibraryCollapsed && (
              <>
                {isInstallable && (
                  <button className="small-btn icon-only" onClick={handleInstallClick} title="Install App" style={{ background: 'rgba(0, 255, 128, 0.15)', color: '#00ff80', borderColor: '#00ff80' }}>
                    <Download size={20} />
                  </button>
                )}
                <button className="small-btn" onClick={() => setShowUpload(v => !v)} title="Upload"><Rocket size={18} /></button>
                <button className="small-btn icon-only" onClick={() => setShowPlanet(true)} title="My Planet"><Orbit size={24} /></button>
                
                <button id="account-menu-btn" className={`small-btn icon-only ${showAccountMenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowAccountMenu(v => !v); }}>
                    <User size={24} />
                </button>

                {showAccountMenu && (
                    <div id="account-menu" className="more-menu" style={{ top: '45px', right: 0, width: '180px', padding: '8px 6px', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '6px 12px', fontSize: '14px', color: '#9146ff', fontWeight: 'bold', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '4px' }}>
                            {user.username}
                        </div>
                        <button className="menu-item" onClick={onLogout}><LogOut size={16} style={{marginRight: 8}}/> Sign Out</button>
                    </div>
                )}
              </>
            )}
              <button className="small-btn icon-only collapse-btn" onClick={() => setIsLibraryCollapsed(v => !v)}>
                {isLibraryCollapsed ? <ChevronRight size={22}/> : <ChevronLeft size={22}/>}
              </button>
          </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="library-content" ref={scrollRef}>
          {!isLibraryCollapsed && (
            <div style={{ 
                marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, 
                transition: 'transform 0.3s ease-out, opacity 0.3s ease-out, margin-bottom 0.3s ease-out, height 0.3s ease-out',
                transform: showAdBar ? 'translateY(0)' : 'translateY(-100%)',
                opacity: showAdBar ? 1 : 0,
                marginBottom: showAdBar ? 10 : 0, 
                pointerEvents: showAdBar ? 'auto' : 'none', 
                height: showAdBar ? 'auto' : '0px', 
                overflow: 'hidden' 
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="search-input" style={{ paddingLeft: 32, width: '100%' }} />
                  </div>
                  {searchTerm && <button className="small-btn" onClick={() => setSearchTerm('')}>Clear</button>}
                </div>
              <AdBoxGrid onFeatureClick={handleAdClick} />
            </div>
          )}

          <div style={{ marginTop: 12, position: 'relative' }}> 
            {showUpload && !isLibraryCollapsed ? (
              <div className="upload-area"><UploadCard onUploaded={() => { fetchSongs(); setShowUpload(false); }} /></div>
            ) : (
              <div className="song-list" style={{ paddingRight: isLibraryCollapsed ? 0 : 4, position: 'relative' }}>
                {isLoading ? (
                  <div className="loading-container"><div className="loading-text">Loading Library</div></div>
                ) : visibleSongs.length === 0 ? (
                    <div style={{ padding: 12, color: 'var(--text-secondary)' }}>No songs found.</div>
                ) : (
                  <>
                    {visibleSongs.map(s => (
                      <div key={s.id} className="song-item" onClick={() => playSong(s)} title={s.title}>
                        <CoverImage srcs={[s.coverUrl, s.artistImageUrl, PERSON_PLACEHOLDER]} alt={s.title} className="cover" />
                        {!isLibraryCollapsed && (
                          <>
                            <div className="song-info">
                              <div className="title" title={s.title}>{s.title}</div>
                              <div className="artist" title={s.artistName}>{s.artistName}</div>
                            </div>
                            <div className="like-wrap">
                              <button className={`icon-btn ${s.liked ? 'liked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(s.id); }}>
                                <Heart size={18} fill={s.liked ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <div className="more-wrap" ref={menuRef}>
                              <button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); setOpenMenuSongId(openMenuSongId === s.id ? null : s.id); }}>
                                <MoreVertical size={20}/>
                              </button>
                              {openMenuSongId === s.id && (
                                <div className="more-menu" onClick={(ev) => ev.stopPropagation()}>
                                  <button className="menu-item" onClick={() => addToQueue(s.id)}><ListPlus size={16}/> Add to queue</button>
                                  <button className="menu-item" onClick={() => playNextNow(s.id)}><SkipForward size={16}/> Play next</button>
                                  <button className="menu-item" onClick={() => { playSong(s); setOpenMenuSongId(null); }}><PlayCircle size={16}/> Play now</button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {isLoadingMore && <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px' }}>Loading more...</div>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN PLAYER AREA --- */}
      <main className={`player-area ${!isLibraryCollapsed ? 'mobile-hidden' : ''}`} style={{ flex: 1, minWidth: 0 }}>
        <div className="mobile-only-header">
           <button className="icon-btn" onClick={() => setIsLibraryCollapsed(false)}><ChevronDown size={28} /></button>
        </div>

        <div className="content-split">
          <div className="nowplaying-left">
            {current ? (
              <div className="nowplaying-big">
                 <div className="glow-container">
                  <img src={current.artistImageUrl || current.coverUrl || PERSON_PLACEHOLDER} alt="" className="glow-bg" onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)} />
                  <img src={current.artistImageUrl || current.coverUrl || PERSON_PLACEHOLDER} alt={current.title} className="real-cover" onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)} />
                </div>
                <div className="big-text">
                  <div className="big-title">{current.title}</div>
                  <div className="big-artist">{current.artistName}</div>
                  <div style={{ marginTop: 12 }}>
                    <Player
                      song={current}
                      playing={playing}
                      onToggle={() => setPlaying(p => !p)}
                      onToggleLike={() => current && toggleLike(current.id)}
                      onNext={() => playNext({ manual: true })}
                      onPrev={() => playPrev()}
                      onEnded={useCallback(() => { 
                          if (current) recordListen(current.durationSeconds || 180, current.genre); 
                          playNext({ manual: false });
                      }, [current, playNext])} 
                      repeatMode={repeatMode}
                      onToggleRepeat={toggleRepeat}
                      shuffle={shuffle}
                      onToggleShuffle={toggleShuffle}
                      hideCover={true}
                      hideMeta={true}
                      onProgress={(curr, total) => setSongProgress(total ? (curr / total) * 100 : 0)}
                      sleepTime={sleepTime}
                      onSetSleepTimer={activateSleepTimer}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', marginTop: 40 }}>Select a song to play</div>
            )}
          </div>
          <div className="lyrics-right">
            <h2 className="lyrics-heading">Lyrics</h2>
            <div className="lyrics-box"><LyricsPanel song={current} /></div>
          </div>
        </div>

        <div className="queue-panel">
          <div className="queue-header">
            <div style={{ fontWeight: 700, display:'flex', alignItems:'center', gap:6 }}><ListMusic size={18}/> Up Next</div>
            <div className="queue-controls">
              <button className="small-btn icon-only" title="Clear" onClick={() => { if(window.confirm('Clear?')) { setQueue([]); setCurrentIndex(-1); setPlaying(false); } }}><Trash2 size={16}/></button>
              <button className="small-btn icon-only" title="Restore" onClick={() => { if (songsRef.current) setQueue(songsRef.current.map(s => s.id)); }}><RotateCcw size={16}/></button>
            </div>
          </div>
          <div className="queue" style={{ height: '36vh', overflowY: 'auto' }}>
            {queue.map((id, idx) => {
              const s = songs.find(x => x.id === id) || { id, title: 'Unknown', artistName: '' };
              const isCurrent = idx === currentIndex;
              return (
                <div key={`${id}-${idx}`} className={`queue-item ${isCurrent ? 'current' : ''}`}>
                  <div className="q-left">
                    <img src={s.coverUrl || s.artistImageUrl || PERSON_PLACEHOLDER} className="q-cover" onError={(e) => e.currentTarget.src = PERSON_PLACEHOLDER} />
                    <div className="q-meta"><div className="q-title">{s.title}</div><div className="q-artist">{s.artistName}</div></div>
                  </div>
                  <div className="q-actions">
                    {!isCurrent && <button className="icon-btn" onClick={() => playAtIndex(idx)}><Play size={16}/></button>}
                    <button className="icon-btn" onClick={() => removeAtIndex(idx)}><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {current && !isLibraryCollapsed && (
        <div className="mini-player" onClick={() => setIsLibraryCollapsed(true)}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
             <img src={current.coverUrl || current.artistImageUrl || PERSON_PLACEHOLDER} className="mini-cover" onError={(e)=>e.currentTarget.src=PERSON_PLACEHOLDER}/>
             <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
               <div className="mini-title">{current.title}</div>
               <div className="mini-artist">{current.artistName}</div>
             </div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(current.id); }}><Sparkle size={20} fill={current.liked ? "var(--neon-pink)" : "none"} color={current.liked ? "var(--neon-pink)" : "white"} /></button>
             <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}</button>
           </div>
           <div className="mini-progress"><div className="mini-progress-fill" style={{ width: `${songProgress}%`, transition: 'width 0.1s linear' }}></div></div>
        </div>
      )}

      {showPlanet && <PlanetCard user={user} onClose={() => setShowPlanet(false)} />}

      {showExitPrompt && exitMascot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowExitPrompt(false)}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '24px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '2px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.3s ease-out' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '20px' }}>
              <img src={exitMascot.img} alt="Mascot" style={{ width: '120px', height: '120px', objectFit: 'contain', animation: 'float 3s ease-in-out infinite', filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = '<div style="font-size: 80px; animation: float 3s ease-in-out infinite">🚀😢</div>'; }} />
            </div>
            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{exitMascot.msg}</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' }}>{exitMascot.sub}</p>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button onClick={() => setShowExitPrompt(false)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 24px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>Stay & Keep Listening 🎧</button>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', marginTop: '8px' }}>💡 Use your phone's home button or minimize to put the app in background</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                }
                       
