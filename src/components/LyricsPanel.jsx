import React, { useEffect, useState, useRef } from 'react';
import { Edit2, Save, Trash2, X, Maximize2, Minimize2 } from "lucide-react";

export default function LyricsPanel({ song }) {
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // --- NEW: Expand State ---
  const [isExpanded, setIsExpanded] = useState(false);
  
  const menuRef = useRef(null);

  // 🛑 PASTE YOUR RENDER BACKEND URL HERE
  const API_BASE = "https://groove-j0kw.onrender.com"; 

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
        
        // If 404, it just means no lyrics exist yet
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

  // --- FULL SCREEN VIEW ---
  if (isExpanded) {
    return (
      <div className="lyrics-expanded-overlay">
        <div className="lyrics-expanded-header">
            <div>
                <h2>{song.title}</h2>
                <span className="expanded-artist">{song.artistName}</span>
            </div>
            <button className="icon-btn close-expand" onClick={() => setIsExpanded(false)}>
                <Minimize2 size={24} color="white" />
            </button>
        </div>
        <div className="lyrics-expanded-content">
            {lyrics || "No lyrics found."}
        </div>
      </div>
    );
  }

  // --- NORMAL VIEW ---
  return (
    <div className="lyrics-panel" role="region" aria-label="Lyrics panel">
      <div className="lyrics-panel-header">
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{song.title}</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{song.artistName}</div>
        </div>

        <div style={{ display:'flex', gap: 5 }}>
            {/* EXPAND BUTTON */}
            <button 
                className="icon-btn"
                onClick={() => setIsExpanded(true)}
                title="Expand Lyrics"
            >
                <Maximize2 size={18} />
            </button>

            {/* EDIT MENU */}
            <div ref={menuRef} style={{ position: 'relative' }}>
            <button
                className={`icon-btn ${menuOpen ? 'active' : ''}`}
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="Lyrics actions"
            >
                <Edit2 size={18} />
            </button>

            {menuOpen && (
                <div
                role="menu"
                className="lyrics-actions-menu"
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    padding: 8,
                    zIndex: 60,
                    minWidth: 160,
                }}
                >
                <button
                    className="small-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', marginBottom: 6 }}
                    onClick={() => { setEditing(e => !e); setMenuOpen(false); }}
                >
                    {editing ? <><X size={16}/> Stop Editing</> : <><Edit2 size={16}/> Edit Lyrics</>}
                </button>

                <button
                    className="small-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', marginBottom: 6 }}
                    onClick={saveLyrics}
                    disabled={!editing || loading}
                >
                    <Save size={16}/> Save
                </button>

                <button
                    className="small-btn danger"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', color: '#ff4d7a' }}
                    onClick={clearLyrics}
                    disabled={loading}
                >
                    <Trash2 size={16}/> Clear
                </button>
                </div>
            )}
            </div>
        </div>
      </div>

      {loading && <div className="lyrics-loading">Loading…</div>}
      {error && <div className="lyrics-error" role="alert">{error}</div>}

      <div className="lyrics-body">
        {editing ? (
          <textarea
            className="lyrics-textarea"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Paste or type lyrics here..."
            rows={12}
          />
        ) : (
          <pre className="lyrics-pre">{lyrics || 'No lyrics found.'}</pre>
        )}
      </div>

      <div className="lyrics-meta">
        {meta ? <small>Updated: {meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString() : '—'}</small> : null}
      </div>
    </div>
  );
}
