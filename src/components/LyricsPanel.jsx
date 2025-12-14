import React, { useEffect, useState, useRef } from 'react';
import { Edit2, Save, Trash2, X, Maximize2, Minimize2 } from "lucide-react";

export default function LyricsPanel({ song, onExpand, onCollapse, isFullMode = false }) {
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const menuRef = useRef(null);

  // 🛑 YOUR BACKEND URL
  const API_BASE = "https://musicapp-o3ow.onrender.com"; 

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!song) {
        setLyrics('');
        setMeta(null);
        setEditing(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE}/api/lyrics?songId=${encodeURIComponent(song.id)}`);
        
        if (!resp.ok && resp.status !== 404) throw new Error("Failed to fetch");

        const json = await resp.json();
        if (cancelled) return;
        
        const entry = json.entry || json; 
        if (entry && (entry.lyrics || entry.source)) {
          setLyrics(entry.lyrics || '');
          setMeta({ source: entry.source, updatedAt: entry.updatedAt });
          setEditing(false);
        } else {
          setLyrics('');
          setMeta(null);
          setEditing(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [song?.id]);

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, []);

  async function saveLyrics() {
    if (!song) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/lyrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: String(song.id), lyrics, source: 'manual' })
      });
      const json = await resp.json();
      if (json?.ok) {
        setMeta(json.entry ? { source: json.entry.source, updatedAt: json.entry.updatedAt } : { source: 'manual' });
        setEditing(false);
        setMenuOpen(false);
      } else {
        setError('Save failed');
      }
    } catch (err) {
      console.error(err);
      setError('Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function clearLyrics() {
    if (!song) return;
    if (!window.confirm('Delete these lyrics?')) return;
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/api/lyrics?songId=${encodeURIComponent(song.id)}`, { method: 'DELETE' });
      setLyrics('');
      setMeta(null);
      setEditing(false);
      setMenuOpen(false);
    } catch (err) {
      console.error(err);
      setError('Delete failed');
    } finally {
      setLoading(false);
    }
  }

  if (!song) return <div className="lyrics-empty">Select a song to see lyrics</div>;

  return (
    <div className={`lyrics-panel ${isFullMode ? 'full-mode' : ''}`} role="region" aria-label="Lyrics panel">
      {/* Header */}
      <div className="lyrics-panel-header" style={isFullMode ? { justifyContent: 'center', marginBottom: 30 } : {}}>
        <div style={{ minWidth: 0, textAlign: isFullMode ? 'center' : 'left' }}>
          <h3 style={{ margin: 0, fontSize: isFullMode ? '2.5rem' : 18 }}>{song.title}</h3>
          <div style={{ color: isFullMode ? '#5eb3fd' : 'var(--text-secondary)', fontSize: isFullMode ? '1.4rem' : 13 }}>{song.artistName}</div>
        </div>

        {/* Buttons (Only show expand/edit in normal mode to keep full mode clean) */}
        {!isFullMode && (
            <div style={{ display:'flex', gap: 5 }}>
                <button 
                    className="icon-btn"
                    onClick={onExpand}
                    title="Full Screen Mode"
                >
                    <Maximize2 size={18} />
                </button>

                <div ref={menuRef} style={{ position: 'relative' }}>
                    <button
                        className={`icon-btn ${menuOpen ? 'active' : ''}`}
                        onClick={() => setMenuOpen(v => !v)}
                        title="Lyrics actions"
                    >
                        <Edit2 size={18} />
                    </button>
                    {/* Menu logic same as before... */}
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
        
        {/* In Full Mode, we typically rely on the parent X button, but we can add Minimize here too if desired */}
      </div>

      {loading && <div className="lyrics-loading">Loading…</div>}
      
      <div className="lyrics-body" style={isFullMode ? { fontSize: '1.8rem', lineHeight: 2.2, textAlign: 'center', textShadow: '0 4px 10px rgba(0,0,0,0.8)' } : {}}>
        {editing ? (
          <textarea
            className="lyrics-textarea"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Type lyrics..."
            rows={12}
          />
        ) : (
          <pre className="lyrics-pre">{lyrics || 'No lyrics found.'}</pre>
        )}
      </div>
    </div>
  );
}
