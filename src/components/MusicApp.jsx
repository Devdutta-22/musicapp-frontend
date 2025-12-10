import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import PlanetCard from './PlanetCard'; 
import '../App.css';
import { 
  Home, Search, Library, User, // Tab Icons
  Play, Pause, Heart, ChevronDown, Sparkles, Zap
} from "lucide-react"; 

const PERSON_PLACEHOLDER = '/person-placeholder.png';

// USP / "Ad" Boxes for your Planet Feature
const USP_FEATURES = [
    { 
      title: "Planet Evolution", 
      subtitle: "Your music taste creates a world.", 
      icon: <Sparkles size={24} color="#00ffff" />, 
      bg: "linear-gradient(135deg, rgba(26, 42, 108, 0.8), rgba(178, 31, 31, 0.6))" 
    },
    { 
      title: "Neon Vibes", 
      subtitle: "Experience the glow.", 
      icon: <Zap size={24} color="#ff00cc" />, 
      bg: "linear-gradient(135deg, rgba(17, 153, 142, 0.8), rgba(56, 239, 125, 0.6))" 
    },
];

export default function MusicApp({ user, onLogout }) {
  // --- VIEW STATE ---
  const [activeTab, setActiveTab] = useState('home'); // home, search, library, planet
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);

  // --- DATA STATE ---
  const [homeFeed, setHomeFeed] = useState([]);      // Recent songs
  const [discoveryFeed, setDiscoveryFeed] = useState([]); // Random songs
  const [searchResults, setSearchResults] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  
  // --- PLAYER STATE ---
  const [queue, setQueue] = useState([]);          
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  // --- UI STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Ensure we handle the trailing slash correctly
  const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, ""); 
  const authHeaders = { headers: { "X-User-Id": user?.id || 0 } };

  // --- 1. INITIAL LOAD (Feeds) ---
  useEffect(() => {
    async function loadFeeds() {
        setLoading(true);
        try {
            // Load "Fresh Arrivals"
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
            setHomeFeed(recent.data);
            
            // Load "Discovery"
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
            setDiscoveryFeed(random.data);
        } catch(e) { console.error("Feed error", e); }
        setLoading(false);
    }
    loadFeeds();
  }, []);

  // --- 2. TAB SWITCH LOGIC ---
  useEffect(() => {
      if (activeTab === 'library') {
          // Fetch liked songs when entering library
          axios.get(`${API_BASE}/api/songs/liked`, authHeaders)
               .then(r => setLikedSongs(r.data))
               .catch(e => console.error(e));
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
        } else {
            setSearchResults([]);
        }
      }, 500); // 500ms debounce
      return () => clearTimeout(delay);
  }, [searchTerm]);

  // --- 4. STATS & EVOLUTION LOGIC ---
  const recordListen = async (durationSeconds, songGenre) => {
    if (!user || !durationSeconds) return;
    const minutes = Math.ceil(durationSeconds / 60);
    const genrePayload = songGenre || "Unknown";
    console.log(`Evolving Planet: +${minutes} mins of ${genrePayload}`);

    try {
      await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { 
        minutes: minutes,
        genre: genrePayload 
      });
      // Update local user stats if needed
      user.totalMinutesListened = (user.totalMinutesListened || 0) + minutes;
    } catch (e) { console.error("Stats error", e); }
  };

  // --- PLAYER HANDLERS ---
  const currentSong = queue[currentIndex] || null;

  const playSong = (song, contextList) => {
     if(!song) return;
     // If we click a song, play it and queue its neighbors from the same list
     let newQueue = contextList && contextList.length > 0 ? contextList : [song];
     setQueue(newQueue);
     const idx = newQueue.findIndex(s => s.id === song.id);
     setCurrentIndex(idx >= 0 ? idx : 0);
     setPlaying(true);
  };

  const toggleLike = async (songId) => {
      // Optimistic UI update (update all lists)
      const update = (list) => list.map(s => s.id === songId ? {...s, liked: !s.liked} : s);
      setHomeFeed(update);
      setDiscoveryFeed(update);
      setSearchResults(update);
      setLikedSongs(update); 

      try {
          await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders);
      } catch(e) { console.error("Like failed", e); }
  };

  // --- RENDERERS ---

  return (
    <div className="app-shell">
      
      {/* 1. VIEWPORT (Scrollable Content) */}
      <div className="main-content">
         
         {/* --- HOME TAB --- */}
         {activeTab === 'home' && (
           <div className="tab-view home-view">
              <header className="app-header">
                 <img src="/my-brand.png" alt="Logo" className="header-logo"/>
                 <div>
                    <h1>Hi, {user.username}</h1>
                    <p>Welcome back to space.</p>
                 </div>
              </header>

              {/* USP SLIDER */}
              <div className="horizontal-scroll usp-scroll">
                  {USP_FEATURES.map((feat, i) => (
                      <div key={i} className="usp-card" style={{background: feat.bg}}>
                          <div className="usp-icon">{feat.icon}</div>
                          <h3>{feat.title}</h3>
                          <p>{feat.subtitle}</p>
                      </div>
                  ))}
              </div>

              <section>
                  <div className="section-title">Fresh Arrivals</div>
                  <div className="horizontal-scroll song-scroll">
                      {homeFeed.map(s => (
                          <div key={s.id} className="scroll-card" onClick={() => playSong(s, homeFeed)}>
                              <img src={s.coverUrl || PERSON_PLACEHOLDER} alt={s.title} onError={e=>e.target.src=PERSON_PLACEHOLDER} />
                              <p className="card-title">{s.title}</p>
                              <p className="card-artist">{s.artistName}</p>
                          </div>
                      ))}
                  </div>
              </section>

              <section>
                  <div className="section-title">Discovery</div>
                  <div className="horizontal-scroll song-scroll">
                      {discoveryFeed.map(s => (
                          <div key={s.id} className="scroll-card" onClick={() => playSong(s, discoveryFeed)}>
                              <img src={s.coverUrl || PERSON_PLACEHOLDER} alt={s.title} onError={e=>e.target.src=PERSON_PLACEHOLDER} />
                              <p className="card-title">{s.title}</p>
                              <p className="card-artist">{s.artistName}</p>
                          </div>
                      ))}
                  </div>
              </section>
              <div className="spacer-bottom"></div>
           </div>
         )}

         {/* --- SEARCH TAB --- */}
         {activeTab === 'search' && (
            <div className="tab-view search-view">
                <input 
                  className="mobile-search-input" 
                  placeholder="Songs, Artists..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <div className="search-results-list">
                    {searchResults.map(s => (
                        <div key={s.id} className="list-item" onClick={() => playSong(s, searchResults)}>
                            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="list-thumb" onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
                            <div className="list-info">
                                <div className="list-title">{s.title}</div>
                                <div className="list-artist">{s.artistName}</div>
                            </div>
                            <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); toggleLike(s.id)}}>
                                <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "#666"}/>
                            </button>
                        </div>
                    ))}
                    {!searchTerm && <div className="empty-state" style={{textAlign:'center', color:'#666', marginTop:20}}>Start typing to search...</div>}
                </div>
                <div className="spacer-bottom"></div>
            </div>
         )}

         {/* --- LIBRARY TAB --- */}
         {activeTab === 'library' && (
             <div className="tab-view library-view">
                 <h2>Your Library</h2>
                 
                 {/* Liked Songs Box */}
                 <div className="library-card liked-card" onClick={() => {
                     if(likedSongs.length > 0) playSong(likedSongs[0], likedSongs);
                     else alert("No liked songs yet!");
                 }}>
                     <div className="lib-icon"><Heart size={28} fill="white"/></div>
                     <div className="lib-text">
                         <h3>Liked Songs</h3>
                         <p>{likedSongs.length} tracks</p>
                     </div>
                     <Play size={24} fill="black" className="play-circle"/>
                 </div>

                 {/* Upload */}
                 <div className="section-title" style={{marginTop: 30}}>Upload Music</div>
                 <UploadCard onUploaded={() => { /* Optional refresh */ }} />
                 
                 <div className="spacer-bottom"></div>
             </div>
         )}

         {/* --- PLANET TAB --- */}
         {activeTab === 'planet' && (
             <div className="tab-view planet-view">
                 <PlanetCard user={user} onClose={()=>{}} />
                 <button className="logout-button" onClick={onLogout}>Log Out</button>
                 <div className="spacer-bottom"></div>
             </div>
         )}
      </div>

      {/* 2. PLAYER OVERLAY */}
      {currentSong && (
          <>
            {/* A. Full Screen Modal */}
            <div className={`fullscreen-player ${isFullScreenPlayer ? 'open' : ''}`}>
                <div className="fs-header">
                    <button onClick={() => setIsFullScreenPlayer(false)} className="icon-btn"><ChevronDown size={32}/></button>
                    <span>Now Playing</span>
                    <div style={{width:32}}></div>
                </div>
                
                <div className="fs-art-container">
                    <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="fs-art" onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
                </div>

                <div className="fs-meta">
                    <h2>{currentSong.title}</h2>
                    <p>{currentSong.artistName}</p>
                </div>

                {/* Reuse existing Player Logic */}
                <Player 
                    song={currentSong}
                    playing={playing}
                    onToggle={() => setPlaying(!playing)}
                    onNext={() => {
                         const nextIdx = (currentIndex + 1) % queue.length;
                         setCurrentIndex(nextIdx);
                    }}
                    onPrev={() => {
                         const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
                         setCurrentIndex(prevIdx);
                    }}
                    onToggleLike={() => toggleLike(currentSong.id)}
                    
                    // --- EVOLUTION HOOK ---
                    onEnded={() => {
                        recordListen(currentSong.durationSeconds || 180, currentSong.genre);
                        // Auto play next
                        const nextIdx = (currentIndex + 1) % queue.length;
                        setCurrentIndex(nextIdx);
                    }}
                    
                    hideCover={true} 
                    hideMeta={true}
                />
            </div>

            {/* B. Mini Player Dock */}
            {!isFullScreenPlayer && (
                <div className="mini-player" onClick={() => setIsFullScreenPlayer(true)}>
                    <div className="mini-info">
                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="mini-thumb" onError={e=>e.target.src=PERSON_PLACEHOLDER}/>
                        <div>
                            <div className="mini-title">{currentSong.title}</div>
                            <div className="mini-artist">{currentSong.artistName}</div>
                        </div>
                    </div>
                    <div className="mini-controls">
                        <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); toggleLike(currentSong.id)}}>
                            <Heart size={20} fill={currentSong.liked ? "#ff00cc" : "none"} color={currentSong.liked ? "#ff00cc" : "white"}/>
                        </button>
                        <button className="icon-btn" onClick={(e)=>{e.stopPropagation(); setPlaying(!playing)}}>
                            {playing ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}
                        </button>
                    </div>
                    <div className="mini-progress"></div>
                </div>
            )}
          </>
      )}

      {/* 3. BOTTOM NAVIGATION */}
      <nav className="bottom-nav">
          <div className={`nav-item ${activeTab==='home'?'active':''}`} onClick={()=>setActiveTab('home')}>
              <Home size={24} /> <span>Home</span>
          </div>
          <div className={`nav-item ${activeTab==='search'?'active':''}`} onClick={()=>setActiveTab('search')}>
              <Search size={24} /> <span>Search</span>
          </div>
          <div className={`nav-item ${activeTab==='library'?'active':''}`} onClick={()=>setActiveTab('library')}>
              <Library size={24} /> <span>Library</span>
          </div>
          <div className={`nav-item ${activeTab==='planet'?'active':''}`} onClick={()=>setActiveTab('planet')}>
              <User size={24} /> <span>Planet</span>
          </div>
      </nav>

    </div>
  );
}
