// src/components/Player.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, Timer 
} from "lucide-react";
import '../App.css';

const PERSON_PLACEHOLDER = '/person-placeholder.png';

export default function Player({
  song,
  playing,
  onToggle,
  onToggleLike,
  onNext,
  onPrev,
  onEnded, // <--- The function that saves your stats
  repeatMode = 'off',
  onToggleRepeat,
  shuffle = false,
  onToggleShuffle,
  hideCover = false,
  hideMeta = false,
  onProgress, 
  sleepTime,       
  onSetSleepTimer, 
}) {
  const audioRef = useRef(null);
  const rangeRef = useRef(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [buffering, setBuffering] = useState(false);
  
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  // Sync ref for progress callback
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const stuckAttemptsRef = useRef(0);
  const stuckIntervalRef = useRef(null);

  function updateRange(percent) {
    const el = rangeRef.current;
    if (!el) return;
    if (!buffering) {
        el.style.background = `linear-gradient(90deg, var(--neon) ${percent}%, rgba(255,255,255,0.07) ${percent}%)`;
    }
  }

  function formatTime(sec) {
    if (!sec && sec !== 0) return "00:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60).toString();
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  }

  function attemptPlay() {
    const a = audioRef.current;
    if (!a) return;
    stuckAttemptsRef.current = 0;
    
    if (a.paused) {
        const p = a.play();
        if (p && typeof p.catch === 'function') {
           p.catch(() => {});
        }
    }
  }

  // --- AUDIO EVENT HANDLERS (Moved from useEffect to props) ---

  const handleLoadedMetadata = (e) => {
    const d = Math.floor(e.target.duration) || 0;
    setDuration(d);
    setBuffering(false);
    updateRange(d ? (e.target.currentTime / d) * 100 : 0);
  };

  const handleTimeUpdate = (e) => {
    if (!seeking) {
      const t = e.target.currentTime || 0;
      setTime(t);
      updateRange(duration ? (t / duration) * 100 : 0);
      if (onProgressRef.current) onProgressRef.current(t, duration); 
    }
  };

  const handleEnded = () => {
    console.log("Player: Song ended. Saving stats..."); // Debug log
    if (onEnded) onEnded(); 
  };

  const handleCanPlay = () => {
    setBuffering(false);
    if (playing) attemptPlay(); 
  };

  const handleError = (e) => {
    console.warn('Audio error', e); 
    setBuffering(false);
  };

  // --- SOURCE CHANGE ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setTime(0); setDuration(0); setBuffering(true);
    stuckAttemptsRef.current = 0;

    if (!song || !song.streamUrl) {
      try { audio.pause(); } catch(_) {}
      audio.removeAttribute('src'); audio.load();
      return;
    }

    const safeUrl = encodeURI(song.streamUrl);
    if (audio.src !== new URL(safeUrl, window.location.href).href && audio.src !== safeUrl) {
       audio.src = safeUrl; 
       try { audio.load(); } catch (_) {}
    }
  }, [song?.id, song?.streamUrl]);

  // --- WATCHDOG (Stuck Check) ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      attemptPlay();
      if (!stuckIntervalRef.current) {
        stuckIntervalRef.current = setInterval(() => {
          const a = audioRef.current;
          if (!a) return;
          if (playing && a.paused && !a.ended) {
            stuckAttemptsRef.current += 1;
            if (stuckAttemptsRef.current <= 6) {
              const p = a.play();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } else {
              clearInterval(stuckIntervalRef.current);
              stuckIntervalRef.current = null;
            }
          } else {
            stuckAttemptsRef.current = 0;
          }
        }, 1200);
      }
    } else {
      try { audio.pause(); } catch (_) {}
      if (stuckIntervalRef.current) { clearInterval(stuckIntervalRef.current); stuckIntervalRef.current = null; stuckAttemptsRef.current = 0; }
    }
  }, [playing]);

  // --- SEEKING ---
  function handleSeekChange(e) {
    const val = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) { setTime(val); updateRange(duration ? (val / duration) * 100 : 0); return; }
    audio.currentTime = isFinite(val) ? val : 0;
    setTime(audio.currentTime);
    updateRange(duration ? (audio.currentTime / duration) * 100 : 0);
    if (playing) attemptPlay();
  }

  // --- UI HANDLERS ---
  function handlePrev() { if (typeof onPrev === 'function') onPrev(); }
  function handleNext() { if (typeof onNext === 'function') onNext(); }
  function handleToggle() { if (typeof onToggle === 'function') onToggle(); }

  function handleSetSleep(min) {
    if (onSetSleepTimer) onSetSleepTimer(min);
    setShowSleepMenu(false);
  }

  return (
    <div className="player neon-player player--compact" role="region" aria-label="Now playing controls">
      {!hideMeta && song && (
        <div className="player-nowmeta" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!hideCover && (
            <img
              src={song.coverUrl || song.artistImageUrl || PERSON_PLACEHOLDER}
              alt={song.title || "cover"}
              className="nowplaying-cover"
              onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)}
            />
          )}
          <div className="nowplaying-text" style={{ minWidth: 0 }}>
            <div className="np-title" title={song.title}>{song.title}</div>
            <div className="np-artist" title={song.artistName}>{song.artistName}</div>
          </div>
        </div>
      )}

      <div className="slider-row" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 10 }}>
        <div className="time-left" aria-hidden style={{ fontSize: 12 }}>{formatTime(time)}</div>
        <input
          ref={rangeRef}
          className={`range neon-range ${buffering ? 'buffering' : ''}`}
          type="range"
          min={0}
          max={Math.max(duration || 0, 0)}
          step="0.01"
          value={Math.min(time, duration || 0)}
          onChange={handleSeekChange}
          onMouseDown={() => setSeeking(true)}
          onMouseUp={() => setSeeking(false)}
          onTouchStart={() => setSeeking(true)}
          onTouchEnd={() => setSeeking(false)}
          aria-label="Seek"
          style={{ flex: 1 }}
        />
        <div className="time-right" aria-hidden style={{ fontSize: 12 }}>{formatTime(duration)}</div>
      </div>

      <div className="controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 24, padding: '0 8px' }}>
        <button className={`icon-btn ${shuffle ? "active" : ""}`} onClick={onToggleShuffle} aria-pressed={shuffle} title="Shuffle">
          <Shuffle size={20}/>
        </button>
        <button className="icon-btn" onClick={handlePrev} title="Previous">
          <SkipBack size={26}/>
        </button>
        <button
          className="play-btn"
          onClick={handleToggle}
          title={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
        >
          {playing ? <Pause size={32}/> : <Play size={32}/>}
        </button>
        <button className="icon-btn" onClick={handleNext} title="Next">
          <SkipForward size={26}/>
        </button>
        <button className={`icon-btn ${repeatMode !== "off" ? "active" : ""}`} onClick={onToggleRepeat} title={`Repeat (${repeatMode})`} aria-pressed={repeatMode !== 'off'}>
          {repeatMode === "one" ? <Repeat1 size={20}/> : <Repeat size={20}/>}
        </button>
        
        {/* SLEEP TIMER */}
        <div style={{ position: 'relative' }}>
            <button 
                className={`icon-btn ${sleepTime ? 'active' : ''}`} 
                onClick={() => setShowSleepMenu(!showSleepMenu)} 
                title={sleepTime ? `${sleepTime}m left` : "Sleep Timer"}
            >
                <Timer size={20}/>
            </button>
            
            {showSleepMenu && (
                <div className="more-menu" style={{ bottom: '100%', right: '-10px', top: 'auto', marginBottom: 12, width: 120 }}>
                    <button className="menu-item" onClick={() => handleSetSleep(15)}>15 min</button>
                    <button className="menu-item" onClick={() => handleSetSleep(30)}>30 min</button>
                    <button className="menu-item" onClick={() => handleSetSleep(60)}>1 hour</button>
                    <button className="menu-item" onClick={() => handleSetSleep(null)} style={{color: '#ff4d7a'}}>Off</button>
                </div>
            )}
        </div>

        <button className={`icon-btn ${song?.liked ? "liked" : ""}`} onClick={onToggleLike} title={song?.liked ? 'Unlike' : 'Like'} aria-pressed={!!song?.liked}>
          <Heart size={20} fill={song?.liked ? "currentColor" : "none"}/>
        </button>
      </div>

      <audio
        ref={audioRef}
        src={song?.streamUrl ? encodeURI(song.streamUrl) : undefined} 
        preload="auto"
        autoPlay={playing}
        playsInline
        style={{ display: 'none' }}
        loop={repeatMode === 'one'} 
        
        // ✅ EVENTS ATTACHED DIRECTLY (This fixes the bug)
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded} 
        onWaiting={() => setBuffering(true)}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onStalled={() => setBuffering(true)}
      />
    </div>
  );
}
