import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard'; 
import PlaylistPanel from './PlaylistPanel'; // Import Playlist Panel
import '../App.css';
import { 
  Home, Search, Library, User, PlusCircle, 
  Play, Pause, Heart, ChevronDown, 
  Sparkles, Zap, Mic2, ListMusic, MoreHorizontal, 
  ListPlus, PlayCircle, ArrowRightCircle
} from "lucide-react"; 

const PERSON_PLACEHOLDER = '/person-placeholder.png';

const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

export default function MusicApp({ user, onLogout }) {
  // --- VIEW STATE ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
  
  // NEW: Library Sub-tabs ('liked' or 'playlists')
  const [libraryTab, setLibraryTab] = useState('liked');
  // NEW: Track which song's menu is open (by ID)
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- DATA STATE ---
  const [homeFeed, setHomeFeed] = useState([]);      
  const [discoveryFeed, setDiscoveryFeed] = useState([]); 
  const [searchResults, setSearchResults] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]); // Added playlists state
  
  // --- PLAYER STATE ---
  const [queue, setQueue] = useState([]);          
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [songProgress, setSongProgress] = useState(0); 

  // --- UI STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Close menus when clicking anywhere else
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, ""); 
  const authHeaders = { headers: { "X-User-Id": user?.id || 0 } };

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    loadFeeds();
  }, []);

  async function loadFeeds() {
      setLoading(true);
      try {
          const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
          setHomeFeed(recent.data);
          const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
          setDiscoveryFeed(random.data);
          // Pre-load library data
          fetchLibraryData();
      } catch(e) { console.error(e); }
      setLoading(false);
  }

  async function fetchLibraryData() {
      try {
          const liked = await axios.get(`${API_BASE}/api/songs/liked`, authHeaders);
          setLikedSongs(liked.data);
          // Fetch playlists if endpoint exists (Optional stub)
          const pl = await axios.get(`${API_BASE}/api/playlists`, authHeaders).catch(()=>({data:[]}));
          setPlaylists(pl.data || []);
      } catch(e) { console.error(e); }
  }

  // Reload library when entering tab
  useEffect(() => {
      if (activeTab === 'library') fetchLibraryData();
  }, [activeTab]);

  // --- SEARCH LOGIC ---
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

  // --- PLAYER HELPERS ---
  function getSongById(id) {
      const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs];
      // Basic deduplication find
      return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
  }
  const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

  const playSong = (song, contextList) => {
     if(!song) return;
     let newQueue = contextList && contextList.length > 0 ? contextList.map(s=>s.id) : [song.id];
     setQueue(newQueue);
     setCurrentIndex(newQueue.indexOf(song.id));
     setPlaying(true);
  };

  const toggleLike = async (songId) => {
      const update = (list) => list.map(s => s.id === songId ? {...s, liked: !s.liked} : s);
      setHomeFeed(update); setDiscoveryFeed(update); setSearchResults(update); setLikedSongs(update);
      try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); fetchLibraryData(); } catch(e) {}
  };

  // --- NEW QUEUE ACTIONS ---
  const playNext = (song) => {
      if (queue.length === 0) {
          playSong(song);
          return;
      }
      const newQueue = [...queue];
      // Insert right after current song
      newQueue.splice(currentIndex + 1, 0, song.id);
      setQueue(newQueue);
      alert("Added to play next!");
  };

  const addToQueue = (song) => {
      if (queue.length === 0) {
          playSong(song);
          return;
      }
      setQueue([...queue, song.id]);
      alert("Added to queue!");
  };

  const recordListen = async (duration, genre) => {
      try {
          const mins = Math.ceil((duration || 180) / 60);
          await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: mins, genre: genre || "Unknown" });
          user.totalMinutesListened += mins; 
      } catch(e) {}
  };

  // --- REUSABLE SONG ROW COMPONENT ---
  const SongRow = ({ s, list }) => (
    <div className="glass-row" onClick={() => playSong(s, list)}>
        <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb" onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
        <div className="row-info">
            <div className="row-title">{s.title}</div>
            <div className="row-artist">{s.artistName}</div>
        </div>
        
        {/* ROW ACTIONS */}
        <div className="row-actions">
            <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); toggleLike(s.id)}}>
                <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "rgba(255,255,255,0.5)"}/>
            </button>

            {/* THREE DOT MENU */}
            <div className="context-menu-container">
                <button 
                    className="icon-btn" 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        setOpenMenuId(openMenuId === s.id ? null : s.id);
                    }}
                >
                    <MoreHorizontal size={20} color="rgba(255,255,255,0.7)" />
                </button>

                {openMenuId === s.id && (
                    <div className="context-menu" onClick={e => e.stopPropagation()}>
                        <button className="menu-item" onClick={() => { playSong(s); setOpenMenuId(null); }}>
                            <PlayCircle/> Play Now
                        </button>
                        <button className="menu-item" onClick={() => { playNext(s); setOpenMenuId(null); }}>
                            <ArrowRightCircle/> Play Next
                        </button>
                        <button className="menu-item" onClick={() => { addToQueue(s); setOpenMenuId(null); }}>
                            <ListPlus/> Add to Queue
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );

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
                        <SongRow key={s.id} s={s} list={searchResults} />
                    ))}
                </div>
                <div className="spacer"></div>
            </div>
         )}

         {/* --- UPLOAD TAB --- */}
         {activeTab === 'upload' && (
             <div className="tab-pane">
                 <h2 className="page-title">Upload Music</h2>
                 <p style={{color:'#aaa', marginBottom: 20}}>Share your vibes with the galaxy.</p>
                 <UploadCard onUploaded={loadFeeds} />
                 <div className="spacer"></div>
             </div>
         )}

         {/* --- LIBRARY TAB (UPDATED) --- */}
         {activeTab === 'library' && (
             <div className="tab-pane">
                 <h2 className="page-title">Your Library</h2>
                 
                 {/* NEW: LIBRARY SUB-TABS */}
                 <div className="library-tabs">
                    <button 
                        className={`lib-tab-btn ${libraryTab === 'liked' ? 'active' : ''}`}
                        onClick={() => setLibraryTab('liked')}
                    >
                        Liked Songs
                    </button>
                    <button 
                        className={`lib-tab-btn ${libraryTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setLibraryTab('playlists')}
                    >
                        Playlists
                    </button>
                 </div>

                 {/* TAB 1: LIKED SONGS */}
                 {libraryTab === 'liked' && (
                     likedSongs.length === 0 ? (
                         <div style={{textAlign:'center', marginTop: 50, color: '#666'}}>
                             <Heart size={48} style={{marginBottom:10, opacity:0.5}}/>
                             <p>Songs you like will appear here.</p>
                         </div>
                     ) : (
                         <div className="list-vertical">
                            {likedSongs.map(s => (
                                <SongRow key={s.id} s={s} list={likedSongs} />
                            ))}
                         </div>
                     )
                 )}

                 {/* TAB 2: PLAYLISTS */}
                 {libraryTab === 'playlists' && (
                     <PlaylistPanel 
                        playlists={playlists} 
                        onRefresh={fetchLibraryData} 
                        onPlayPlaylist={() => alert("Playlist playback coming soon!")}
                     />
                 )}

                 <div className="spacer"></div>
             </div>
         )}

         {/* --- PLANET TAB --- */}
         {activeTab === 'planet' && (
             <div className="tab-pane">
                 <PlanetCard user={user} onClose={() => setActiveTab('home')} />
                 <button className="glass-btn logout-btn" onClick={onLogout}>Sign Out</button>
                 <div className="spacer"></div>
             </div>
         )}
      </div>

      {/* 2. PLAYER OVERLAY */}
      {currentSong && (
          <>
            <div className={`glass-modal ${isFullScreenPlayer ? 'open' : ''}`}>
                <div className="modal-header">
                    <button onClick={() => setIsFullScreenPlayer(false)} className="icon-btn"><ChevronDown size={32}/></button>
                    <span>Now Playing</span>
                    <button className="icon-btn"><MoreHorizontal size={24}/></button>
                </div>
                
                <div className="modal-scroll-body">
                    <div className="art-glow-container">
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" />
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" />
                    </div>

                    <div className="modal-meta">
                        <h1>{currentSong.title}</h1>
                        <p>{currentSong.artistName}</p>
                    </div>

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

                    <div className="modal-section">
                        <h3>Lyrics</h3>
                        <div className="glass-inset">
                             <LyricsPanel song={currentSong} />
                        </div>
                    </div>

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
                        </div>
                    </div>
                    <div className="spacer"></div>
                </div>
            </div>

            {!isFullScreenPlayer && (
                <div className="glass-dock" onClick={() => setIsFullScreenPlayer(true)}>
                    <div className="dock-left">
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="dock-thumb"/> 
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
                    
                    <div className="dock-progress">
                        <div className="dock-progress-fill" style={{width: `${songProgress}%`}}></div>
                    </div>
                </div>
            )}
          </>
      )}

      {/* 3. BOTTOM NAVIGATION */}
      <nav className="glass-nav">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
              <Home size={24}/><span>Home</span>
          </button>
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')}>
              <Search size={24}/><span>Search</span>
          </button>
          <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>
              <PlusCircle size={32} color={activeTab === 'upload' ? '#9146ff' : '#ccc'} /><span>Upload</span>
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
