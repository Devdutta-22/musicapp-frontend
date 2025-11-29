// // src/Player.jsx  (REPLACE)
// import React, { useEffect, useRef, useState } from 'react';
// import {
//   Play, Pause, SkipBack, SkipForward,
//   Shuffle, Repeat, Repeat1, Heart
// } from "lucide-react";
// import '../App.css';

// const PERSON_PLACEHOLDER = '/person-placeholder.png';

// export default function Player({
//   song,
//   playing,
//   onToggle,
//   onToggleLike,
//   onNext,
//   onPrev,
//   onEnded,
//   repeatMode = 'off',
//   onToggleRepeat,
//   shuffle = false,
//   onToggleShuffle,
//   hideCover = false,
//   hideMeta = false,
// }) {
//   const audioRef = useRef(null);
//   const rangeRef = useRef(null);
//   const [time, setTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [seeking, setSeeking] = useState(false);
//   const [buffering, setBuffering] = useState(false);

//   // stuck-resume detection
//   const stuckAttemptsRef = useRef(0);
//   const stuckIntervalRef = useRef(null);

//   // Update range visual fill
//   function updateRange(percent) {
//     const el = rangeRef.current;
//     if (!el) return;
//     el.style.background = `linear-gradient(90deg, var(--neon) ${percent}%, rgba(255,255,255,0.07) ${percent}%)`;
//   }

//   function formatTime(sec) {
//     if (!sec && sec !== 0) return "00:00";
//     const s = Math.floor(sec);
//     const m = Math.floor(s / 60).toString();
//     const ss = Math.floor(s % 60).toString().padStart(2, "0");
//     return `${m}:${ss}`;
//   }

//   // attempt play and handle returned promise politely
//   function attemptPlay() {
//     const a = audioRef.current;
//     if (!a) return;
//     stuckAttemptsRef.current = 0;
//     const p = a.play();
//     if (p && typeof p.catch === 'function') {
//       p.catch(() => {
//         // suppress autoplay rejection noise — stuck detector will retry
//       });
//     }
//   }

//   // Attach robust event listeners to audio element
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;

//     function onLoadedMetadata(e) {
//       const d = Math.floor(e.target.duration) || 0;
//       setDuration(d);
//       updateRange(d ? (time / d) * 100 : 0);
//     }

//     function onTimeUpdate(e) {
//       if (!seeking) {
//         const t = e.target.currentTime || 0;
//         setTime(t);
//         updateRange(duration ? (t / duration) * 100 : 0);
//       }
//     }

//     function onWaiting() {
//       setBuffering(true);
//     }

//     function onCanPlay() {
//       setBuffering(false);
//       if (playing) {
//         attemptPlay();
//       }
//     }

//     function onStalled() {
//       setBuffering(true);
//       // allow canplay/canplaythrough to resume
//     }

//     function onEndedInternal() {
//       if (typeof onEnded === 'function') onEnded();
//     }

//     function onError(e) {
//       console.warn('Audio error', e);
//       setBuffering(false);
//     }

//     audio.addEventListener('loadedmetadata', onLoadedMetadata);
//     audio.addEventListener('timeupdate', onTimeUpdate);
//     audio.addEventListener('waiting', onWaiting);
//     audio.addEventListener('canplay', onCanPlay);
//     audio.addEventListener('stalled', onStalled);
//     audio.addEventListener('ended', onEndedInternal);
//     audio.addEventListener('error', onError);

//     return () => {
//       audio.removeEventListener('loadedmetadata', onLoadedMetadata);
//       audio.removeEventListener('timeupdate', onTimeUpdate);
//       audio.removeEventListener('waiting', onWaiting);
//       audio.removeEventListener('canplay', onCanPlay);
//       audio.removeEventListener('stalled', onStalled);
//       audio.removeEventListener('ended', onEndedInternal);
//       audio.removeEventListener('error', onError);
//       // cleanup stuck detector
//       if (stuckIntervalRef.current) {
//         clearInterval(stuckIntervalRef.current);
//         stuckIntervalRef.current = null;
//       }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [duration, seeking, playing, onEnded]);

//   // When song changes: load src, reset times, and try to play if playing
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     setTime(0);
//     setDuration(0);
//     setBuffering(false);
//     stuckAttemptsRef.current = 0;

//     if (!song || !song.streamUrl) {
//       // clear
//       try { audio.pause(); } catch(_) {}
//       audio.removeAttribute('src');
//       audio.load();
//       return;
//     }

//     // if different src, update and load
//     if (audio.src !== song.streamUrl) {
//       audio.src = song.streamUrl;
//       try { audio.load(); } catch (_) {}
//     }

//     // attempt play if UI says playing
//     if (playing) {
//       setTimeout(() => attemptPlay(), 50);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [song?.id, song?.streamUrl]);

//   // When playing prop changes: play/pause and start/stop stuck detector
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;

//     if (playing) {
//       // attempt play immediately
//       attemptPlay();

//       // start stuck-detection loop (only one interval)
//       if (!stuckIntervalRef.current) {
//         stuckIntervalRef.current = setInterval(() => {
//           const a = audioRef.current;
//           if (!a) return;
//           // if app expects playing, but DOM audio is paused and not ended -> try to recover
//           if (playing && a.paused && !a.ended) {
//             stuckAttemptsRef.current += 1;
//             if (stuckAttemptsRef.current <= 6) {
//               const p = a.play();
//               if (p && typeof p.catch === 'function') p.catch(() => {});
//             } else {
//               // too many attempts — stop interval until user interacts again
//               clearInterval(stuckIntervalRef.current);
//               stuckIntervalRef.current = null;
//             }
//           } else {
//             // audio playing fine -> reset attempts
//             stuckAttemptsRef.current = 0;
//           }
//         }, 1200);
//       }
//     } else {
//       // pause and clear detector
//       try { audio.pause(); } catch (_) {}
//       if (stuckIntervalRef.current) {
//         clearInterval(stuckIntervalRef.current);
//         stuckIntervalRef.current = null;
//         stuckAttemptsRef.current = 0;
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [playing]);

//   // Seek handler
//   function handleSeekChange(e) {
//     const val = Number(e.target.value);
//     const audio = audioRef.current;
//     if (!audio) {
//       setTime(val);
//       updateRange(duration ? (val / duration) * 100 : 0);
//       return;
//     }
//     audio.currentTime = isFinite(val) ? val : 0;
//     setTime(audio.currentTime);
//     updateRange(duration ? (audio.currentTime / duration) * 100 : 0);

//     // if we think we should be playing, try to resume
//     if (playing) attemptPlay();
//   }

//   // UI handlers
//   function handlePrev() { if (typeof onPrev === 'function') onPrev(); }
//   function handleNext() { if (typeof onNext === 'function') onNext(); }
//   function handleToggle() { if (typeof onToggle === 'function') onToggle(); }

//   // Render
//   return (
//     <div className="player neon-player player--compact" role="region" aria-label="Now playing controls">
//       {/* singer cover & meta (hidden if parent wants) */}
//       {!hideMeta && song && (
//         <div className="player-nowmeta" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
//           {!hideCover && (
//             <img
//               src={song.coverUrl || song.artistImageUrl || PERSON_PLACEHOLDER}
//               alt={song.title || "cover"}
//               className="nowplaying-cover"
//               onError={(e) => (e.currentTarget.src = PERSON_PLACEHOLDER)}
//             />
//           )}
//           <div className="nowplaying-text" style={{ minWidth: 0 }}>
//             <div className="np-title" title={song.title}>{song.title}</div>
//             <div className="np-artist" title={song.artistName}>{song.artistName}</div>
//           </div>
//         </div>
//       )}

//       {/* slider row with times */}
//       <div className="slider-row" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 10 }}>
//         <div className="time-left" aria-hidden style={{ fontSize: 12 }}>{formatTime(time)}</div>

//         <input
//           ref={rangeRef}
//           className="range neon-range"
//           type="range"
//           min={0}
//           max={Math.max(duration || 0, 0)}
//           step="0.01"
//           value={Math.min(time, duration || 0)}
//           onChange={handleSeekChange}
//           onMouseDown={() => setSeeking(true)}
//           onMouseUp={() => setSeeking(false)}
//           onTouchStart={() => setSeeking(true)}
//           onTouchEnd={() => setSeeking(false)}
//           aria-label="Seek"
//           style={{ flex: 1 }}
//         />

//         <div className="time-right" aria-hidden style={{ fontSize: 12 }}>{formatTime(duration)}</div>
//       </div>

//       {/* big control row */}
//       <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
//         <button
//           className={`icon-btn ${shuffle ? "active" : ""}`}
//           onClick={onToggleShuffle}
//           aria-pressed={shuffle}
//           title="Shuffle"
//         >
//           <Shuffle size={18}/>
//         </button>

//         <button className="icon-btn" onClick={handlePrev} title="Previous">
//           <SkipBack size={22}/>
//         </button>

//         {/* Play/pause — transparent fill, neon border */}
//         <button
//           className="play-btn"
//           onClick={handleToggle}
//           title={playing ? 'Pause' : 'Play'}
//           aria-pressed={playing}
//           style={{
//             background: 'transparent',
//             border: '2px solid var(--neon)',
//             color: 'var(--neon)',
//             boxShadow: '0 12px 30px rgba(64,254,252,0.06)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             width: 60,
//             height: 60,
//             borderRadius: '50%',
//             padding: 0,
//           }}
//         >
//           {playing ? <Pause size={28}/> : <Play size={28}/>}
//         </button>

//         <button className="icon-btn" onClick={handleNext} title="Next">
//           <SkipForward size={22}/>
//         </button>

//         <button
//           className={`icon-btn ${repeatMode !== "off" ? "active" : ""}`}
//           onClick={onToggleRepeat}
//           title={`Repeat (${repeatMode})`}
//           aria-pressed={repeatMode !== 'off'}
//         >
//           {repeatMode === "one" ? <Repeat1 size={18}/> : <Repeat size={18}/>}
//         </button>

//         <div style={{ width: 8 }} />

//         <button
//           className={`icon-btn ${song?.liked ? "liked" : ""}`}
//           onClick={onToggleLike}
//           title={song?.liked ? 'Unlike' : 'Like'}
//           aria-pressed={!!song?.liked}
//         >
//           <Heart size={18}/>
//         </button>

//         {/* optional buffering indicator */}
//         {buffering && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Buffering…</div>}
//       </div>

//       {/* hidden audio element for playback */}
//       <audio
//         ref={audioRef}
//         src={song?.streamUrl}
//         preload="metadata"
//         style={{ display: 'none' }}
//       />
//     </div>
//   );
// }
// src/Player.jsx  (FIXED VERSION)
import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart
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
  onEnded,
  repeatMode = 'off',
  onToggleRepeat,
  shuffle = false,
  onToggleShuffle,
  hideCover = false,
  hideMeta = false,
}) {
  const audioRef = useRef(null);
  const rangeRef = useRef(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // stuck-resume detection
  const stuckAttemptsRef = useRef(0);
  const stuckIntervalRef = useRef(null);

  // Update range visual fill
  function updateRange(percent) {
    const el = rangeRef.current;
    if (!el) return;
    el.style.background = `linear-gradient(90deg, var(--neon) ${percent}%, rgba(255,255,255,0.07) ${percent}%)`;
  }

  function formatTime(sec) {
    if (!sec && sec !== 0) return "00:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60).toString();
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  }

  // attempt play and handle returned promise politely
  function attemptPlay() {
    const a = audioRef.current;
    if (!a) return;
    stuckAttemptsRef.current = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // suppress autoplay rejection noise — stuck detector will retry
      });
    }
  }

  // Attach robust event listeners to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onLoadedMetadata(e) {
      const d = Math.floor(e.target.duration) || 0;
      setDuration(d);
      updateRange(d ? (time / d) * 100 : 0);
    }

    function onTimeUpdate(e) {
      if (!seeking) {
        const t = e.target.currentTime || 0;
        setTime(t);
        updateRange(duration ? (t / duration) * 100 : 0);
      }
    }

    function onWaiting() {
      setBuffering(true);
    }

    function onCanPlay() {
      setBuffering(false);
      if (playing) {
        attemptPlay();
      }
    }

    function onStalled() {
      setBuffering(true);
      // allow canplay/canplaythrough to resume
    }

    function onEndedInternal() {
      if (typeof onEnded === 'function') onEnded();
    }

    function onError(e) {
      console.warn('Audio error', e);
      setBuffering(false);
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('ended', onEndedInternal);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('ended', onEndedInternal);
      audio.removeEventListener('error', onError);
      // cleanup stuck detector
      if (stuckIntervalRef.current) {
        clearInterval(stuckIntervalRef.current);
        stuckIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, seeking, playing, onEnded]);

  // When song changes: load src, reset times, and try to play if playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setTime(0);
    setDuration(0);
    setBuffering(false);
    stuckAttemptsRef.current = 0;

    if (!song || !song.streamUrl) {
      // clear
      try { audio.pause(); } catch(_) {}
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    // if different src, update and load
    // Note: We compare encoded versions to avoid unnecessary reloads
    const safeUrl = encodeURI(song.streamUrl);
    
    // We check if the current src (which is always encoded by browser) matches our safeUrl
    if (audio.src !== new URL(safeUrl, window.location.href).href && audio.src !== safeUrl) {
       audio.src = safeUrl; // <--- FIX 1: Encode the URL here
       try { audio.load(); } catch (_) {}
    }

    // attempt play if UI says playing
    if (playing) {
      setTimeout(() => attemptPlay(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, song?.streamUrl]);

  // When playing prop changes: play/pause and start/stop stuck detector
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      // attempt play immediately
      attemptPlay();

      // start stuck-detection loop (only one interval)
      if (!stuckIntervalRef.current) {
        stuckIntervalRef.current = setInterval(() => {
          const a = audioRef.current;
          if (!a) return;
          // if app expects playing, but DOM audio is paused and not ended -> try to recover
          if (playing && a.paused && !a.ended) {
            stuckAttemptsRef.current += 1;
            if (stuckAttemptsRef.current <= 6) {
              const p = a.play();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } else {
              // too many attempts — stop interval until user interacts again
              clearInterval(stuckIntervalRef.current);
              stuckIntervalRef.current = null;
            }
          } else {
            // audio playing fine -> reset attempts
            stuckAttemptsRef.current = 0;
          }
        }, 1200);
      }
    } else {
      // pause and clear detector
      try { audio.pause(); } catch (_) {}
      if (stuckIntervalRef.current) {
        clearInterval(stuckIntervalRef.current);
        stuckIntervalRef.current = null;
        stuckAttemptsRef.current = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Seek handler
  function handleSeekChange(e) {
    const val = Number(e.target.value);
    const audio = audioRef.current;
    if (!audio) {
      setTime(val);
      updateRange(duration ? (val / duration) * 100 : 0);
      return;
    }
    audio.currentTime = isFinite(val) ? val : 0;
    setTime(audio.currentTime);
    updateRange(duration ? (audio.currentTime / duration) * 100 : 0);

    // if we think we should be playing, try to resume
    if (playing) attemptPlay();
  }

  // UI handlers
  function handlePrev() { if (typeof onPrev === 'function') onPrev(); }
  function handleNext() { if (typeof onNext === 'function') onNext(); }
  function handleToggle() { if (typeof onToggle === 'function') onToggle(); }

  // Render
  return (
    <div className="player neon-player player--compact" role="region" aria-label="Now playing controls">
      {/* singer cover & meta (hidden if parent wants) */}
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

      {/* slider row with times */}
      <div className="slider-row" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 10 }}>
        <div className="time-left" aria-hidden style={{ fontSize: 12 }}>{formatTime(time)}</div>

        <input
          ref={rangeRef}
          className="range neon-range"
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

      {/* big control row */}
      <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
        <button
          className={`icon-btn ${shuffle ? "active" : ""}`}
          onClick={onToggleShuffle}
          aria-pressed={shuffle}
          title="Shuffle"
        >
          <Shuffle size={18}/>
        </button>

        <button className="icon-btn" onClick={handlePrev} title="Previous">
          <SkipBack size={22}/>
        </button>

        {/* Play/pause — transparent fill, neon border */}
        <button
          className="play-btn"
          onClick={handleToggle}
          title={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          style={{
            background: 'transparent',
            border: '2px solid var(--neon)',
            color: 'var(--neon)',
            boxShadow: '0 12px 30px rgba(64,254,252,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: '50%',
            padding: 0,
          }}
        >
          {playing ? <Pause size={28}/> : <Play size={28}/>}
        </button>

        <button className="icon-btn" onClick={handleNext} title="Next">
          <SkipForward size={22}/>
        </button>

        <button
          className={`icon-btn ${repeatMode !== "off" ? "active" : ""}`}
          onClick={onToggleRepeat}
          title={`Repeat (${repeatMode})`}
          aria-pressed={repeatMode !== 'off'}
        >
          {repeatMode === "one" ? <Repeat1 size={18}/> : <Repeat size={18}/>}
        </button>

        <div style={{ width: 8 }} />

        <button
          className={`icon-btn ${song?.liked ? "liked" : ""}`}
          onClick={onToggleLike}
          title={song?.liked ? 'Unlike' : 'Like'}
          aria-pressed={!!song?.liked}
        >
          <Heart size={18}/>
        </button>

        {/* optional buffering indicator */}
        {buffering && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Buffering…</div>}
      </div>

      {/* hidden audio element for playback */}
      <audio
        ref={audioRef}
        src={song?.streamUrl ? encodeURI(song.streamUrl) : undefined} 
        preload="metadata"
        style={{ display: 'none' }}
      />
    </div>
  );
}
