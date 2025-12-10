import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, 
  ChevronDown, MoreHorizontal, Timer
} from "lucide-react";
import '../App.css';

export default function Player({
  song,
  playing,
  onToggle,
  onToggleLike,
  onNext,
  onPrev,
  onEnded, 
  repeatMode = 'off',
  onToggleRepeat,
  shuffle = false,
  onToggleShuffle,
  onProgress, 
  sleepTime,       
  onSetSleepTimer,
  onMinimize // Handles closing the full-screen player
}) {
  const audioRef = useRef(null);
  const rangeRef = useRef(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // State for Three Dot Menu

  // Sync ref for progress callback
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // Audio Event Handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
        setDuration(audioRef.current.duration);
    }
    updateMediaSessionPosition();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const c = audioRef.current.currentTime;
      const d = audioRef.current.duration;
      setTime(c);
      if (onProgressRef.current) onProgressRef.current(c, d);
      updateRangeBackground(c, d);
      // Sync Media Session occasionally to prevent drift
      if (Math.floor(c) !== Math.floor(time)) updateMediaSessionPosition();
    }
  };

  const updateRangeBackground = (c, d) => {
    if (rangeRef.current) {
        const percent = (c / d) * 100 || 0;
        rangeRef.current.style.backgroundSize = `${percent}% 100%`;
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setTime(newTime);
    updateRangeBackground(newTime, duration);
    if (audioRef.current) {
        audioRef.current.currentTime = newTime;
    }
    updateMediaSessionPosition();
  };

  // Sync Media Session (Control Center on Phone)
  const updateMediaSessionPosition = () => {
    if ('mediaSession' in navigator && audioRef.current) {
      const audio = audioRef.current;
      if (!isFinite(audio.duration) || !isFinite(audio.currentTime)) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime,
        });
      } catch (e) { console.error(e); }
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  return (
    <div className="player-container">
      
      {/* 1. TOP HEADER (Minimize & Menu) */}
      <div className="player-header-row">
          <button 
            className="icon-btn" 
            onClick={onToggleLike}
         >
            <Heart 
                size={24} 
                fill={song?.liked ? "#ff00cc" : "none"} 
                color={song?.liked ? "#ff00cc" : "rgba(255,255,255,0.7)"} 
            />
         </button>
          
          <div className="relative-menu-container">
              <button 
                className={`icon-btn ${sleepTime ? 'active-dot' : ''}`} 
                onClick={() => setShowMenu(!showMenu)}
              >
                  <MoreHorizontal size={24} color="white"/>
              </button>

              {/* THREE DOT MENU DROPDOWN */}
              {showMenu && (
                  <div className="glass-dropdown-menu">
                      <div className="menu-header">
                          <Timer size={14} /> <span>Sleep Timer</span>
                      </div>
                      <button className={`menu-option ${sleepTime === 15 ? 'active' : ''}`} onClick={() => { onSetSleepTimer(15); setShowMenu(false); }}>15 Minutes</button>
                      <button className={`menu-option ${sleepTime === 30 ? 'active' : ''}`} onClick={() => { onSetSleepTimer(30); setShowMenu(false); }}>30 Minutes</button>
                      <button className={`menu-option ${sleepTime === 60 ? 'active' : ''}`} onClick={() => { onSetSleepTimer(60); setShowMenu(false); }}>1 Hour</button>
                      <button className="menu-option danger" onClick={() => { onSetSleepTimer(null); setShowMenu(false); }}>Turn Off</button>
                  </div>
              )}
          </div>
      </div>

      {/* 2. PROGRESS BAR AREA */}
      <div className="progress-section">
          {/* Bar on Top */}
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            value={time} 
            className="seek-slider"
            ref={rangeRef}
            onChange={handleSeek}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          />
          
          {/* Time Below Bar */}
          <div className="time-row">
             <span>{formatTime(time)}</span>
             <span>{formatTime(duration)}</span>
          </div>
      </div>

      {/* 3. CONTROLS AREA */}
      <div className="controls-row">
         
         {/* Heart Icon (Moved to Front) */}
         

         {/* Standard Controls */}
         <button className={`icon-btn ${shuffle ? 'active-dot' : ''}`} onClick={onToggleShuffle}>
            <Shuffle size={20} color={shuffle ? "#00ff88" : "white"} />
         </button>

         <button className="icon-btn" onClick={onPrev}>
            <SkipBack size={28} fill="white" />
         </button>

         {/* Play Button (Fixed Oval Issue) */}
         <button className="play-btn-large" onClick={onToggle}>
            {playing ? <Pause size={32} fill="black"/> : <Play size={32} fill="black" style={{marginLeft:4}}/>}
         </button>

         <button className="icon-btn" onClick={onNext}>
            <SkipForward size={28} fill="white" />
         </button>

         <button className={`icon-btn ${repeatMode !== 'off' ? 'active-dot' : ''}`} onClick={onToggleRepeat}>
             {repeatMode === 'one' ? <Repeat1 size={20} color="#00ff88"/> : <Repeat size={20} color={repeatMode === 'all' ? "#00ff88" : "white"}/>}
         </button>

      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={song?.streamUrl} 
        autoPlay={playing}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded} 
      />
    </div>
  );
}
