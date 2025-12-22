import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard';
import PlaylistPanel from './PlaylistPanel';
import Leaderboard from './Leaderboard'; 
import AIChatBot from './AIChatBot';
import '../App.css';
import {
    Home, Search, Library, User, PlusCircle,
    Play, Pause, Heart, ChevronDown, Zap, Mic2, ListMusic, MoreHorizontal,
    ListPlus, PlayCircle, ArrowRightCircle,
    Shuffle, Repeat, Repeat1, Trash2, ArrowUp, ArrowDown, Telescope, Sparkles, Sparkle,RotateCcw, ArrowLeft, Rocket, Orbit,
    X, Minimize2, MessageCircle, Trophy, Bot, Globe
} from "lucide-react";

const PERSON_PLACEHOLDER = '/person-placeholder.png';

const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

// --- 1. DEVELOPER CONFIG: HANDPICKED ARTISTS ---
const FEATURED_ARTISTS = [
    { name: "Arijit Singh", image: "/artists/arijit.jpg" }, 
    { name: "Sonu Nigam", image: "/artists/sonu.jpg" },
    { name: "The Weeknd", image: "/artists/weeknd.jpg" },
    { name: "Taylor Swift", image: PERSON_PLACEHOLDER },
    { name: "A.R. Rahman", image: PERSON_PLACEHOLDER },
    { name: "Atif Aslam", image: PERSON_PLACEHOLDER },
    { name: "Justin Bieber", image: PERSON_PLACEHOLDER },
    { name: "Badshah", image: PERSON_PLACEHOLDER },
];

// --- 2. DEVELOPER CONFIG: SPECIAL SONG IDs ---
// REPLACE these numbers with the actual IDs from your database
const SPECIAL_IDS = [15, 22, 101, 4]; 

export default function MusicApp({ user, onLogout }) {
    // --- VIEW STATE ---
    const [activeTab, setActiveTab] = useState('home');
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
    
    // --- NEW: Sub-View State ---
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [specialView, setSpecialView] = useState(null); 
    
    // --- SYNC STATE ---
    const [songCurrentTime, setSongCurrentTime] = useState(0);

    // --- MENUS ---
    const [libraryTab, setLibraryTab] = useState('liked');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(null);

    // --- DATA ---
    const [homeFeed, setHomeFeed] = useState([]);
    const [discoveryFeed, setDiscoveryFeed] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [songCache, setSongCache] = useState({});

    // --- NEW STATE FOR DB RESULTS ---
    const [artistSongsFromDb, setArtistSongsFromDb] = useState([]);
    const [isArtistLoading, setIsArtistLoading] = useState(false);

    // --- PLAYER ---
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [songProgress, setSongProgress] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off');
    const [sleepTime, setSleepTime] = useState(null);

    // --- UI ---
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const sleepIntervalRef = useRef(null);

    // Close menus on click away
    useEffect(() => {
        const closeMenu = () => {
            setOpenMenuId(null);
            setShowPlaylistSelector(null);
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");
    
    const authHeaders = useMemo(() => ({ headers: { "X-User-Id": user?.id || 0 } }), [user?.id]);

    // --- LOGIC: FETCH ARTIST SONGS FROM DB ---
    // This runs whenever 'selectedArtist' changes.
    useEffect(() => {
        if (selectedArtist && selectedArtist.name) {
            setIsArtistLoading(true);
            setArtistSongsFromDb([]); // Clear previous results immediately

            // Call the Search API with the artist's name
            axios.get(`${API_BASE}/api/songs/search?q=${encodeURIComponent(selectedArtist.name)}`, authHeaders)
                .then(res => {
                    setArtistSongsFromDb(res.data);
                })
                .catch(err => console.error("Failed to fetch artist songs", err))
                .finally(() => setIsArtistLoading(false));
        }
    }, [selectedArtist, API_BASE, authHeaders]);

    // --- FILTER LOGIC (For Special Banner Only) ---
    const specialSongsList = useMemo(() => {
        const pool = [...allSongs, ...homeFeed, ...discoveryFeed];
        // Remove duplicates
        const uniquePool = Array.from(new Map(pool.map(item => [item.id, item])).values());
        return uniquePool.filter(s => SPECIAL_IDS.includes(s.id));
    }, [allSongs, homeFeed, discoveryFeed]);


    // --- NAVIGATION ---
    useEffect(() => {
        if (!window.history.state) window.history.replaceState({ tab: 'home', player: false }, '');
        
        const handlePopState = (event) => {
            const state = event.state || { tab: 'home', player: false };
            setActiveTab(state.tab);
            setIsFullScreenPlayer(!!state.player);
            
            if (state.tab === 'home') {
                setSelectedArtist(null);
                setSpecialView(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const goHome = () => {
        setActiveTab('home');
        setSelectedArtist(null);
        setSpecialView(null);
        window.history.replaceState({ tab: 'home' }, '');
    };

    const handleNavClick = (tab) => {
        if (tab === activeTab && !selectedArtist && !specialView) return;
        
        if (tab === 'home') {
             window.history.back();
             setSelectedArtist(null);
             setSpecialView(null);
        } else {
            const newState = { tab, player: false };
            if (activeTab === 'home') window.history.pushState(newState, '');
            else window.history.replaceState(newState, '');
            setActiveTab(tab);
            setIsFullScreenPlayer(false);
            setSelectedArtist(null);
            setSpecialView(null);
        }
    };

    const openPlayer = () => {
        if (isFullScreenPlayer) return;
        window.history.pushState({ tab: activeTab, player: true }, '');
        setIsFullScreenPlayer(true);
    };

    const closePlayer = () => {
        if (isLyricsExpanded) {
            setIsLyricsExpanded(false);
            return;
        }
        window.history.back();
    };

    // --- LOAD DATA ---
    useEffect(() => { loadFeeds(); }, []);

    async function loadFeeds() {
        setLoading(true);
        try {
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
            setHomeFeed(recent.data);
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
            setDiscoveryFeed(random.data);
            fetchLibraryData();
            fetchAllSongs(); // Fetch all in background
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function fetchAllSongs() {
        try {
            const res = await axios.get(`${API_BASE}/api/songs`, authHeaders);
            setAllSongs(res.data);
        } catch (e) { console.error(e); }
    }

    async function fetchLibraryData() {
        try {
            const liked = await axios.get(`${API_BASE}/api/songs/liked`, authHeaders);
            setLikedSongs(liked.data);
            const pl = await axios.get(`${API_BASE}/api/playlists`, authHeaders).catch(() => ({ data: [] }));
            setPlaylists(pl.data || []);
        } catch (e) { console.error(e); }
    }

    useEffect(() => { if (activeTab === 'library') fetchLibraryData(); }, [activeTab]);

    // Search Debounce
    useEffect(() => {
        const delay = setTimeout(async () => {
            if (searchTerm.length > 1) {
                try {
                    const res = await axios.get(`${API_BASE}/api/songs/search?q=${searchTerm}`, authHeaders);
                    setSearchResults(res.data);
                } catch (e) { }
            } else { setSearchResults([]); }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    function getSongById(id) {
        if (songCache[id]) return songCache[id];
        const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs, ...allSongs, ...artistSongsFromDb];
        return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
    }
    const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

    // --- PLAYBACK ---
    const playSong = (song, contextList) => {
        if (!song) return;
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        let newQueue = contextList && contextList.length > 0 ? contextList.map(s => s.id) : [song.id];
        if (shuffle) newQueue = shuffleArray(newQueue);
        setQueue(newQueue);
        setCurrentIndex(newQueue.indexOf(song.id));
        setPlaying(true);
    };

    const playNow = (song) => {
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (queue.length === 0) { playSong(song); return; }
        const newQueue = [...queue];
        const insertIndex = currentIndex + 1;
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue);
        setCurrentIndex(insertIndex);
        setPlaying(true);
    };

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const toggleShuffle = () => setShuffle(prev => !prev);
    const toggleRepeat = () => setRepeatMode(prev => prev === 'off' ? 'all' : (prev === 'all' ? 'one' : 'off'));

    const toggleLike = async (songId) => {
        const update = (list) => list.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
        setHomeFeed(update); setDiscoveryFeed(update); setSearchResults(update); setLikedSongs(update); setAllSongs(update);
        // Also update artist songs state so the heart updates instantly
        setArtistSongsFromDb(update);
        
        try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); fetchLibraryData(); } catch (e) { }
    };

    const addToPlaylist = async (playlistId, songId) => {
        try {
            await axios.post(`${API_BASE}/api/playlists/${playlistId}/songs`, { songId }, authHeaders);
            alert("Added to playlist!");
            setShowPlaylistSelector(null);
        } catch (e) { alert("Failed to add."); }
    };

    const playNext = (song) => {
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (queue.length === 0) { playSong(song); return; }
        const newQueue = [...queue];
        const insertIndex = currentIndex + 1;
        const existingIdx = newQueue.indexOf(song.id);
        if (existingIdx > -1 && existingIdx !== currentIndex) {
            newQueue.splice(existingIdx, 1);
            if (existingIdx < insertIndex) insertIndex--;
        }
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue);
    };

    const addToQueue = (song) => {
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (queue.length === 0) { playSong(song); return; }
        if (!queue.includes(song.id)) setQueue([...queue, song.id]);
    };

    const clearQueue = () => {
        if (currentIndex === -1) return;
        if (window.confirm("Clear queue except current song?")) {
            setQueue([queue[currentIndex]]);
            setCurrentIndex(0);
        }
    };

    const restoreQueue = () => {
        if (homeFeed.length === 0) return;
        if (window.confirm("Restore queue from Fresh Arrivals?")) {
            const newQ = homeFeed.map(s => s.id);
            setQueue(newQ);
            const newIdx = newQ.indexOf(currentSong?.id);
            setCurrentIndex(newIdx !== -1 ? newIdx : 0);
        }
    };

    const moveItem = (oldIndex, newIndex) => {
        if (oldIndex < 0 || oldIndex >= queue.length || newIndex < 0 || newIndex >= queue.length) return;
        setQueue(prev => {
            const q = [...prev];
            const [item] = q.splice(oldIndex, 1);
            q.splice(newIndex, 0, item);
            if (currentIndex === oldIndex) setCurrentIndex(newIndex);
            else if (currentIndex >= newIndex && currentIndex < oldIndex) setCurrentIndex(c => c + 1);
            else if (currentIndex <= newIndex && currentIndex > oldIndex) setCurrentIndex(c => c - 1);
            return q;
        });
    };

    const removeAtIndex = (idx) => {
        setQueue(prev => {
            const newQ = [...prev];
            newQ.splice(idx, 1);
            if (idx < currentIndex) setCurrentIndex(c => c - 1);
            return newQ;
        });
    };

    const handleNextSong = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < queue.length) {
            setCurrentIndex(nextIdx);
            setPlaying(true);
        } else if (repeatMode === 'all') {
            setCurrentIndex(0);
            setPlaying(true);
        } else {
            setPlaying(false);
        }
    };

    const handlePrevSong = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setPlaying(true);
        } else if (repeatMode === 'all') {
            setCurrentIndex(queue.length - 1);
            setPlaying(true);
        }
    };

    const recordListen = async (duration, genre) => {
        try {
            const mins = Math.ceil((duration || 180) / 60);
            await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: mins, genre: genre || "Unknown" });
            user.totalMinutesListened += mins;
        } catch (e) { }
    };

    useEffect(() => {
        if (!currentSong || !('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title,
            artist: currentSong.artistName,
            album: "Astronote Music",
            artwork: [{ src: currentSong.coverUrl || PERSON_PLACEHOLDER, sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevSong);
        navigator.mediaSession.setActionHandler('nexttrack', handleNextSong);
    }, [currentSong, currentIndex, queue]);

    useEffect(() => {
        if (sleepTime !== null && sleepTime > 0) {
            sleepIntervalRef.current = setTimeout(() => {
                setSleepTime(prev => prev <= 1 ? (setPlaying(false), null) : prev - 1);
            }, 60000);
        }
        return () => clearTimeout(sleepIntervalRef.current);
    }, [sleepTime]);

    // --- REUSABLE COMPONENTS ---
    const SongRow = ({ s, list, onClick }) => (
        <div className="glass-row" onClick={onClick ? onClick : () => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb" onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="row-info">
                <div className="row-title">{s.title}</div>
                <div className="row-artist">{s.artistName}</div>
            </div>
            <div className="row-actions">
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(s.id) }}>
                    <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "rgba(255,255,255,0.5)"} />
                </button>
                <div className="context-menu-container">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}>
                        <MoreHorizontal size={20} color="rgba(255,255,255,0.7)" />
                    </button>
                    {openMenuId === s.id && (
                        <div className="context-menu" onClick={e => e.stopPropagation()}>
                            <button className="menu-item" onClick={() => { playNow(s); setOpenMenuId(null); }}><PlayCircle /> Play Now</button>
                            <button className="menu-item" onClick={() => { playNext(s); setOpenMenuId(null); }}><ArrowRightCircle /> Play Next</button>
                            <button className="menu-item" onClick={() => { addToQueue(s); setOpenMenuId(null); }}><ListPlus /> Add to Queue</button>
                            <button className="menu-item" onClick={() => { setShowPlaylistSelector(s.id); setOpenMenuId(null); }}><ListMusic /> Add to Playlist</button>
                        </div>
                    )}
                </div>
            </div>
            {showPlaylistSelector === s.id && (
                <div className="glass-dropdown-menu" style={{ position: 'fixed', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 250, padding: 10, background: 'rgba(20, 10, 40, 0.95)', border: '1px solid #ffffff44', borderRadius: 10 }}>
                    <div className="menu-header" style={{ marginBottom: 10, borderBottom: '1px solid #ffffff22' }}>Select Playlist</div>
                    {playlists.map(pl => (
                        <button key={pl.id} className="menu-option" onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id, s.id); }}>{pl.name}</button>
                    ))}
                    <button className="menu-option danger" style={{ marginTop: 10, background: '#ff0055aa' }} onClick={(e) => { e.stopPropagation(); setShowPlaylistSelector(null); }}>Cancel</button>
                </div>
            )}
        </div>
    );

    const HomeSongCard = ({ s, list }) => (
        <div className="glass-card song-card" onClick={() => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="marquee-container">
                <p className={`song-title ${s.title.length > 15 ? 'marquee-text' : ''}`}>{s.title}</p>
            </div>
            <div className="marquee-container">
                <p className={`song-artist ${s.artistName.length > 15 ? 'marquee-text' : ''}`}>{s.artistName}</p>
            </div>
        </div>
    );

    // --- OPTIMIZATION: MEMOIZE MAIN CONTENT ---
    const MainViewContent = useMemo(() => {
        return (
            <>
                {/* --- 1. HOME TAB --- */}
                {activeTab === 'home' && (
                    <div className="tab-pane home-animate">
                        <header className="glass-header">
                            <img src="/my-brand.png" alt="Logo" height="32" />
                            <div className="header-text">
                                <h1>Hi, {user.username}</h1>
                                <p>Welcome to your galaxy.</p>
                            </div>
                        </header>

                        <div className="usp-slider">
                            {USP_FEATURES.map((feat, i) => (
                                <div key={i} className="glass-card usp-card" style={{ background: feat.accent }}>
                                    <div className="usp-icon">{feat.icon}</div>
                                    <h3>{feat.title}</h3>
                                    <p>{feat.subtitle}</p>
                                </div>
                            ))}
                        </div>

                        <div className="dashboard-grid">
                            <div className="mini-card" onClick={() => handleNavClick('leaderboard')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/trophy.jpeg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><Trophy size={16}/> Rankings</div></div>
                            </div>
                            <div className="mini-card" onClick={() => handleNavClick('planet')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/planetscard.jpeg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><Sparkle size={16}/> Your Aura</div></div>
                            </div>
                            <div className="mini-card full-width" onClick={() => handleNavClick('all-songs')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/my-art.jpg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><ListMusic size={16}/> Browse All Music</div></div>
                            </div>
                        </div>

                        {/* --- ARTISTS ROW (MANUAL) --- */}
                        <h2 className="section-title">Top Artists</h2>
                        <div className="horizontal-scroll">
                            {FEATURED_ARTISTS.map((artist, i) => (
                                <div key={i} className="glass-card song-card" onClick={() => { setSelectedArtist(artist); setActiveTab('artist-view'); }}>
                                    <img src={artist.image} style={{ borderRadius: '50%', aspectRatio: '1/1', objectFit: 'cover', width: '100%', marginBottom: 10 }} alt={artist.name}/>
                                    <p className="song-title" style={{ textAlign: 'center', fontSize: 13 }}>{artist.name}</p>
                                </div>
                            ))}
                        </div>

                        {/* --- SPECIAL BANNER (MANUAL IDs) --- */}
                        <h2 className="section-title">Specials</h2>
                        <div className="artistic-box" onClick={() => { setSpecialView('christmas'); setActiveTab('special-view'); }}>
                            <div className="artistic-bg" style={{ backgroundImage: 'url(/banners/christmas-bg.jpg)' }}></div>
                            <div className="artistic-overlay">
                                <div className="artistic-title"><Sparkles color="#00ffff"/> Christmas Hits</div>
                                <div className="artistic-subtitle">Feel the magic of the season</div>
                            </div>
                        </div>

                        <h2 className="section-title">Cosmic Arrivals</h2>
                        <div className="horizontal-scroll">
                            {homeFeed.map(s => <HomeSongCard key={s.id} s={s} list={homeFeed} />)}
                        </div>

                        <h2 className="section-title">Discovery</h2>
                        <div className="horizontal-scroll">
                            {discoveryFeed.map(s => <HomeSongCard key={s.id} s={s} list={discoveryFeed} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {/* --- 2. ARTIST VIEW (FETCHED FROM DB) --- */}
                {/* --- ARTISTS ROW (SQUARE IMAGES / NO FRAMES) --- */}
                        <h2 className="section-title">Top Artists</h2>
                        <div className="horizontal-scroll" style={{ paddingBottom: 10 }}>
                            {FEATURED_ARTISTS.map((artist, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => { setSelectedArtist(artist); setActiveTab('artist-view'); }}
                                    style={{ 
                                        flex: '0 0 auto', 
                                        width: 110,  /* Slightly wider for square cards */
                                        marginRight: 15, 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <img 
                                        src={artist.image} 
                                        alt={artist.name}
                                        style={{ 
                                            width: '100%', 
                                            aspectRatio: '1/1', /* Forces a perfect square */
                                            objectFit: 'cover', 
                                            borderRadius: '4px', /* Tiny rounded corner for polish, set to 0px for sharp corners */
                                            marginBottom: 8
                                        }} 
                                    />
                                    <p style={{ 
                                        fontSize: 13, 
                                        color: '#eee',
                                        margin: 0,
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: '500'
                                    }}>
                                        {artist.name}
                                    </p>
                                </div>
                            ))}
                        </div>

                {/* --- 3. SPECIAL VIEW --- */}
                {activeTab === 'special-view' && specialView === 'christmas' && (
                    <div className="tab-pane">
                        <div className="glass-header">
                            <button className="icon-btn" onClick={goHome}><ArrowLeft size={24} color="white" /></button>
                            <div className="header-text">
                                <h1>Christmas Specials</h1>
                                <p>Curated for the Holidays</p>
                            </div>
                        </div>
                        <div className="list-vertical">
                            {specialSongsList.length > 0 ? (
                                specialSongsList.map(s => <SongRow key={s.id} s={s} list={specialSongsList} />)
                            ) : (
                                <div style={{textAlign:'center', padding:20, color:'#aaa', fontSize: 14}}>
                                    No songs found matching IDs.<br/>
                                    <span style={{fontSize:12, opacity:0.7}}>Check SPECIAL_IDS in MusicApp.jsx</span>
                                </div>
                            )}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {/* --- 4. EXISTING VIEWS --- */}
                {activeTab === 'all-songs' && (
                    <div className="tab-pane">
                        <div className="glass-header">
                            <button className="icon-btn" onClick={() => handleNavClick('home')}><ArrowLeft size={24} color="white" /></button>
                            <div className="header-text"><h1>All Songs</h1><p>{allSongs.length} Tracks</p></div>
                        </div>
                        <div className="list-vertical">
                            {allSongs.map(s => <SongRow key={s.id} s={s} list={allSongs} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="tab-pane">
                        <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Search size={20} className="search-icon" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                            <input className="glass-input" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus style={{ paddingLeft: 40 }} />
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="icon-btn" style={{ position: 'absolute', right: 8, padding: 4 }}><X size={18} color="#ccc" /></button>}
                        </div>
                        <div className="list-vertical">
                            {searchResults.map(s => <SongRow key={s.id} s={s} list={searchResults} onClick={() => playNow(s)} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="tab-pane">
                        <h2 className="page-title">Upload Music</h2>
                        <UploadCard onUploaded={loadFeeds} />
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'ai' && <AIChatBot />}

                {activeTab === 'leaderboard' && <Leaderboard user={user} />}

                {activeTab === 'library' && (
                    <div className="tab-pane">
                        <h2 className="page-title">Your Library</h2>
                        <div className="lib-box-container">
                            <div className={`lib-box ${libraryTab === 'liked' ? 'active' : ''}`} onClick={() => setLibraryTab('liked')}>
                                <Heart size={32} fill={libraryTab === 'liked' ? "#fff" : "none"} color="#fff" />
                                <span className="lib-box-title">Liked Songs</span>
                            </div>
                            <div className={`lib-box ${libraryTab === 'playlists' ? 'active' : ''}`} onClick={() => setLibraryTab('playlists')}>
                                <ListMusic size={32} color="#fff" />
                                <span className="lib-box-title">Playlists</span>
                            </div>
                        </div>
                        {libraryTab === 'liked' && (
                            likedSongs.length === 0 
                            ? <div style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No liked songs yet.</div>
                            : <div className="list-vertical">{likedSongs.map(s => <SongRow key={s.id} s={s} list={likedSongs} />)}</div>
                        )}
                        {libraryTab === 'playlists' && (
                            <PlaylistPanel playlists={playlists} onRefresh={fetchLibraryData} user={user} onPlayPlaylist={(pl) => { if (pl.songs?.length) playSong(pl.songs[0], pl.songs); }} />
                        )}
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'planet' && (
                    <div className="tab-pane">
                        <PlanetCard user={user} onClose={() => handleNavClick('home')} />
                        <button className="glass-btn logout-btn" onClick={onLogout}>Sign Out</button>
                        <div className="spacer"></div>
                    </div>
                )}
            </>
        );
    }, [activeTab, homeFeed, discoveryFeed, allSongs, searchResults, libraryTab, likedSongs, playlists, user, searchTerm, openMenuId, showPlaylistSelector, queue, currentIndex, shuffle, repeatMode, specialSongsList, artistSongsFromDb, isArtistLoading, selectedArtist, specialView]);

    return (
        <div className="glass-shell">
            <div className="glass-viewport" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                {MainViewContent}
            </div>

            {currentSong && (
                <>
                    {/* Full Screen Player */}
                    <div className={`glass-modal ${isFullScreenPlayer ? 'open' : ''} ${isLyricsExpanded ? 'transparent-mode' : ''}`}>
                        <div className="modal-scroll-body">
                            <div style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                                <div className="modal-header"><button onClick={closePlayer} className="icon-btn"><ChevronDown size={32} /></button></div>
                                <div className="art-glow-container">
                                    <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" alt="" />
                                    <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" alt="" />
                                </div>
                                <div className="modal-meta"><h1>{currentSong.title}</h1><p>{currentSong.artistName}</p></div>
                            </div>
                            <div className="modal-controls-wrapper" style={{ opacity: isLyricsExpanded ? 0 : 1, pointerEvents: isLyricsExpanded ? 'none' : 'auto', height: isLyricsExpanded ? 0 : 'auto', overflow: 'hidden' }}>
                                <Player song={currentSong} playing={playing} onToggle={() => setPlaying(!playing)} onNext={handleNextSong} onPrev={handlePrevSong} onToggleLike={() => toggleLike(currentSong.id)} onEnded={() => { recordListen(currentSong.durationSeconds, currentSong.genre); handleNextSong(); }} hideCover={true} hideMeta={true} repeatMode={repeatMode} onToggleRepeat={toggleRepeat} shuffle={shuffle} onToggleShuffle={toggleShuffle} sleepTime={sleepTime} onSetSleepTimer={setSleepTime} 
                                onProgress={(c, t) => { setSongProgress(t ? (c / t) * 100 : 0); setSongCurrentTime(c); }} />
                            </div>
                            <div className="modal-section" style={isLyricsExpanded ? { position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:2000, overflowY:'auto' } : {}}>
                                <div className={isLyricsExpanded ? '' : 'glass-inset'}>
                                    <LyricsPanel song={currentSong} currentTime={songCurrentTime} onExpand={() => setIsLyricsExpanded(true)} isFullMode={isLyricsExpanded} />
                                    {isLyricsExpanded && <button className="icon-btn" onClick={() => setIsLyricsExpanded(false)} style={{ position: 'fixed', top: 20, right: 20, zIndex: 2001, background: 'rgba(255,255,255,0.1)', padding: 8 }}><Minimize2 size={24} color="white"/></button>}
                                </div>
                            </div>
                            <div className="modal-section" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                                <div className="section-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ListMusic size={20} color="#aaa" /><h3>Up Next</h3></div>
                                    <div style={{ display: 'flex', gap: 10 }}><button className="icon-btn" onClick={clearQueue}><Trash2 size={18}/></button><button className="icon-btn" onClick={restoreQueue}><RotateCcw size={18}/></button></div>
                                </div>
                                <div className="list-vertical">
                                    {queue.map((id, i) => {
                                        if (i < currentIndex - 2 || i > currentIndex + 20) return null;
                                        const s = getSongById(id);
                                        const isCurrent = i === currentIndex;
                                        return (
                                            <div key={`${id}-${i}`} className={`glass-row compact ${isCurrent ? 'active-row' : ''}`}>
                                                <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb small" alt="" />
                                                <div className="row-info"><div className="row-title" style={{ color: isCurrent ? 'var(--neon)' : 'white' }}>{s.title}</div><div className="row-artist">{s.artistName}</div></div>
                                                <div className="row-actions">
                                                    {!isCurrent && <button className="icon-btn" onClick={() => { setCurrentIndex(i); setPlaying(true); }}><Play size={14} /></button>}
                                                    <button className="icon-btn" onClick={() => moveItem(i, i - 1)}><ArrowUp size={16} /></button>
                                                    <button className="icon-btn" onClick={() => moveItem(i, i + 1)}><ArrowDown size={16} /></button>
                                                    <button className="icon-btn" onClick={() => removeAtIndex(i)}><Trash2 size={16} color="#666" /></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="spacer"></div>
                        </div>
                    </div>
                    {/* Mini Player */}
                    {!isFullScreenPlayer && (
                        <div className="glass-dock" onClick={openPlayer}>
                            <div className="dock-left">
                                <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="dock-thumb" alt="" />
                                <div className="dock-info"><div className="dock-title">{currentSong.title}</div><div className="dock-artist">{currentSong.artistName}</div></div>
                            </div>
                            <div className="dock-right">
                                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id) }}><Heart size={20} fill={currentSong.liked ? "#ff00cc" : "none"} color={currentSong.liked ? "#ff00cc" : "white"} /></button>
                                <button className="icon-btn dock-play" onClick={(e) => { e.stopPropagation(); setPlaying(!playing) }}>{playing ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" style={{ marginLeft: 2 }} />}</button>
                            </div>
                            <div className="dock-progress"><div className="dock-progress-fill" style={{ width: `${songProgress}%` }}></div></div>
                        </div>
                    )}
                </>
            )}

            {/* --- FIXED NAVIGATION BAR (AI is regular now) --- */}
            <nav className="glass-nav" style={{ display: isLyricsExpanded ? 'none' : 'flex' }}>
                <button className={activeTab === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}>
                    <Home size={24} /><span>Home</span>
                </button>
                <button className={activeTab === 'search' ? 'active' : ''} onClick={() => handleNavClick('search')}>
                    <Search size={24} /><span>Search</span>
                </button>
                <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => handleNavClick('ai')}>
                    <Bot size={24} /><span>Lyra</span>
                </button>
                <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => handleNavClick('upload')}>
                    <Rocket size={24} /><span>Upload</span>
                </button>
                <button className={activeTab === 'library' ? 'active' : ''} onClick={() => handleNavClick('library')}>
                    <Library size={24} /><span>Library</span>
                </button>
            </nav>
        </div>
    );
}
