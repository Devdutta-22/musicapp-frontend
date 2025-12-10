import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, Timer 
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
  const [isDragging, setIsDragging] = useState(false);

  // Sync ref for progress callback
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // Audio Event Handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
        setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const c = audioRef.current.currentTime;
      const d = audioRef.current.duration;
      setTime(c);
      if (onProgressRef.current) onProgressRef.current(c, d);
      updateRangeBackground(c, d);
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
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  return (
    <div className="player-container">
      
      {/* 1. PROGRESS BAR AREA */}
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

      {/* 2. CONTROLS AREA */}
      <div className="controls-row">
         
         {/* Heart Icon (Moved to Front) */}
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
