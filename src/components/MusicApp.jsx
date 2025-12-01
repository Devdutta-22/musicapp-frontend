// src/components/MusicApp.jsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import '../App.css';
import { QRCodeCanvas } from "qrcode.react";
import { 
  Heart, Trash2, ArrowUp, ArrowDown, Play, 
  MoreHorizontal, Plus, ListMusic, Shuffle, 
  PanelLeftClose, PanelLeftOpen, QrCode 
} from "lucide-react";

const PERSON_PLACEHOLDER = '/person-placeholder.png';

function CoverImage({ srcs = [], alt, className }) {
  const [src, setSrc] = useState(srcs.find(Boolean) || PERSON_PLACEHOLDER);
  useEffect(() => setSrc(srcs.find(Boolean) || PERSON_PLACEHOLDER), [JSON.stringify(srcs)]);
  const onError = (e) => { if (e.currentTarget.src !== PERSON_PLACEHOLDER) e.currentTarget.src = PERSON_PLACEHOLDER; };
  return <img src={src} alt={alt} className={className} onError={onError} />;
}

export default function MusicApp() {
  const [songs, setSongs] = useState([]);               
  const [queue, setQueue] = useState([]);               
  const [currentIndex, setCurrentIndex] = useState(-1); 
  const [playing, setPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); 
  const [shuffle, setShuffle] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Collapse State
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const [showQR, setShowQR] = useState(false);
  const qrUrl = window.location.href.replace("localhost", window.location.hostname);

  const [openMenuSongId, setOpenMenuSongId] = useState(null);
  const menuRef = useRef(null);

  const dragIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  const songsRef = useRef(songs);
  useEffect(() => { songsRef.current = songs }, [songs]);

  const current = songs.find(s => s.id === queue[currentIndex]) || null;

  /* ---------- util ---------- */
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- fetch (Client-Side Search Mode) ---------- */
  async function fetchSongs() {
    try {
      const API = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/,''); 
      // Always fetch ALL songs
      const requestUrl = `${API}/api/songs`;

      console.log('Fetching all songs:', requestUrl);
      const res = await axios.get(requestUrl);
      const data = (res.data || []).map(s => ({
        ...s,
        liked: !!s.liked,
        likeCount: typeof s.likeCount === 'number' ? s.likeCount : 0
      }));

      const randomized = shuffleArray(data);
      setSongs(randomized);

      if (randomized.length && queue.length === 0) {
        setQueue(randomized.map(d => d.id));
        setCurrentIndex(0);
      } else {
        setQueue(q => q.filter(id => randomized.some(d => d.id === id) || queue.includes(id)));
      }
    } catch (e) {
      console.error('fetchSongs', e);
      setSongs([]);
    }
  }

  useEffect(() => { fetchSongs(); }, []); 

  // --- CLIENT SIDE FILTERING (Fixes Search) ---
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

  /* ---------------- Core Logic ---------------- */
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
        {/* HEADER ROW */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: isLibraryCollapsed ? 0 : 12 }}>
          
          {/* Collapse Button is ALWAYS visible on Left */}
          <button 
                className="small-btn icon-only" 
                onClick={() => setIsLibraryCollapsed(v => !v)} 
                title={isLibraryCollapsed ? "Expand Library" : "Collapse Library"}
                style={{ zIndex: 50 }} 
             >
                {isLibraryCollapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}
          </button>

          {!isLibraryCollapsed && <h3 style={{ margin: 0, flex: 1 }}>Library</h3>}

          {/* Controls (QR, Add, Shuffle) */}
          {!isLibraryCollapsed && (
            <div style={{ display: 'flex', gap: 8 }}>
               <div style={{ position: 'relative' }}>
                 <button className="small-btn icon-only" onClick={() => setShowQR(v => !v)} title="QR Code">
                    <QrCode size={18}/>
                 </button>
                 {showQR && (
                  <div style={{ position: "absolute", right: 0, top: "40px", background: "rgba(0,0,0,0.9)", padding: "12px", borderRadius: "10px", zIndex: 200 }}>
                    <QRCodeCanvas value={qrUrl} size={160} bgColor="#000" fgColor="#fff" />
                  </div>
                )}
               </div>

               <button className="small-btn" onClick={() => setShowUpload(v => !v)} title="Upload">
                  {showUpload ? 'Back' : <Plus size={18}/>}
               </button>
               <button className="small-btn" onClick={() => toggleShuffle()} title="Shuffle Library">
                  <Shuffle size={18} color={shuffle ? 'var(--neon)' : 'white'} />
               </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {!isLibraryCollapsed && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="search-input"
            />
            {searchTerm && <button className="small-btn" onClick={() => setSearchTerm('')}>Clear</button>}
          </div>
        )}

        {/* List */}
        <div style={{ marginTop: 12 }}>
          {showUpload && !isLibraryCollapsed ? (
            <div className="upload-area"><UploadCard onUploaded={() => { fetchSongs(); setShowUpload(false); }} /></div>
          ) : (
            <div className="song-list" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: isLibraryCollapsed ? 0 : 4 }}>
              {/* USE VISIBLE SONGS (FILTERED) */}
              {visibleSongs.length === 0 && <div style={{ padding: 12, color: 'var(--text-secondary)' }}>No songs found.</div>}
              {visibleSongs.map(s => (
                <div key={s.id} className="song-item" onDoubleClick={() => playSong(s)} title={s.title}>
                  <CoverImage srcs={[s.coverUrl, s.artistImageUrl, PERSON_PLACEHOLDER]} alt={s.title} className="cover" />
                  
                  {!isLibraryCollapsed && (
                    <>
                      <div className="song-info">
                        <div className="title" title={s.title}>{s.title}</div>
                        <div className="artist" title={s.artistName}>{s.artistName}</div>
                      </div>

                      <div className="like-wrap">
                        <button className={`icon-btn ${s.liked ? 'liked' : ''}`} onClick={() => toggleLike(s.id)}>
                          <Heart size={18} fill={s.liked ? "currentColor" : "none"} />
                        </button>
                      </div>

                      <div className="more-wrap" ref={menuRef}>
                        <button className="icon-btn" onClick={(ev) => { ev.stopPropagation(); setOpenMenuSongId(openMenuSongId === s.id ? null : s.id); }}>
                          <MoreHorizontal size={18}/>
                        </button>
                        {openMenuSongId === s.id && (
                          <div className="more-menu" onClick={(ev) => ev.stopPropagation()}>
                            <button className="menu-item" onClick={() => addToQueue(s.id)}>Add to queue</button>
                            <button className="menu-item" onClick={() => playNextNow(s.id)}>Play next</button>
                            <button className="menu-item" onClick={() => { playSong(s); setOpenMenuSongId(null); }}>Play now</button>
                          </div>
                        )}
                      </div>
                      
                      <button className="icon-btn play-mini" onClick={() => playSong(s)}>
                        <Play size={16} fill="currentColor" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="player-area" style={{ flex: 1, minWidth: 0 }}>
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
                      onEnded={() => playNext({ manual: false })}
                      repeatMode={repeatMode}
                      onToggleRepeat={toggleRepeat}
                      shuffle={shuffle}
                      onToggleShuffle={toggleShuffle}
                      hideCover={true}
                      hideMeta={true}
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
              <button className="small-btn icon-only" onClick={() => setQueue([])} title="Clear"><Trash2 size={16}/></button>
              <button className="small-btn icon-only" onClick={() => { if (songsRef.current) setQueue(songsRef.current.map(s => s.id)); }} title="Restore">Restore</button>
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
    </div>
  );
}
