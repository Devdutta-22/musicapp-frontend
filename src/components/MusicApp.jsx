import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Player from './Player';
import UploadCard from './UploadCard';
import LyricsPanel from './LyricsPanel';
import PlanetCard from './PlanetCard';
import PlaylistPanel from './PlaylistPanel';
import Leaderboard from './Leaderboard'; 
import AIChatBot from './AIChatBot';
import YouTube from 'react-youtube';
import '../App.css';
import {
    Home, Search, Library, User, PlusCircle,
    Play, Pause, Heart, ChevronDown, Zap, Mic2, ListMusic, MoreHorizontal,
    ListPlus, PlayCircle, ArrowRightCircle,
    Shuffle, Repeat, Repeat1, Trash2, ArrowUp, ArrowDown, Telescope, Sparkles, Sparkle,RotateCcw, ArrowLeft, Rocket, Orbit,
    X, Minimize2, MessageCircle, Trophy, Bot, Globe, Share2, 
    Youtube, Video, Image as ImageIcon
} from "lucide-react";

const PERSON_PLACEHOLDER = '/person-placeholder.png';

const FEATURED_ARTISTS = [
    { name: "Arijit Singh", image: "/artists/arijit.jpg" }, 
    { name: "Shreya Ghoshal", image: "/artists/shreya.jpg" },
    { name: "Sonu Nigam", image: "/artists/sonu.jpg" },
    { name: "Sunidhi Chauhan", image:"/artists/sunidhi.jpg"},
    { name: "K.K.", image:"/artists/kk.jpg"},
    { name: "Taylor Swift", image:"/artists/taylor.jpg" },
    { name: "Atif Aslam", image:"/artists/atif.jpg"},
    { name: "Kishore Kumar", image:"/artists/kishore.jpg"}, 
    { name: "Mohit Chauhan", image:"/artists/mohit.jpg"}, 
    { name: "Ariana Grande", image: "/artists/ariana.jpg" },
    { name: "Armaan Malik", image: "/artists/armaan.jpg" },
    { name: "A.R. Rahman", image: "/artists/ar.jpg"},
    { name: "Justin Bieber", image:"/artists/justin.jpg" },
];

const SPECIAL_IDS = [250, 277, 248, 470]; 

const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

export default function MusicApp({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
    const [searchMode, setSearchMode] = useState('local'); 
    const [showVideo, setShowVideo] = useState(true);

    const [selectedArtist, setSelectedArtist] = useState(null);
    const [specialView, setSpecialView] = useState(null); 
    const [songCurrentTime, setSongCurrentTime] = useState(0);

    const [libraryTab, setLibraryTab] = useState('liked');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(null);

    const [homeFeed, setHomeFeed] = useState([]);
    const [discoveryFeed, setDiscoveryFeed] = useState([]);
    const [allSongs, setAllSongs] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [songCache, setSongCache] = useState({});

    const [artistSongsFromDb, setArtistSongsFromDb] = useState([]);
    const [isArtistLoading, setIsArtistLoading] = useState(false);

    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [songProgress, setSongProgress] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('off');
    const [sleepTime, setSleepTime] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const sleepIntervalRef = useRef(null);
    
    // 1. YOUTUBE REMOTE CONTROL REF
    const ytPlayerRef = useRef(null);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");
    const YT_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; 
    const authHeaders = useMemo(() => ({ headers: { "X-User-Id": user?.id || 0 } }), [user?.id]);

    useEffect(() => {
        const closeMenu = () => { setOpenMenuId(null); setShowPlaylistSelector(null); };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // FETCH ARTIST DATA
    useEffect(() => {
        if (selectedArtist && selectedArtist.name) {
            setIsArtistLoading(true);
            setArtistSongsFromDb([]); 
            axios.get(`${API_BASE}/api/songs/search?q=${encodeURIComponent(selectedArtist.name)}`, authHeaders)
                .then(res => setArtistSongsFromDb(res.data))
                .catch(err => console.error(err))
                .finally(() => setIsArtistLoading(false));
        }
    }, [selectedArtist, API_BASE, authHeaders]);

    // 2. SYNC YT PROGRESS TO IN-APP CONTROLS
    useEffect(() => {
        let interval;
        if (playing && currentSong?.isYouTube && ytPlayerRef.current) {
            interval = setInterval(() => {
                const elapsed = ytPlayerRef.current.getCurrentTime();
                const total = ytPlayerRef.current.getDuration();
                setSongCurrentTime(elapsed);
                if (total > 0) setSongProgress((elapsed / total) * 100);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [playing, currentIndex, currentSong]);

    const searchYouTube = async (term) => {
        if (!YT_KEY) return [];
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: { part: 'snippet', maxResults: 15, q: term, type: 'video', key: YT_KEY }
            });
            return response.data.items.map(item => ({
                id: item.id.videoId, title: item.snippet.title, artistName: item.snippet.channelTitle,
                coverUrl: item.snippet.thumbnails.high.url, isYouTube: true
            }));
        } catch (error) { return []; }
    };

    // 3. MANUAL TRIGGER FOR GLOBAL SEARCH (Quota Saver)
    const triggerGlobalSearch = async () => {
        if (searchTerm.length > 1) {
            setLoading(true);
            const results = await searchYouTube(searchTerm);
            setSearchResults(results);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchMode === 'global') return;
        const delay = setTimeout(async () => {
            if (searchTerm.length > 1) {
                try {
                    const res = await axios.get(`${API_BASE}/api/songs/search?q=${searchTerm}`, authHeaders);
                    setSearchResults(res.data);
                } catch (e) { }
            } else { setSearchResults([]); }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm, searchMode]);

    function getSongById(id) {
        if (songCache[id]) return songCache[id];
        const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs, ...allSongs, ...artistSongsFromDb];
        return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
    }
    const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

    const playSong = (song, contextList) => {
        if (!song) return;
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (song.isYouTube) {
            setQueue([song.id]); setCurrentIndex(0); setShowVideo(true);
        } else {
            let newQueue = contextList && contextList.length > 0 ? contextList.map(s => s.id) : [song.id];
            if (shuffle) newQueue = shuffleArray(newQueue);
            setQueue(newQueue); setCurrentIndex(newQueue.indexOf(song.id));
        }
        setPlaying(true);
    };

    // 4. OVERRIDE TOGGLE TO CONTROL YT
    const togglePlayback = () => {
        const nextState = !playing;
        setPlaying(nextState);
        if (currentSong?.isYouTube && ytPlayerRef.current) {
            nextState ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo();
        }
    };

    const handleNextSong = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < queue.length) { setCurrentIndex(nextIdx); setPlaying(true); }
        else if (repeatMode === 'all') { setCurrentIndex(0); setPlaying(true); }
        else { setPlaying(false); }
    };

    const handlePrevSong = () => {
        if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setPlaying(true); }
    };

    const playNow = (song) => {
        if (song.isYouTube) { playSong(song); return; }
        const insertIndex = currentIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue); setCurrentIndex(insertIndex); setPlaying(true);
    };

    const toggleLike = async (songId) => {
        if (currentSong?.isYouTube) return;
        const update = (list) => list.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
        setHomeFeed(update); setSearchResults(update); setLikedSongs(update);
        try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); fetchLibraryData(); } catch (e) { }
    };

    async function loadFeeds() {
        setLoading(true);
        try {
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders); setHomeFeed(recent.data);
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders); setDiscoveryFeed(random.data);
            fetchLibraryData(); fetchAllSongs();
        } catch (e) { }
        setLoading(false);
    }
    useEffect(() => { loadFeeds(); }, []);
    
    // NAVIGATION LOGIC
    const handleNavClick = (tab) => {
        setActiveTab(tab);
        setSelectedArtist(null);
        setSpecialView(null);
        setIsFullScreenPlayer(false);
    };

    const openPlayer = () => setIsFullScreenPlayer(true);
    const closePlayer = () => {
        if (isLyricsExpanded) setIsLyricsExpanded(false);
        else setIsFullScreenPlayer(false);
    };

    const goHome = () => {
        setActiveTab('home'); setSelectedArtist(null); setSpecialView(null);
    };

    function fetchLibraryData() {
        axios.get(`${API_BASE}/api/songs/liked`, authHeaders).then(res => setLikedSongs(res.data));
        axios.get(`${API_BASE}/api/playlists`, authHeaders).then(res => setPlaylists(res.data));
    }

    function fetchAllSongs() {
        axios.get(`${API_BASE}/api/songs`, authHeaders).then(res => setAllSongs(res.data));
    }

    function shuffleArray(arr) {
        let a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const handleShare = (song) => {
        const url = `${window.location.origin}?songId=${song.id}`;
        navigator.clipboard.writeText(url);
        alert("Link copied!");
    };

    const SongRow = ({ s, list, onClick }) => (
        <div className="glass-row" onClick={onClick ? onClick : () => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb" alt={s.title} />
            <div className="row-info"><div className="row-title">{s.title}</div><div className="row-artist">{s.artistName}</div></div>
            {!s.isYouTube && <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "#666"} onClick={(e) => { e.stopPropagation(); toggleLike(s.id); }} />}
        </div>
    );

    const MainViewContent = useMemo(() => {
        return (
            <>
                {activeTab === 'home' && (
                    <div className="tab-pane home-animate">
                        <header className="glass-header">
                            <img src="/my-brand.png" alt="Logo" height="32" />
                            <div className="header-text"><h1>Hi, {user.username}</h1><p>Welcome to Astronote.</p></div>
                        </header>
                        <div className="dashboard-grid">
                            <div className="mini-card full-width" onClick={() => handleNavClick('all-songs')}>
                                <div className="mini-card-bg" style={{ backgroundImage: `url(/planets/my-art.jpg)` }}></div>
                                <div className="mini-card-overlay"><div className="mini-card-title"><ListMusic size={16}/> Browse All Music</div></div>
                            </div>
                        </div>
                        <h2 className="section-title">Top Artists</h2>
                        <div className="horizontal-scroll">
                            {FEATURED_ARTISTS.map((artist, i) => (
                                <div key={i} className="song-card" onClick={() => { setSelectedArtist(artist); setActiveTab('artist-view'); }} style={{ width: 120, marginRight: 16, cursor: 'pointer' }}>
                                    <img src={artist.image} alt={artist.name} style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', objectFit: 'cover' }} />
                                    <p className="song-title" style={{ textAlign: 'center', fontSize: 13, marginTop: 8 }}>{artist.name}</p>
                                </div>
                            ))}
                        </div>
                        <h2 className="section-title">Cosmic Arrivals</h2>
                        <div className="horizontal-scroll">{homeFeed.map(s => <div key={s.id} className="glass-card song-card" onClick={() => playSong(s, homeFeed)}><img src={s.coverUrl || PERSON_PLACEHOLDER} alt="" /><p className="song-title">{s.title}</p></div>)}</div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'artist-view' && selectedArtist && (
                    <div className="tab-pane">
                        <div className="glass-header">
                            <button className="icon-btn" onClick={goHome}><ArrowLeft size={24} color="white" /></button>
                            <div className="header-text"><h1>{selectedArtist.name}</h1></div>
                        </div>
                        <div className="list-vertical">
                            {isArtistLoading ? <div>Loading...</div> : artistSongsFromDb.map(s => <SongRow key={s.id} s={s} list={artistSongsFromDb} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="tab-pane">
                        <div className="search-toggle-container">
                            <div className={`search-toggle-track ${searchMode}`}>
                                <div className="toggle-thumb"></div>
                                <button className="toggle-btn" onClick={() => setSearchMode('local')}>Library</button>
                                <button className="toggle-btn" onClick={() => setSearchMode('global')}><Youtube size={14} color="#ff0000" /> Global</button>
                            </div>
                        </div>
                        <div className="search-wrapper">
                            <Search size={20} className="search-icon" />
                            <input 
                                className="glass-input" 
                                placeholder={searchMode === 'global' ? "Press Enter to search YouTube..." : "Search library..."}
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && searchMode === 'global' && triggerGlobalSearch()}
                            />
                        </div>
                        <div className="list-vertical">
                            {searchResults.map(s => <SongRow key={s.id} s={s} list={searchResults} onClick={() => playNow(s)} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="tab-pane">
                        <h2 className="page-title">Your Library</h2>
                        <div className="lib-box-container">
                            <div className={`lib-box ${libraryTab === 'liked' ? 'active' : ''}`} onClick={() => setLibraryTab('liked')}><Heart size={24} fill="#fff" /><span className="lib-box-title">Liked</span></div>
                            <div className={`lib-box ${libraryTab === 'playlists' ? 'active' : ''}`} onClick={() => setLibraryTab('playlists')}><ListMusic size={24} /><span className="lib-box-title">Playlists</span></div>
                        </div>
                        {libraryTab === 'liked' ? likedSongs.map(s => <SongRow key={s.id} s={s} list={likedSongs} />) : <PlaylistPanel playlists={playlists} onRefresh={fetchLibraryData} user={user} onPlayPlaylist={(pl) => playSong(pl.songs[0], pl.songs)} />}
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'ai' && <AIChatBot />}
                {activeTab === 'upload' && <div className="tab-pane"><h2 className="page-title">Upload</h2><UploadCard onUploaded={loadFeeds} /><div className="spacer"></div></div>}
            </>
        );
    }, [activeTab, searchMode, searchTerm, searchResults, homeFeed, user, loading, libraryTab, likedSongs, selectedArtist, artistSongsFromDb, isArtistLoading]);

    return (
        <div className="glass-shell">
            <div className="glass-viewport" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>{MainViewContent}</div>

            {currentSong && (
                <>
                    <div className={`glass-modal ${isFullScreenPlayer ? 'open' : ''} ${isLyricsExpanded ? 'transparent-mode' : ''}`}>
                        <div className="modal-scroll-body">
                            <div style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                                <div className="modal-header">
                                    <button onClick={closePlayer} className="icon-btn"><ChevronDown size={32} /></button>
                                    <div style={{display:'flex', gap: 10}}>
                                        {currentSong.isYouTube && (
                                            <button className="icon-btn" onClick={() => setShowVideo(!showVideo)}>
                                                {showVideo ? <ImageIcon size={24}/> : <Video size={24}/>}
                                            </button>
                                        )}
                                        <button className="icon-btn" onClick={() => handleShare(currentSong)}><Share2 size={24} color="white" /></button>
                                    </div>
                                </div>
                                {/* 5. CONSOLIDATED YT & THUMBNAIL AREA */}
                                <div className="art-glow-container">
                                    <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" alt="" />
                                    {currentSong.isYouTube && showVideo ? (
                                        <div className="youtube-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, borderRadius: '20px', overflow: 'hidden' }}>
                                            <YouTube 
                                                videoId={currentSong.id} 
                                                opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, modestbranding: 1, controls: 0 } }} 
                                                onReady={(e) => { ytPlayerRef.current = e.target; }}
                                                onEnd={handleNextSong}
                                            />
                                        </div>
                                    ) : (
                                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" alt="" />
                                    )}
                                </div>
                                <div className="modal-meta"><h1>{currentSong.title}</h1><p>{currentSong.artistName}</p></div>
                            </div>
                            
                            {/* 6. PERSISTENT IN-APP CONTROLS */}
                            <div className="modal-controls-wrapper" style={{ opacity: isLyricsExpanded ? 0 : 1, height: isLyricsExpanded ? 0 : 'auto', overflow: 'hidden' }}>
                                <Player 
                                    song={currentSong} playing={playing} onToggle={togglePlayback} 
                                    onNext={handleNextSong} onPrev={handlePrevSong} onToggleLike={() => toggleLike(currentSong.id)} 
                                    hideCover={true} hideMeta={true} repeatMode={repeatMode} onToggleRepeat={() => setRepeatMode(r => r === 'off' ? 'all' : 'off')} 
                                    shuffle={shuffle} onToggleShuffle={() => setShuffle(!shuffle)}
                                    onProgress={(c) => { if(!currentSong.isYouTube) setSongCurrentTime(c); }} 
                                />
                            </div>
                            <div className="modal-section" style={isLyricsExpanded ? { position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:2000, overflowY:'auto' } : {}}>
                                <div className={isLyricsExpanded ? '' : 'glass-inset'}>
                                    <LyricsPanel song={currentSong} currentTime={songCurrentTime} onExpand={() => setIsLyricsExpanded(true)} isFullMode={isLyricsExpanded} />
                                    {isLyricsExpanded && <button className="icon-btn" onClick={() => setIsLyricsExpanded(false)} style={{ position: 'fixed', top: 20, right: 20, zIndex: 2001, background: 'rgba(255,255,255,0.1)', padding: 8 }}><Minimize2 size={24} color="white"/></button>}
                                </div>
                            </div>
                            <div className="spacer"></div>
                        </div>
                    </div>

                    {!isFullScreenPlayer && (
                        <div className="glass-dock" onClick={openPlayer}>
                            <div className="dock-left"><img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="dock-thumb" alt="" /><div className="dock-info"><div className="dock-title">{currentSong.title}</div><div className="dock-artist">{currentSong.artistName}</div></div></div>
                            <div className="dock-right"><button className="icon-btn dock-play" onClick={(e) => { e.stopPropagation(); togglePlayback(); }}>{playing ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}</button></div>
                            <div className="dock-progress"><div className="dock-progress-fill" style={{ width: `${songProgress}%` }}></div></div>
                        </div>
                    )}
                </>
            )}

            <nav className="glass-nav" style={{ display: isLyricsExpanded ? 'none' : 'flex' }}>
                <button className={activeTab === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}><Home size={24} /><span>Home</span></button>
                <button className={activeTab === 'search' ? 'active' : ''} onClick={() => handleNavClick('search')}><Search size={24} /><span>Search</span></button>
                <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => handleNavClick('ai')}><Bot size={24} /><span>Lyra</span></button>
                <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => handleNavClick('upload')}><Rocket size={24} /><span>Upload</span></button>
                <button className={activeTab === 'library' ? 'active' : ''} onClick={() => handleNavClick('library')}><Library size={24} /><span>Library</span></button>
            </nav>
        </div>
    );
}
