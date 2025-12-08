// src/components/MusicApp.jsx
import React, { useEffect, useState, useRef } from 'react';
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
  TrendingUp, HardHat, Zap, Clock // Included Clock for completeness
} from "lucide-react"; 

const PERSON_PLACEHOLDER = '/person-placeholder.png';

// Custom hook for the slideshow interval
const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

// --- AD BOX CONTENT DEFINITION ---
const ALL_PROMOS = [
    // --- PAGE 1 (Default View) ---
    { title: "Planet Evolution", subtitle: "See your taste define your world.", icon: <Globe size={20} color="#00ffff" />, accent: "#0f3460" },
    { title: "Go Premium Today", subtitle: "Unlimited uploads & lossless audio.", icon: <TrendingUp size={20} color="#ff00cc" />, accent: "#6e1c4e" },
    { title: "Collaborative Playlists", subtitle: "Share your queue with friends.", icon: <ListMusic size={20} color="#ffff00" />, accent: "#4c4e1c" },
    { title: "Sleep Timer Pro", subtitle: "Auto-pause after a set time.", icon: <Clock size={20} color="#ffae00" />, accent: "#60420f" },
    
    // --- PAGE 2 (Sliding View) ---
    { title: "Lossless Audio", subtitle: "Hear every note, crystal clear.", icon: <Zap size={20} color="#ff00ff" />, accent: "#3e163e" },
    { title: "Custom Themes", subtitle: "Unlock exclusive color palettes.", icon: <Sparkle size={20} color="#ffffff" />, accent: "#1c6e6e" },
    { title: "Fast Loading", subtitle: "Progressive library download.", icon: <Rocket size={20} color="#00ff00" />, accent: "#35600f" },
    { title: "Ad-Free Experience", subtitle: "Enjoy music with zero interruption.", icon: <SkipForward size={20} color="#cccccc" />, accent: "#4e4c4c" },
];

// --- AD BOX GRID COMPONENT ---
function AdBoxGrid({ onFeatureClick }) {
    const [pageIndex, setPageIndex] = useState(0);
    const containerRef = useRef(null);

    const CARDS_PER_PAGE = 4;
    const TOTAL_PAGES = Math.ceil(ALL_PROMOS.length / CARDS_PER_PAGE);

    const handleScroll = (direction) => {
        setPageIndex(prev => {
            const newIndex = (prev + direction + TOTAL_PAGES) % TOTAL_PAGES;
            // Scroll the container to the correct position (handled by CSS)
            if (containerRef.current) {
                const scrollPos = containerRef.current.clientWidth * newIndex;
                // Use smooth scroll for manual navigation
                containerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' }); 
            }
            return newIndex;
        });
    };

    useInterval(() => {
        handleScroll(1);
    }, 8000); // Auto-scroll every 8 seconds

    // Map over ALL_PROMOS array in pages (ensure each group is wrapped)
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
            
            {/* Optional: Page Indicators */}
            <div className="ad-grid-dots">
                {[...Array(TOTAL_PAGES)].map((_, index) => (
                    <span 
                        key={index} 
                        className={`ad-dot ${index === pageIndex ? 'active' : ''}`}
                        onClick={() => { setPageIndex(index); handleScroll(index - pageIndex); }}
                    />
                ))}
            </div>

            {/* Optional: Manual Navigation Arrows */}
            {TOTAL_PAGES > 1 && (
                <>
                    <button className="ad-arrow left" onClick={() => handleScroll(-1)}>&lt;</button>
                    <button className="ad-arrow right" onClick={() => handleScroll(1)}>&gt;</button>
                </>
            )}
        </div>
    );
}

// ... (CoverImage function remains the same) ...
function CoverImage({ srcs = [], alt, className }) {
  const [src, setSrc] = useState(srcs.find(Boolean) || PERSON_PLACEHOLDER);
  useEffect(() => setSrc(srcs.find(Boolean) || PERSON_PLACEHOLDER), [JSON.stringify(srcs)]);
  const onError = (e) => { if (e.currentTarget.src !== PERSON_PLACEHOLDER) e.currentTarget.src = PERSON_PLACEHOLDER; };
  return <img src={src} alt={alt} className={className} onError={onError} />;
}


export default function MusicApp({ user, onLogout }) {
  const [songs, setSongs] = useState([]);          
  const [queue, setQueue] = useState([]);          
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); 
  const [shuffle, setShuffle] = useState(false);
  
  const [showPlanet, setShowPlanet] = useState(false); 
  const [showExitPrompt, setShowExitPrompt] = useState(false); // Used for animated exit prompt
  const [exitMascot, setExitMascot] = useState({}); // Stores the mascot image/text

  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [songProgress, setSongProgress] = useState(0);

  // Mascot expressions with messages (Keep this structure)
  const mascotExpressions = [
    { img: '/mascots/mascot-sad.png', msg: "Don't leave me alone in space! 🌌", sub: "I'll be floating here with your music waiting for you to come back! 🎵" },
    { img: '/mascots/mascot-crying.png', msg: "Please don't go! 😢", sub: "The stars won't be the same without you listening! ✨" },
    { img: '/mascots/mascot-lonely.png', msg: "It's so quiet without you! 🤫", sub: "Your playlists keep me company in the void! 🎶" },
    { img: '/mascots/mascot-puppy-eyes.png', msg: "Just one more song? 🥺", sub: "I promise this next track will blow your mind! 🚀" },
    { img: '/mascots/mascot-waving.png', msg: "Come back soon, okay? 👋", sub: "I'll keep your queue warm for you! 🔥" }
  ];

  // --- SLEEP TIMER STATE ---
  const [sleepTime, setSleepTime] = useState(null); 
  const sleepIntervalRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const [showQR, setShowQR] = useState(false);
  const qrUrl = window.location.href.replace("localhost", window.location.hostname);

  const [openMenuSongId, setOpenMenuSongId] = useState(null);
  const menuRef = useRef(null);

  const songsRef = useRef(songs);
  useEffect(() => { songsRef.current = songs }, [songs]);

  const current = songs.find(s => s.id === queue[currentIndex]) || null;

  // --- AD BOX SLIDESHOW STATE ---
  const [adActiveIndex, setAdActiveIndex] = useState(0); // State to control AdBox slide
  
  // No need for useInterval here, it's inside AdBoxGrid now.
  
  /* --- STATE PERSISTENCE: RESTORE ON MOUNT (Restored logic block) --- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('musicAppState');
      if (saved) {
        const state = JSON.parse(saved);
        
        // Only restore if saved within last 24 hours
        const timeDiff = Date.now() - (state.timestamp || 0);
        if (timeDiff < 24 * 60 * 60 * 1000) {
          
          if (state.queue?.length > 0) {
            setQueue(state.queue);
            setCurrentIndex(state.currentIndex ?? -1);
          }
          
          // Don't auto-resume playing - let user decide
          if (state.shuffle !== undefined) setShuffle(state.shuffle);
          if (state.repeatMode) setRepeatMode(state.repeatMode);
          if (state.isLibraryCollapsed !== undefined) {
            setIsLibraryCollapsed(state.isLibraryCollapsed);
          }
          
          console.log('✅ Session restored from', Math.floor(timeDiff / 60000), 'minutes ago');
        } else {
          // Clear old state
          localStorage.removeItem('musicAppState');
        }
      }
    } catch (e) {
      console.error('Failed to restore state:', e);
    }
  }, []); 

  /* --- STATE PERSISTENCE: SAVE ON CHANGES (Restored logic block) --- */
  useEffect(() => {
    // Only save if we have meaningful state
    if (queue.length === 0) return;

    const stateToSave = {
      queue,
      currentIndex,
      shuffle,
      repeatMode,
      isLibraryCollapsed,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('musicAppState', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [queue, currentIndex, shuffle, repeatMode, isLibraryCollapsed]);

  /* --- STATE PERSISTENCE: SAVE BEFORE CLOSE (Restored logic block) --- */
  useEffect(() => {
    const saveOnClose = () => {
      if (queue.length === 0) return;

      const stateToSave = {
        queue,
        currentIndex,
        shuffle,
        repeatMode,
        isLibraryCollapsed,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('musicAppState', JSON.stringify(stateToSave));
      } catch (e) {
        console.error('Failed to save on close:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) saveOnClose();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', saveOnClose);
    window.addEventListener('pagehide', saveOnClose);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', saveOnClose);
      window.removeEventListener('pagehide', saveOnClose);
    };
  }, [queue, currentIndex, shuffle, repeatMode, isLibraryCollapsed]);

  /* --- PWA SMART BACK BUTTON LOGIC (Restored logic block) --- */
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }

    const handleBackButton = () => {
        // Priority 1: Close exit prompt if open
        if (showExitPrompt) {
            setShowExitPrompt(false);
            window.history.pushState(null, '', window.location.href);
            return;
        }

        // Priority 2: Handle open modals/views
        if (showPlanet || showUpload) {
            setShowPlanet(false);
            setShowUpload(false);
            window.history.pushState(null, '', window.location.href);
            return;
        }

        // Priority 3: Collapse the expanded player view
        if (isLibraryCollapsed) {
            setIsLibraryCollapsed(false);
            window.history.pushState(null, '', window.location.href);
            return;
        }
        
        // Priority 4: Main screen - Show exit prompt with random mascot
        const randomExpression = mascotExpressions[Math.floor(Math.random() * mascotExpressions.length)];
        setExitMascot(randomExpression);
        setShowExitPrompt(true);
        window.history.pushState(null, '', window.location.href);
    };

    // Push initial state once
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handleBackButton);
    
    return () => {
        window.removeEventListener('popstate', handleBackButton);
    };
  }, [showPlanet, showUpload, isLibraryCollapsed, showExitPrompt]);

  /* --- PWA: PUSH STATE WHEN VIEWS OPEN (Restored logic block) --- */
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    
    if (showPlanet || showUpload || isLibraryCollapsed || showExitPrompt) {
      window.history.pushState(null, '', window.location.href);
    }
  }, [showPlanet, showUpload, isLibraryCollapsed, showExitPrompt]);
  
  /* --- SLEEP TIMER LOGIC --- */
  useEffect(() => {
    if (sleepTime !== null && sleepTime > 0) {
      sleepIntervalRef.current = setTimeout(() => {
        setSleepTime(prev => {
          if (prev <= 1) {
            setPlaying(false);
            return null;
          }
          return prev - 1;
        });
      }, 60000);
    }
    return () => clearTimeout(sleepIntervalRef.current);
  }, [sleepTime]);

  const activateSleepTimer = (minutes) => {
    setSleepTime(minutes);
    if(minutes) alert(`Sleep timer set for ${minutes} minutes`);
    else alert("Sleep timer turned off");
  };

  /* ---------- util ---------- */
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- fetch ---------- */
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

      // PROGRESSIVE LOADING: Show first 30 songs immediately
      const INITIAL_BATCH = 30;
      const initialSongs = data.slice(0, INITIAL_BATCH);
      const remainingSongs = data.slice(INITIAL_BATCH);

      // Set initial batch immediately - removes loading screen fast!
      const randomizedInitial = shuffleArray(initialSongs);
      setSongs(randomizedInitial);
      
      // Only set queue if we didn't restore from localStorage
      if (randomizedInitial.length && queue.length === 0) {
        setQueue(randomizedInitial.map(d => d.id));
        setCurrentIndex(0);
      }

      // ✅ CRITICAL: Turn off loading screen NOW so user sees first batch
      setIsLoading(false);

      // Load remaining songs in background (if any)
      if (remainingSongs.length > 0) {
        setIsLoadingMore(true);
        
        // Use setTimeout to let UI render first batch
        setTimeout(() => {
          const allSongs = shuffleArray([...initialSongs, ...remainingSongs]);
          setSongs(allSongs);
          
          // Update queue to include all songs (but keep current position)
          setQueue(prevQueue => {
            if (prevQueue.length > 0) {
              const existingIds = new Set(prevQueue);
              const newSongIds = allSongs
                .filter(s => !existingIds.has(s.id))
                .map(s => s.id);
              return [...prevQueue, ...newSongIds];
            } else {
              return allSongs.map(d => d.id);
            }
          });
          
          setIsLoadingMore(false);
          console.log(`✅ Loaded ${allSongs.length} songs total`);
        }, 500); // Half second delay to let UI render smoothly
      }

    } catch (e) {
      console.error('fetchSongs', e);
      setSongs([]);
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchSongs(); }, []); 

  async function recordListen(durationSeconds, songGenre) {
    if (!user || !durationSeconds) return;

    const API_BASE = "https://musicapp-o3ow.onrender.com"; 
    
    const minutes = Math.ceil(durationSeconds / 60);
    const genrePayload = songGenre || "Unknown";

    console.log(`Sending Data: ${minutes} mins of ${genrePayload} to user ${user.username}`);

    try {
      await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { 
        minutes: minutes,
        genre: genrePayload 
      });
      
      if (user) {
          user.totalMinutesListened = (user.totalMinutesListened || 0) + minutes;
      }
      console.log("Stats & Evolution Updated!");
    } catch (e) {
      console.error("Could not record stats:", e);
    }
  }

  const visibleSongs = songs.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (s.title || '').toLowerCase().includes(q) || (s.artistName || '').toLowerCase().includes(q);
  });

  // --- MEDIA SESSION ---
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
  }, [current, playing]); 

  function playSong(song) {
    if (!song) return;
    const q = [...queue];
    const idx = q.indexOf(song.id);
    if (idx !== -1) {
      setCurrentIndex(idx);
    } else {
      const insertAt = Math.max(0, currentIndex + 1);
      q.splice(insertAt, 0, song.id);
      setQueue(q);
      setCurrentIndex(insertAt);
    }
    setPlaying(true);
    if (window.innerWidth <= 768) { setIsLibraryCollapsed(true); }
  }

  function toggleLike(songId) {
    setSongs(prev => prev.map(s => {
      if (s.id !== songId) return s;
      const newLiked = !s.liked;
      const newCount = Math.max(0, (s.likeCount || 0) + (newLiked ? 1 : -1));
      return { ...s, liked: newLiked, likeCount: newCount };
    }));
  }

  function toggleShuffle() {
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
  }

  function toggleRepeat() {
    setRepeatMode(r => {
      if (r === 'off') return 'all';
      if (r === 'all') return 'one';
      return 'off';
    });
  }

  function playNext({ manual = false } = {}) {
    if (!queue.length) return;
    if (repeatMode === 'one' && !manual) { setPlaying(true); return; }
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
      setPlaying(true);
    } else {
      if (repeatMode === 'all') { setCurrentIndex(0); setPlaying(true); } else { setPlaying(false); }
    }
  }

  function playPrev() {
    if (!queue.length) return;
    if (currentIndex > 0) { setCurrentIndex(ci => ci - 1); setPlaying(true); } 
    else { if (repeatMode === 'all') { setCurrentIndex(queue.length - 1); setPlaying(true); } else { setPlaying(true); } }
  }

  function playAtIndex(idx) { if (idx < 0 || idx >= queue.length) return; setCurrentIndex(idx); setPlaying(true); }
    
  function removeAtIndex(idx) {
    setQueue(prev => {
      const newQ = prev.slice(0, idx).concat(prev.slice(idx + 1));
      setCurrentIndex(ci => {
        if (newQ.length === 0) { setPlaying(false); return -1; }
        if (idx < ci) return ci - 1;
        if (idx === ci) return Math.min(idx, newQ.length - 1);
        return ci;
      });
      return newQ;
    });
  }

  function moveItem(oldIndex, newIndex) {
    setQueue(prev => {
      const q = [...prev];
      if (oldIndex < 0 || oldIndex >= q.length || newIndex < 0 || newIndex >= q.length) return q;
      const [item] = q.splice(oldIndex, 1);
      q.splice(newIndex, 0, item);
      setCurrentIndex(ci => {
        if (ci === oldIndex) return newIndex;
        if (oldIndex < ci && newIndex >= ci) return ci - 1;
        if (oldIndex > ci && newIndex <= ci) return ci + 1;
        return ci;
      });
      return q;
    });
  }

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuSongId(null);
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  function addToQueue(songId) { if (!songId) return; setQueue(prev => [...prev, songId]); setOpenMenuSongId(null); }
  function playNextNow(songId) { if (!songId) return; setQueue(prev => { const q = [...prev]; q.splice(Math.max(0, currentIndex + 1), 0, songId); return q; }); setOpenMenuSongId(null); }

  /* ---------- render ---------- */
  return (
    <div className="app-shell" style={{ alignItems: 'stretch' }}>
      
      {/* --- LIBRARY SIDEBAR --- */}
      <aside 
        className={`library card-surface ${isLibraryCollapsed ? 'collapsed' : ''}`} 
        style={{ 
          width: isLibraryCollapsed ? '80px' : `${sidebarWidth}px`, 
          minWidth: isLibraryCollapsed ? '80px' : `${sidebarWidth}px`,
          maxWidth: isLibraryCollapsed ? '80px' : '720px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: isLibraryCollapsed ? 0 : 12 }}>
          
          <div 
            onClick={() => window.location.reload()} 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, minWidth: 0, userSelect: 'none' }}
            title={`Logged in as ${user ? user.username : 'Guest'}`}
          >
            <img 
              src="/my-brand.png" 
              alt="Astronotes" 
              style={{ height: 33, width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              
              {!isLibraryCollapsed && (
              <>
                <button className="small-btn" onClick={() => setShowUpload(v => !v)} title="Upload Song">
                  {showUpload ? <ArrowLeft size={18}/>: <Rocket size={18} />} 
                </button>

                <button className="small-btn icon-only" onClick={() => setShowPlanet(true)} title="My Planet">
                   <Globe size={24} />
                </button>

                <button className="small-btn icon-only" onClick={onLogout} title="Sign Out">
                  <LogOut size={18}/>
                </button>
                
                <div style={{ position: 'relative' }}>
                  <button className="small-btn icon-only" onClick={() => setShowQR(v => !v)} title="QR Code">
                    <QrCode size={18}/>
                  </button>
                  {showQR && (
                    <div style={{ position: "absolute", right: 0, top: "45px", background: "rgba(0,0,0,0.9)", padding: "12px", borderRadius: "10px", zIndex: 200 }}>
                      <QRCodeCanvas value={qrUrl} size={160} bgColor="#000" fgColor="#fff" />
                    </div>
                  )}
                </div>
              </>
            )}

              <button 
                className="small-btn icon-only collapse-btn" 
                onClick={() => setIsLibraryCollapsed(v => !v)} 
              >
                {isLibraryCollapsed ? <ChevronRight size={22}/> : <ChevronLeft size={22}/>}
              </button>
          </div>
        </div>

        {!isLibraryCollapsed && (
          // --- SEARCH BAR AND AD BOX CONTAINER ---
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, }}>
            
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="search-input"
                  style={{ paddingLeft: 32, width: '100%' }}
                  />
                </div>
                {searchTerm && <button className="small-btn" onClick={() => setSearchTerm('')}>Clear</button>}
              </div>

            {/* --- NEW: MOVING SLIDESHOW AD BOX PLACEMENT --- */}
            <AdBoxGrid onFeatureClick={(index) => console.log(`Clicked ad index: ${index}`)} />

          </div>
        )}

        <div style={{ marginTop: 12 }}>
          {showUpload && !isLibraryCollapsed ? (
            <div className="upload-area"><UploadCard onUploaded={() => { fetchSongs(); setShowUpload(false); }} /></div>
          ) : (
            <div className="song-list" style={{ height: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: isLibraryCollapsed ? 0 : 4, position: 'relative' }}>
              
              {isLoading ? (
                <div className="loading-container">
                  <svg className="loading-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <div className="loading-text">Loading Library</div>
                </div>
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
                                <button className="menu-item" onClick={() => addToQueue(s.id)}>
                                    <ListPlus size={16} style={{marginRight: 8}}/> Add to queue
                                </button>
                                <button className="menu-item" onClick={() => playNextNow(s.id)}>
                                    <SkipForward size={16} style={{marginRight: 8}}/> Play next
                                </button>
                                <button className="menu-item" onClick={() => { playSong(s); setOpenMenuSongId(null); }}>
                                    <PlayCircle size={16} style={{marginRight: 8}}/> Play now
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {/* Loading More Indicator */}
                  {isLoadingMore && (
                    <div style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <svg 
                        style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Loading more songs...
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className={`player-area ${!isLibraryCollapsed ? 'mobile-hidden' : ''}`} style={{ flex: 1, minWidth: 0 }}>
        
        <div className="mobile-only-header">
           <button className="icon-btn" onClick={() => setIsLibraryCollapsed(false)}>
             <ChevronDown size={28} />
           </button>
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
                      
                      onEnded={() => { 
                          recordListen(current.durationSeconds || 180, current.genre); 
                          playNext({ manual: false });
                      }}
                      
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
            <div className="lyrics-box">
              <LyricsPanel song={current} />
            </div>
          </div>
        </div>

        <div className="queue-panel">
          <div className="queue-header">
            <div style={{ fontWeight: 700, display:'flex', alignItems:'center', gap:6 }}>
                <ListMusic size={18}/> Up Next
            </div>
            <div className="queue-controls">
              <button 
                className="small-btn icon-only" 
                title="Clear"
                onClick={() => {
                  const hasCurrent = currentIndex >= 0 && queue[currentIndex];
                  if (hasCurrent) {
                    setQueue([queue[currentIndex]]);
                    setCurrentIndex(0);
                    setPlaying(true);
                  } else {
                    if (window.confirm('Clear?')) { setQueue([]); setCurrentIndex(-1); setPlaying(false); }
                  }
                }}
              >
                <Trash2 size={16}/>
              </button>
              
              <button 
                className="small-btn icon-only" 
                onClick={() => { if (songsRef.current) setQueue(songsRef.current.map(s => s.id)); }} 
                title="Restore"
              >
                <RotateCcw size={16}/>
              </button>
            </div>
          </div>

          <div className="queue" style={{ maxHeight: '36vh', overflowY: 'auto' }}>
            {queue.length === 0 && <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Queue is empty</div>}
            {queue.map((id, idx) => {
              const s = songs.find(x => x.id === id) || { id, title: 'Unknown', artistName: '' };
              const isCurrent = idx === currentIndex;
              return (
                <div key={`${id}-${idx}`} className={`queue-item ${isCurrent ? 'current' : ''}`}>
                  <div className="q-left">
                    <img src={s.coverUrl || s.artistImageUrl || PERSON_PLACEHOLDER} alt={s.title} className="q-cover" onError={(e) => e.currentTarget.src = PERSON_PLACEHOLDER} />
                    <div className="q-meta">
                      <div className="q-title">{s.title}</div>
                      <div className="q-artist">{s.artistName}</div>
                    </div>
                  </div>
                  <div className="q-actions">
                    {!isCurrent && <button className="icon-btn" onClick={() => playAtIndex(idx)}><Play size={16}/></button>}
                    <button className="icon-btn" onClick={() => moveItem(idx, Math.max(0, idx - 1))}><ArrowUp size={16}/></button>
                    <button className="icon-btn" onClick={() => moveItem(idx, Math.min(queue.length - 1, idx + 1))}><ArrowDown size={16}/></button>
                    <button className="icon-btn danger" onClick={() => removeAtIndex(idx)}><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* --- MINI PLAYER (MOBILE ONLY) --- */}
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
             <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(current.id); }}>
               <Sparkle size={20} fill={current.liked ? "var(--neon-pink)" : "none"} color={current.liked ? "var(--neon-pink)" : "white"} />
             </button>
             <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }}>
               {playing ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}
             </button>
           </div>
           
           <div className="mini-progress">
             <div className="mini-progress-fill" style={{ width: `${songProgress}%`, transition: 'width 0.1s linear' }}></div>
           </div>
        </div>
      )}

      {/* PLANET CARD OVERLAY */}
      {showPlanet && <PlanetCard user={user} onClose={() => setShowPlanet(false)} />}

      {/* EXIT PROMPT OVERLAY */}
      {showExitPrompt && exitMascot && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowExitPrompt(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Custom Mascot Image - Random Expression */}
            <div style={{ marginBottom: '20px' }}>
              <img 
                src={exitMascot.img}
                alt="Mascot" 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  objectFit: 'contain',
                  animation: 'float 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))'
                }}
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML = '<div style="font-size: 80px; animation: float 3s ease-in-out infinite">🚀😢</div>';
                }}
              />
            </div>
            
            <h2 style={{ 
              color: 'white', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {exitMascot.msg}
            </h2>
            
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '16px', 
              lineHeight: '1.5',
              marginBottom: '24px' 
            }}>
              {exitMascot.sub}
            </p>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={() => setShowExitPrompt(false)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Stay & Keep Listening 🎧
              </button>

              <p style={{ 
                color: 'rgba(255, 255, 255, 0.5)', 
                fontSize: '13px',
                marginTop: '8px'
              }}>
                💡 Use your phone's home button or minimize to put the app in background
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 
