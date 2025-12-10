import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard'; 
import '../App.css';
import { 
  Home, Search, Library, User, 
  Play, Pause, Heart, ChevronDown, 
  Sparkles, Zap, Mic2, ListMusic, MoreHorizontal 
} from "lucide-react"; 

const PERSON_PLACEHOLDER = '/person-placeholder.png';

// Premium USP Boxes (Horizontal Scroll)
const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

export default function MusicApp({ user, onLogout }) {
  // --- VIEW STATE ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);

  // --- DATA STATE ---
  const [homeFeed, setHomeFeed] = useState([]);      
  const [discoveryFeed, setDiscoveryFeed] = useState([]); 
  const [searchResults, setSearchResults] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  
  // --- PLAYER STATE ---
  const [queue, setQueue] = useState([]);          
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [songProgress, setSongProgress] = useState(0); // 0-100 for Mini Player

  // --- UI STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, ""); 
  const authHeaders = { headers: { "X-User-Id": user?.id || 0 } };

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    async function loadFeeds() {
        setLoading(true);
        try {
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
            setHomeFeed(recent.data);
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
            setDiscoveryFeed(random.data);
        } catch(e) { console.error(e); }
        setLoading(false);
    }
    loadFeeds();
  }, []);

  // --- 2. TAB LOGIC ---
  useEffect(() => {
      if (activeTab === 'library') {
          axios.get(`${API_BASE}/api/songs/liked`, authHeaders).then(r => setLikedSongs(r.data));
      }
  }, [activeTab]);

  // --- 3. SEARCH LOGIC ---
  useEffect(() => {
      const delay = setTimeout(async () => {
        if (searchTerm.length > 1) {
           try {
             const res = await axios.get(`${API_BASE}/api/songs/search?q=${searchTerm}`, authHeaders);
             setSearchResults(res.data);
           } catch(e) { console.error(e); }
        } else { setSearchResults([]); }
      }, 500); 
      return () => clearTimeout(delay);
  }, [searchTerm]);

  // --- 4. PLAYER HELPERS ---
  // Helper to find song object from ID across all lists (since queue is just IDs)
  function getSongById(id) {
      const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs];
      return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
  }
  const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

  const playSong = (song, contextList) => {
     if(!song) return;
     // If clicking a song, make a queue from that list
     let newQueue = contextList && contextList.length > 0 ? contextList.map(s=>s.id) : [song.id];
     
     // Remove duplicates if needed, but for now simple mapping
     setQueue(newQueue);
     setCurrentIndex(newQueue.indexOf(song.id));
     setPlaying(true);
  };

  const toggleLike = async (songId) => {
      // Optimistic update
      const update = (list) => list.map(s => s.id === songId ? {...s, liked: !s.liked} : s);
      setHomeFeed(update); setDiscoveryFeed(update); setSearchResults(update); setLikedSongs(update);
      try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); } catch(e) {}
  };

  const recordListen = async (duration, genre) => {
      try {
          const mins = Math.ceil((duration || 180) / 60);
          await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: mins, genre: genre || "Unknown" });
          // Update local user object if you want immediate planet reflex
          user.totalMinutesListened += mins; 
      } catch(e) {}
  };

  return (
    <div className="glass-shell">
      
      {/* 1. SCROLLABLE VIEWPORT */}
      <div className="glass-viewport">
         
         {/* --- HOME TAB --- */}
         {activeTab === 'home' && (
           <div className="tab-pane home-animate">
              <header className="glass-header">
                 <img src="/my-brand.png" alt="Logo" height="32"/>
                 <div className="header-text">
                    <h1>Hi, {user.username}</h1>
                    <p>Welcome to your galaxy.</p>
                 </div>
              </header>

              {/* USP SLIDER (Horizontal Scroll) */}
              <div className="usp-slider">
                  {USP_FEATURES.map((feat, i) => (
                      <div key={i} className="glass-card usp-card" style={{background: feat.accent}}>
                          <div className="usp-icon">{feat.icon}</div>
                          <h3>{feat.title}</h3>
                          <p>{feat.subtitle}</p>
                      </div>
                  ))}
              </div>

              <h2 className="section-title">Fresh Arrivals</h2>
              <div className="horizontal-scroll">
                  {homeFeed.map(s => (
                      <div key={s.id} className="glass-card song-card" onClick={() => playSong(s, homeFeed)}>
                          <img src={s.coverUrl || PERSON_PLACEHOLDER} onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
                          <p className="song-title">{s.title}</p>
                          <p className="song-artist">{s.artistName}</p>
                      </div>
                  ))}
              </div>

              <h2 className="section-title">Discovery</h2>
              <div className="horizontal-scroll">
                  {discoveryFeed.map(s => (
                      <div key={s.id} className="glass-card song-card" onClick={() => playSong(s, discoveryFeed)}>
                          <img src={s.coverUrl || PERSON_PLACEHOLDER} onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
                          <p className="song-title">{s.title}</p>
                          <p className="song-artist">{s.artistName}</p>
                      </div>
                  ))}
              </div>
              <div className="spacer"></div>
           </div>
         )}

         {/* --- SEARCH TAB --- */}
         {activeTab === 'search' && (
            <div className="tab-pane">
                <div className="search-wrapper">
                    <Search size={20} className="search-icon"/>
                    <input 
                      className="glass-input" 
                      placeholder="Search songs, artists..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                </div>
                <div className="list-vertical">
                    {searchResults.map(s => (
                        <div key={s.id} className="glass-row" onClick={() => playSong(s, searchResults)}>
                            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb"/>
                            <div className="row-info">
                                <div className="row-title">{s.title}</div>
                                <div className="row-artist">{s.artistName}</div>
                            </div>
                            <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); toggleLike(s.id)}}>
                                <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "rgba(255,255,255,0.5)"}/>
                            </button>
                        </div>
                    ))}
                </div>
                <div className="spacer"></div>
            </div>
         )}

         {/* --- LIBRARY TAB --- */}
         {activeTab === 'library' && (
             <div className="tab-pane">
                 <h2 className="page-title">Your Library</h2>
                 
                 <div className="glass-card liked-box" onClick={() => likedSongs.length && playSong(likedSongs[0], likedSongs)}>
                     <div className="liked-icon"><Heart size={28} fill="white"/></div>
                     <div className="liked-text">
                         <h3>Liked Songs</h3>
                         <p>{likedSongs.length} tracks</p>
                     </div>
                     <Play size={24} fill="black" className="play-white"/>
                 </div>

                 <h3 className="section-title">Upload Music</h3>
                 <UploadCard onUploaded={() => {}} />
                 <div className="spacer"></div>
             </div>
         )}

         {/* --- PLANET TAB --- */}
         {activeTab === 'planet' && (
             <div className="tab-pane">
                 <PlanetCard user={user} onClose={()=>{}} />
                 <button className="glass-btn logout-btn" onClick={onLogout}>Sign Out</button>
                 <div className="spacer"></div>
             </div>
         )}
      </div>

      {/* 2. PLAYER OVERLAY */}
      {currentSong && (
          <>
            {/* A. FULL SCREEN MODAL (With Lyrics & Queue inside) */}
            <div className={`glass-modal ${isFullScreenPlayer ? 'open' : ''}`}>
                <div className="modal-header">
                    <button onClick={() => setIsFullScreenPlayer(false)} className="icon-btn"><ChevronDown size={32}/></button>
                    <span>Now Playing</span>
                    <button className="icon-btn"><MoreHorizontal size={24}/></button>
                </div>
                
                {/* Scrollable Body inside Modal */}
                <div className="modal-scroll-body">
                    {/* Cover Art with GLOW */}
                    <div className="art-glow-container">
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" />
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" />
                    </div>

                    <div className="modal-meta">
                        <h1>{currentSong.title}</h1>
                        <p>{currentSong.artistName}</p>
                    </div>

                    {/* Controls */}
                    <div className="modal-controls-wrapper">
                        <Player 
                            song={currentSong}
                            playing={playing}
                            onToggle={() => setPlaying(!playing)}
                            onNext={() => setCurrentIndex((currentIndex + 1) % queue.length)}
                            onPrev={() => setCurrentIndex((currentIndex - 1 + queue.length) % queue.length)}
                            onToggleLike={() => toggleLike(currentSong.id)}
                            onEnded={() => {
                                recordListen(currentSong.durationSeconds, currentSong.genre);
                                setCurrentIndex((currentIndex + 1) % queue.length);
                            }}
                            hideCover={true} hideMeta={true}
                            onProgress={(c, t) => setSongProgress(t ? (c/t)*100 : 0)}
                        />
                    </div>

                    {/* Lyrics Section */}
                    <div className="modal-section">
                        <h3>Lyrics</h3>
                        <div className="glass-inset">
                             <LyricsPanel song={currentSong} />
                        </div>
                    </div>

                    {/* Queue Section */}
                    <div className="modal-section">
                        <div className="section-header">
                            <h3>Up Next</h3>
                            <ListMusic size={18} color="#aaa"/>
                        </div>
                        <div className="list-vertical">
                            {queue.slice(currentIndex + 1, currentIndex + 10).map((id, i) => {
                                const s = getSongById(id);
                                return (
                                    <div key={i} className="glass-row compact">
                                        <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb small"/>
                                        <div className="row-info">
                                            <div className="row-title">{s.title}</div>
                                            <div className="row-artist">{s.artistName}</div>
                                        </div>
                                    </div>
                                )
                            })}
                            {queue.length - currentIndex > 10 && <div className="more-queue">...and more</div>}
                        </div>
                    </div>
                    <div className="spacer"></div>
                </div>
            </div>

            {/* B. MINI PLAYER DOCK (Floating Glass) */}
            {!isFullScreenPlayer && (
                <div className="glass-dock" onClick={() => setIsFullScreenPlayer(true)}>
                    <div className="dock-left">
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="dock-thumb spin-slow"/>
                        <div className="dock-info">
                            <div className="dock-title">{currentSong.title}</div>
                            <div className="dock-artist">{currentSong.artistName}</div>
                        </div>
                    </div>
                    <div className="dock-right">
                        <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); toggleLike(currentSong.id)}}>
                            <Heart size={20} fill={currentSong.liked ? "#ff00cc" : "none"} color={currentSong.liked ? "#ff00cc" : "white"}/>
                        </button>
                        <button className="icon-btn dock-play" onClick={(e)=>{e.stopPropagation(); setPlaying(!playing)}}>
                            {playing ? <Pause size={20} fill="black"/> : <Play size={20} fill="black" style={{marginLeft:2}}/>}
                        </button>
                    </div>
                    {/* ANIMATED PROGRESS BAR LINE */}
                    <div className="dock-progress">
                        <div className="dock-progress-fill" style={{width: `${songProgress}%`}}></div>
                    </div>
                </div>
            )}
          </>
      )}

      {/* 3. BOTTOM NAVIGATION (Glass Dock) */}
      <nav className="glass-nav">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
              <Home size={24}/><span>Home</span>
          </button>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>
              <Search size={24}/><span>Search</span>
          </button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>
              <Library size={24}/><span>Library</span>
          </button>
          <button className={activeTab === 'planet' ? 'active' : ''} onClick={() => setActiveTab('planet')}>
              <User size={24}/><span>Planet</span>
          </button>
      </nav>

    </div>
  );
}
