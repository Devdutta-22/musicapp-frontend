// src/components/MusicApp.jsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import '../App.css';
import { QRCodeCanvas } from "qrcode.react";

const PERSON_PLACEHOLDER = '/person-placeholder.png';

function CoverImage({ srcs = [], alt, className }) {
  const [src, setSrc] = useState(srcs.find(Boolean) || PERSON_PLACEHOLDER);
  useEffect(() => setSrc(srcs.find(Boolean) || PERSON_PLACEHOLDER), [JSON.stringify(srcs)]);
  const onError = (e) => { if (e.currentTarget.src !== PERSON_PLACEHOLDER) e.currentTarget.src = PERSON_PLACEHOLDER; };
  return <img src={src} alt={alt} className={className} onError={onError} />;
}

export default function MusicApp() {
  const [songs, setSongs] = useState([]);               // full library (randomized)
  const [queue, setQueue] = useState([]);               // queue of song ids
  const [currentIndex, setCurrentIndex] = useState(-1); // index in queue
  const [playing, setPlaying] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'one' | 'all'
  const [shuffle, setShuffle] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Sidebar width (persisted)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem('gg_sidebar_width') || '', 10);
      if (!isNaN(v)) return v;
    } catch (e) { }
    return 400;
  });
  //qr code
  const [showQR, setShowQR] = useState(false);
  const qrUrl = window.location.href.replace("localhost", window.location.hostname);


  // menu
  const [openMenuSongId, setOpenMenuSongId] = useState(null);
  const menuRef = useRef(null);

  // drag/drop for queue
  const dragIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  const songsRef = useRef(songs);
  useEffect(() => { songsRef.current = songs }, [songs]);

  const current = songs.find(s => s.id === queue[currentIndex]) || null;

  /* ---------- util: shuffle array ---------- */
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- fetch songs (randomize library on fetch) ---------- */
  async function fetchSongs() {
    try {
      // Use REACT_APP_API_BASE_URL if present (set in Vercel / .env.local)
      const API = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/,''); // strip trailing slash
      const requestUrl = API ? `${API}/api/songs` : '/api/songs';
      console.log('Fetching songs from', requestUrl);

      const res = await axios.get(requestUrl);
      const data = (res.data || []).map(s => ({
        ...s,
        liked: !!s.liked,
        likeCount: typeof s.likeCount === 'number' ? s.likeCount : 0
      }));

      // Randomize left library order (one-per-fetch, as requested)
      const randomized = shuffleArray(data);
      setSongs(randomized);

      // Initialize queue if empty, or keep existing queue but remove stale ids
      if (randomized.length && queue.length === 0) {
        setQueue(randomized.map(d => d.id));
        setCurrentIndex(0);
      } else {
        setQueue(q => q.filter(id => randomized.some(d => d.id === id)));
        if (currentIndex >= 0 && !(randomized.some(d => d.id === queue[currentIndex]))) {
          setCurrentIndex(0);
        }
      }
    } catch (e) {
      console.error('fetchSongs', e);
      setSongs([]);
      setQueue([]);
      setCurrentIndex(-1);
    }
  }

  useEffect(() => { fetchSongs(); }, []); // load once on mount

  // --- NEW: MEDIA SESSION API (For Lock Screen Controls) ---
  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;

    // 1. Metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: "Rhino Music",
      artwork: [
        { src: current.coverUrl || current.artistImageUrl || PERSON_PLACEHOLDER, sizes: '512x512', type: 'image/png' }
      ]
    });

    // 2. Action Handlers
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext({ manual: true }));

  }, [current, playing]); // Update when song or state changes
  // ---------------------------------------------------------

  /* ---------------- playback & queue core ---------------- */

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
    if (repeatMode === 'one' && !manual) {
      setPlaying(true);
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
      setPlaying(true);
    } else {
      if (repeatMode === 'all') {
        setCurrentIndex(0);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    }
  }

  function playPrev() {
    if (!queue.length) return;
    if (currentIndex > 0) {
      setCurrentIndex(ci => ci - 1);
      setPlaying(true);
    } else {
      if (repeatMode === 'all') {
        setCurrentIndex(queue.length - 1);
        setPlaying(true);
      } else {
        setPlaying(true);
      }
    }
  }

  /* ---------------- queue helpers ---------------- */

  function playAtIndex(idx) {
    if (idx < 0 || idx >= queue.length) return;
    setCurrentIndex(idx);
    setPlaying(true);
  }

  function removeAtIndex(idx) {
    setQueue(prev => {
      if (idx < 0 || idx >= prev.length) return prev;
      const newQ = prev.slice(0, idx).concat(prev.slice(idx + 1));
      setCurrentIndex(ci => {
        if (newQ.length === 0) {
          setPlaying(false);
          return -1;
        }
        if (idx < ci) return ci - 1;
        if (idx === ci) {
          const nextIdx = Math.min(idx, newQ.length - 1);
          return nextIdx;
        }
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

  /* ---------------- overflow menu handlers ---------------- */

  // close menu when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setOpenMenuSongId(null);
      }
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  function addToQueue(songId) {
    if (!songId) return;
    setQueue(prev => [...prev, songId]);
    setOpenMenuSongId(null);
  }

  function playNextNow(songId) {
    if (!songId) return;
    setQueue(prev => {
      const q = [...prev];
      const insertAt = Math.max(0, currentIndex + 1);
      q.splice(insertAt, 0, songId);
      return q;
    });
    setOpenMenuSongId(null);
  }

  /* ---------------- drag & drop handlers for queue ---------------- */

  function onQueueDragStart(e, idx) {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) { }
    e.currentTarget.classList.add('dragging');
  }

  function onQueueDragOver(e, idx) {
    e.preventDefault();
    dragOverIndexRef.current = idx;
    e.currentTarget.classList.add('drag-over');
  }

  function onQueueDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function onQueueDrop(e, idx) {
    e.preventDefault();
    const from = dragIndexRef.current != null ? dragIndexRef.current : parseInt(e.dataTransfer.getData('text/plain') || '-1', 10);
    const to = idx;
    if (from === to || from < 0 || to < 0) {
      cleanupDragClasses();
      return;
    }
    moveItem(from, to);
    cleanupDragClasses();
  }

  function onQueueDragEnd() {
    cleanupDragClasses();
  }

  function cleanupDragClasses() {
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
    document.querySelectorAll('.queue-item.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.queue-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  /* ---------- filtered view (search) ---------- */
  const visibleSongs = songs.filter(s => {
    if (!searchTerm) return true;
    return (s.title || '').toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  /* ---------- render ---------- */
  return (
    <div className="app-shell" style={{ alignItems: 'stretch', ['--sidebar-width']: `${sidebarWidth}px` }}>
      <aside
        className="library card-surface"
        style={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          maxWidth: '720px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Library</h3>

          <div style={{ position: "relative" }}>
            <button className="small-btn" onClick={() => setShowQR(v => !v)}>
              📱 QR
            </button>

            {showQR && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "36px",
                  background: "rgba(0,0,0,0.85)",
                  padding: "12px",
                  borderRadius: "10px",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
                  zIndex: 200
                }}
              >
                <QRCodeCanvas
                  value={qrUrl}
                  size={160}
                  bgColor="#000"
                  fgColor="#ffffffff"
                />
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>
                  {qrUrl}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="small-btn"
              onClick={() => setShowUpload(v => !v)}
              aria-pressed={showUpload}
              title={showUpload ? 'Back to songs' : 'Upload song'}
            >
              {showUpload ? 'Back' : 'Upload'}
            </button>
            <button
              className="small-btn"
              onClick={() => { toggleShuffle(); }}
              title="Shuffle library / queue"
            >
              {shuffle ? 'Shuffle: On' : 'Shuffle: Off'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search songs by title..."
            aria-label="Search songs"
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '3px solid rgba(255,255,255,0.04)', background: 'transparent', color: 'var(--text-primary)' }}
          />
          <button className="small-btn" onClick={() => { setSearchTerm(''); }}>Clear</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {showUpload ? (
            <div className="upload-area">
              <UploadCard onUploaded={() => { fetchSongs(); setShowUpload(false); }} />
            </div>
          ) : (
            <div className="song-list" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: 8 }}>
              {visibleSongs.length === 0 && <div style={{ padding: 12, color: 'var(--text-secondary)' }}>No songs match your search.</div>}
              {visibleSongs.map(s => (
                <div key={s.id} className="song-item" onDoubleClick={() => playSong(s)}>
                  <CoverImage srcs={[s.coverUrl, s.artistImageUrl, PERSON_PLACEHOLDER]} alt={s.title} className="cover" />

                  <div className="song-info">
                    <div className="title" title={s.title}>{s.title}</div>
                    <div className="artist" title={s.artistName}>{s.artistName}</div>
                  </div>

                  {<div className="like-wrap">
                    <button
                      className={`like-btn ${s.liked ? 'liked' : ''}`}
                      title={s.liked ? 'Unlike' : 'Like'}
                      onClick={() => toggleLike(s.id)}
                    >
                      {s.liked ? '💖' : '♥️'}
                    </button>
                    <div className="like-count">{s.likeCount || 0}</div>
                  </div>}

                  {/* three-dot menu */}
                  <div className="more-wrap" ref={menuRef}>
                    <button
                      className="more-btn"
                      onClick={(ev) => { ev.stopPropagation(); setOpenMenuSongId(openMenuSongId === s.id ? null : s.id); }}
                      aria-expanded={openMenuSongId === s.id}
                      title="More actions"
                    >
                      ⋯
                    </button>

                    {openMenuSongId === s.id && (
                      <div className="more-menu" onClick={(ev) => ev.stopPropagation()}>
                        <button className="menu-item" onClick={() => { addToQueue(s.id); }}>
                          Add to queue
                        </button>
                        <button className="menu-item" onClick={() => { playNextNow(s.id); }}>Play next</button>
                        <button className="menu-item" onClick={() => { playSong(s); setOpenMenuSongId(null); }}>Play now</button>
                        <button className="menu-item" onClick={() => { /* consider hooking to open lyrics editor */ }}>Edit Lyrics</button>
                      </div>
                    )}
                  </div>

                  <button className="play-btn" onClick={() => playSong(s)}>Play</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* resizer (if present in your version) */}
      <div className="sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="Resize library" title="Drag to resize" />

      <main className="player-area" style={{ flex: 1, minWidth: 0 }}>
        <div className="content-split">
          <div className="nowplaying-left">
            {current ? (
              <div className="nowplaying-big">
                {/* --- AMBIENT GLOW CONTAINER START --- */}
                <div style={{ position: 'relative', width: '280px', height: '280px', margin: '0 auto 20px auto' }}>
                  
                  {/* 1. The Ambient Glow (Blurred Background) */}
                  <img
                    src={current.artistImageUrl || current.coverUrl || PERSON_PLACEHOLDER}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      filter: 'blur(40px) saturate(200%)', // High saturation makes it look like light
                      opacity: 0.5,
                      zIndex: 0,
                      transform: 'scale(1.1)', 
                      borderRadius: '24px',
                      pointerEvents: 'none' // Prevent clicking the glow
                    }}
                    onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)}
                  />

                  {/* 2. The Real Sharp Cover (Foreground) */}
                  <img
                    src={current.artistImageUrl || current.coverUrl || PERSON_PLACEHOLDER}
                    alt={current.title}
                    className="big-cover"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)', // Strong shadow to separate from glow
                      objectFit: 'cover'
                    }}
                    onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)}
                  />
                </div>
                {/* --- AMBIENT GLOW CONTAINER END --- */}

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
              <div style={{ color: 'var(--text-secondary)' }}>No song selected</div>
            )}
          </div>

          {/* RIGHT: LYRICS SECTION */}
          <div className="lyrics-right">
            <h2 className="lyrics-heading">Lyrics</h2>
            <div className="lyrics-box">
              <LyricsPanel song={current} />
            </div>
          </div>
        </div>

        {/* queue below the player area */}
        <div className="queue-panel">
          {/* Queue header with controls */}
          <div className="queue-header">
            <div style={{ fontWeight: 700 }}>Up Next</div>

            <div className="queue-controls">
              {/* Shuffle queue */}
              <button
                className="small-btn"
                onClick={() => { toggleShuffle(); }}
                title="Shuffle queue"
                aria-pressed={!!shuffle}
              >
                {shuffle ? 'Shuffle: On' : 'Shuffle'}
              </button>

              {/* Repeat mode toggle (off → all → one) */}
              <button
                className="small-btn"
                onClick={() => { toggleRepeat(); }}
                title="Toggle repeat"
              >
                {repeatMode === 'off' ? 'Repeat: Off' : repeatMode === 'all' ? 'Repeat: All' : 'Repeat: One'}
              </button>

              {/* Clear queue - preserve currently playing track (if any) */}
              <button
                className="small-btn"
                onClick={() => {
                  const hasCurrent = currentIndex >= 0 && queue[currentIndex];
                  if (hasCurrent) {
                    // keep current song only and keep playing
                    const currentId = queue[currentIndex];
                    setQueue([currentId]);
                    setCurrentIndex(0);
                    setPlaying(true);
                  } else {
                    // no current song — clear everything
                    if (!window.confirm('Clear the queue?')) return;
                    setQueue([]);
                    setCurrentIndex(-1);
                    setPlaying(false);
                  }
                }}
                title="Clear queue (keeps current playing)"
              >
                Clear
              </button>

              {/* Restore queue (rebuild from songs in original order) */}
              <button
                className="small-btn"
                onClick={() => {
                  if (songsRef && songsRef.current) {
                    setQueue(songsRef.current.map(s => s.id));
                    setCurrentIndex(0);
                  }
                }}
                title="Restore queue"
              >
                Restore
              </button>
            </div>
          </div>

          <div className="queue" style={{ maxHeight: '36vh', overflowY: 'auto' }}>
            {queue.length === 0 && <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Queue is empty</div>}
            {queue.map((id, idx) => {
              const s = songs.find(x => x.id === id) || { id, title: 'Unknown', artistName: '' };
              const isCurrent = idx === currentIndex;
              return (
                <div key={`${id}-${idx}`} className={`queue-item ${isCurrent ? 'current' : ''}`} draggable onDragStart={(e) => onQueueDragStart(e, idx)} onDragOver={(e) => onQueueDragOver(e, idx)} onDragLeave={onQueueDragLeave} onDrop={(e) => onQueueDrop(e, idx)} onDragEnd={onQueueDragEnd}>
                  <div className="q-left">
                    <img src={s.coverUrl || s.artistImageUrl || PERSON_PLACEHOLDER} alt={s.title} className="q-cover" onError={(e) => e.currentTarget.src = PERSON_PLACEHOLDER} />
                    <div className="q-meta">
                      <div className="q-title" title={s.title}>{s.title}</div>
                      <div className="q-artist" title={s.artistName}>{s.artistName}</div>
                    </div>
                  </div>

                  <div className="q-actions">
                    {!isCurrent && <button className="small-btn" onClick={() => playAtIndex(idx)}>Play</button>}
                    <button className="small-btn" onClick={() => removeAtIndex(idx)}>Remove</button>
                    <button className="small-btn" onClick={() => moveItem(idx, Math.max(0, idx - 1))}>↑</button>
                    <button className="small-btn" onClick={() => moveItem(idx, Math.min(queue.length - 1, idx + 1))}>↓</button>
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
