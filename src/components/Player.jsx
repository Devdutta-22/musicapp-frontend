import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, 
  ChevronDown, MoreHorizontal, Timer, Moon
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
  // --- NEW PROPS FOR YOUTUBE ---
  isYouTube = false,
  currentTime = 0,     // Passed from parent for YouTube
  duration = 0,        // Passed from parent for YouTube
  onSeek               // Function to handle seeking in parent
}) {
  const audioRef = useRef(null);
  const rangeRef = useRef(null);
  
  // Local state for native audio
  const [localTime, setLocalTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // Determine which values to use based on mode
  const displayTime = isDragging ? localTime : (isYouTube ? currentTime : localTime);
  const displayDuration = isYouTube ? duration : localDuration;

  const onProgressRef = useRef(onProgress);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  // Sync Slider Background (The cool gradient)
  useEffect(() => {
    if (rangeRef.current) {
        const d = displayDuration || 1; // avoid divide by zero
        const percent = (displayTime / d) * 100;
        rangeRef.current.style.setProperty('--seek-pos', `${percent}%`);
    }
  }, [displayTime, displayDuration]);

  // Handle Play/Pause for LOCAL AUDIO ONLY
  useEffect(() => {
    if (!isYouTube && audioRef.current) {
      if (playing) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => console.log("Playback prevented:", error));
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing, isYouTube]);

  const handleLoadedMetadata = () => {
    if (audioRef.current && !isYouTube) {
        setLocalDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging && !isYouTube) {
      const c = audioRef.current.currentTime;
      const d = audioRef.current.duration;
      setLocalTime(c);
      if (onProgressRef.current) onProgressRef.current(c, d);
    }
  };

  const handleSeekChange = (e) => {
    // Just update visual slider while dragging
    setLocalTime(Number(e.target.value));
  };

  const handleSeekEnd = (e) => {
    const newTime = Number(e.target.value);
    
    if (isYouTube) {
        // Tell parent to seek YouTube
        if (onSeek) onSeek(newTime); 
    } else if (audioRef.current) {
        // Seek local audio
        audioRef.current.currentTime = newTime;
        setLocalTime(newTime);
    }
    setIsDragging(false);
  };

  const handleAudioEnded = () => {
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      onEnded(); 
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
      <style>{`
        .progress-section {
          display: flex !important;
          flex-direction: column;
          justify-content: center;
          height: auto;
          min-height: 40px; 
        }
        .seek-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          background: transparent; 
          cursor: pointer;
          margin: 0;
          height: 20px;
        }
        .seek-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background-image: 
            linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent),
            linear-gradient(90deg, var(--cloud-blue), var(--cloud-pink)),
            linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.15));
          background-size: 0% 100%, var(--seek-pos, 0%) 100%, 100% 100%;
          background-repeat: no-repeat;
          background-position: -100% center, left center, left center;
        }
        .seek-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px; width: 20px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          margin-top: -7px; 
          transition: transform 0.1s;
        }
        .seek-slider:active::-webkit-slider-thumb {
          transform: scale(1.2);
        }
        /* Firefox Support */
        .seek-slider::-moz-range-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background-image: 
            linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent),
            linear-gradient(90deg, var(--cloud-blue), var(--cloud-pink)),
            linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.15));
          background-size: 0% 100%, var(--seek-pos, 0%) 100%, 100% 100%;
          background-repeat: no-repeat;
          background-position: -100% center, left center, left center;
        }
        .seek-slider::-moz-range-thumb {
          height: 20px; width: 20px;
          border-radius: 50%;
          background: white;
          border: none;
        }
        .seek-slider.buffering-active::-webkit-slider-runnable-track {
          animation: shimmer 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1); 
          background-size: 50% 100%, var(--seek-pos, 0%) 100%, 100% 100%;
        }
        @keyframes shimmer {
          0% { background-position: -100% center, left center, left center; }
          100% { background-position: 200% center, left center, left center; }
        }
      `}</style>
      
      <div className="player-header-row">
          <button className="icon-btn" onClick={onToggleLike}>
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
                  <Moon size={24} color="white"/>
              </button>

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

      <div className="progress-section">
          <input 
            type="range" 
            min="0" 
            max={displayDuration || 0} 
            value={displayTime} 
            className={`seek-slider ${buffering ? 'buffering-active' : ''}`} 
            ref={rangeRef}
            onChange={handleSeekChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleSeekEnd}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={handleSeekEnd}
          />
          <div className="time-row">
             <span>{formatTime(displayTime)}</span>
             <span>{formatTime(displayDuration)}</span>
          </div>
      </div>

      <div className="controls-row">
         <button className={`icon-btn ${shuffle ? 'active-dot' : ''}`} onClick={onToggleShuffle}>
            <Shuffle size={20} color={shuffle ? "#7c2cf2" : "white"} />
         </button>

         <button className="icon-btn" onClick={onPrev}>
            <SkipBack size={28} fill="white" />
         </button>

         <button className="play-btn-large" onClick={onToggle}>
            {playing ? <Pause size={32} fill="black"/> : <Play size={32} fill="black" style={{marginLeft:4}}/>}
         </button>

         <button className="icon-btn" onClick={onNext}>
            <SkipForward size={28} fill="white" />
         </button>

         <button className={`icon-btn ${repeatMode !== 'off' ? 'active-dot' : ''}`} onClick={onToggleRepeat}>
             {repeatMode === 'one' ? <Repeat1 size={20} color="#7c2cf2"/> : <Repeat size={20} color={repeatMode === 'all' ? "#00ff88" : "white"}/>}
         </button>
      </div>

      {/* ONLY RENDER AUDIO TAG FOR LOCAL SONGS */}
      {!isYouTube && (
        <audio
            ref={audioRef}
            src={song?.streamUrl} 
            autoPlay={playing}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            onLoadStart={() => setBuffering(true)}
            onWaiting={() => setBuffering(true)} 
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
        />
      )}
    </div>
  );
}
