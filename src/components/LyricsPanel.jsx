import React, { useEffect, useState, useRef } from 'react';
import { Edit2, Save, Trash2, X, Maximize2, Minimize2 } from "lucide-react";

export default function LyricsPanel({ song, currentTime = 0, onExpand, isFullMode = false }) {
  const [lyrics, setLyrics] = useState('');
  const [syncedLines, setSyncedLines] = useState([]); 
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const scrollRef = useRef(null);
  const menuRef = useRef(null);
  const API_BASE = "https://musicapp-o3ow.onrender.com"; 

  // 1. Fetch Lyrics
  useEffect(() => {
    if (!song) return;
    async function load() {
      setLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/api/lyrics?songId=${encodeURIComponent(song.id)}`);
        const json = await resp.json();
        const rawLyrics = (json.entry && json.entry.lyrics) ? json.entry.lyrics : '';
        setLyrics(rawLyrics);
        parseLyrics(rawLyrics);
      } catch (e) { 
        console.error(e); 
        setLyrics(''); 
        setSyncedLines([]); 
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [song]);

  // 2. Parser: Converts "[00:12.50] Hello" -> { time: 12.5, text: "Hello" }
  const parseLyrics = (text) => {
    if (!text) return;
    const lines = text.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (let line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const time = minutes * 60 + seconds + (ms / 1000);
        const content = line.replace(timeRegex, '').trim();
        if (content) parsed.push({ time, text: content });
      } else if (line.trim()) {
        parsed.push({ time: -1, text: line.trim() });
      }
    }
    setSyncedLines(parsed);
  };

  // 3. Sync Logic: Find active line based on currentTime
  useEffect(() => {
    if (syncedLines.length === 0 || editing) return;
    
    const index = syncedLines.findIndex((line, i) => {
      const nextLine = syncedLines[i + 1];
      return line.time <= currentTime && (!nextLine || nextLine.time > currentTime);
    });

    if (index !== -1 && index !== activeLineIndex) {
      setActiveLineIndex(index);
      if (scrollRef.current) {
        const activeEl = scrollRef.current.children[index];
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, syncedLines]);

  // Click outside menu to close
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  async function saveLyrics() {
    if (!song) return;
    try {
        await fetch(`${API_BASE}/api/lyrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId: String(song.id), lyrics, source: 'manual' })
        });
        setEditing(false);
        setMenuOpen(false);
        parseLyrics(lyrics); 
    } catch(e) { setError('Save failed'); }
  }

  async function clearLyrics() {
    if (!song) return;
    if (!window.confirm('Delete lyrics?')) return;
    try {
      await fetch(`${API_BASE}/api/lyrics?songId=${encodeURIComponent(song.id)}`, { method: 'DELETE' });
      setLyrics('');
      setSyncedLines([]);
      setEditing(false);
      setMenuOpen(false);
    } catch (err) {}
  }

  const isSynced = syncedLines.some(l => l.time > -1);

  if (!song) return <div className="lyrics-empty">Select a song to see lyrics</div>;

  return (
    <div className={`lyrics-panel ${isFullMode ? 'full-mode' : ''}`} role="region">
      {/* Header */}
      <div className="lyrics-panel-header" style={isFullMode ? { justifyContent: 'center', marginBottom: 30 } : {}}>
        <div style={{ minWidth: 0, textAlign: isFullMode ? 'center' : 'left' }}>
          <h3 style={{ margin: 0, fontSize: isFullMode ? '2.5rem' : 18 }}>{song.title}</h3>
          <div style={{ color: '#5eb3fd' }}>
             {song.artistName} 
             {isSynced && <span style={{marginLeft:10, fontSize:10, border:'1px solid #5eb3fd', padding:'2px 6px', borderRadius:4}}>SYNCED</span>}
          </div>
        </div>
        
        {!isFullMode && (
            <div style={{ display:'flex', gap: 5 }}>
                <button className="icon-btn" onClick={onExpand}><Maximize2 size={18} /></button>
                
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <button className={`icon-btn ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(v => !v)}>
                        <Edit2 size={18} />
                    </button>
                    {menuOpen && (
                        <div className="lyrics-actions-menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 60, background:'#222', border:'1px solid #444', padding:5, borderRadius:5, minWidth:140 }}>
                             <button className="small-btn" onClick={() => { setEditing(!editing); setMenuOpen(false); }}>
                                {editing ? 'Stop Editing' : 'Edit'}
                             </button>
                             <button className="small-btn" onClick={saveLyrics} disabled={!editing}>Save</button>
                             <button className="small-btn danger" onClick={clearLyrics}>Clear</button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      <div className="lyrics-body" ref={scrollRef} style={isFullMode ? { textAlign: 'center', paddingBottom: '50vh' } : {}}>
        {editing ? (
          <textarea
            className="lyrics-textarea"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Paste lyrics here. Use [mm:ss.xx] format for sync!"
            rows={15}
          />
        ) : isSynced ? (
          // SYNCED VIEW
          syncedLines.map((line, i) => (
            <div 
                key={i} 
                className={`lyric-line ${i === activeLineIndex ? 'active' : ''}`}
                style={{
                    padding: '10px 0',
                    fontSize: i === activeLineIndex ? (isFullMode ? '2.2rem' : '1.2rem') : (isFullMode ? '1.5rem' : '1rem'),
                    color: i === activeLineIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                    textShadow: i === activeLineIndex ? '0 0 15px rgba(255,255,255,0.6)' : 'none',
                    fontWeight: i === activeLineIndex ? 'bold' : 'normal',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
            >
                {line.text}
            </div>
          ))
        ) : (
          // PLAIN TEXT FALLBACK
          <pre className="lyrics-pre">{lyrics || 'No lyrics found.'}</pre>
        )}
      </div>
    </div>
  );
}
