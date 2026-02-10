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

const USP_FEATURES = [
    { title: "Planet Evolution", subtitle: "Your taste creates a world.", icon: <Sparkles size={24} color="#00ffff" />, accent: "linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Neon Vibes", subtitle: "Experience the glow.", icon: <Zap size={24} color="#ff00cc" />, accent: "linear-gradient(135deg, rgba(255, 0, 204, 0.15), rgba(0, 0, 0, 0))" },
    { title: "Lossless Audio", subtitle: "Crystal clear sound.", icon: <Mic2 size={24} color="#00ff88" />, accent: "linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 0, 0, 0))" },
];

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

export default function MusicApp({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('home');
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
    const [searchMode, setSearchMode] = useState('local'); 
    const [showVideo, setShowVideo] = useState(true); // Toggle between video and controls

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

    useEffect(() => {
        const closeMenu = () => {
            setOpenMenuId(null);
            setShowPlaylistSelector(null);
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");
    const YT_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; 
    
    const authHeaders = useMemo(() => ({ headers: { "X-User-Id": user?.id || 0 } }), [user?.id]);

    useEffect(() => {
        if (selectedArtist && selectedArtist.name) {
            setIsArtistLoading(true);
            setArtistSongsFromDb([]); 
            axios.get(`${API_BASE}/api/songs/search?q=${encodeURIComponent(selectedArtist.name)}`, authHeaders)
                .then(res => setArtistSongsFromDb(res.data))
                .catch(err => console.error("Failed to fetch artist songs", err))
                .finally(() => setIsArtistLoading(false));
        }
    }, [selectedArtist, API_BASE, authHeaders]);

    const specialSongsList = useMemo(() => {
        const pool = [...allSongs, ...homeFeed, ...discoveryFeed];
        const uniquePool = Array.from(new Map(pool.map(item => [item.id, item])).values());
        return uniquePool.filter(s => SPECIAL_IDS.includes(s.id));
    }, [allSongs, homeFeed, discoveryFeed]);

    useEffect(() => {
        if (!window.history.state) window.history.replaceState({ tab: 'home', player: false }, '');
        const handlePopState = (event) => {
            const state = event.state || { tab: 'home', player: false };
            setActiveTab(state.tab);
            setIsFullScreenPlayer(!!state.player);
            if (state.tab === 'home') { setSelectedArtist(null); setSpecialView(null); }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const goHome = () => {
        setActiveTab('home'); setSelectedArtist(null); setSpecialView(null);
        window.history.replaceState({ tab: 'home' }, '');
    };

    const handleNavClick = (tab) => {
        if (tab === activeTab && !selectedArtist && !specialView) return;
        if (tab === 'home') {
             window.history.back(); setSelectedArtist(null); setSpecialView(null);
        } else {
            const newState = { tab, player: false };
            if (activeTab === 'home') window.history.pushState(newState, '');
            else window.history.replaceState(newState, '');
            setActiveTab(tab); setIsFullScreenPlayer(false); setSelectedArtist(null); setSpecialView(null);
        }
    };

    const openPlayer = () => {
        if (isFullScreenPlayer) return;
        window.history.pushState({ tab: activeTab, player: true }, '');
        setIsFullScreenPlayer(true);
    };

    const closePlayer = () => {
        if (isLyricsExpanded) { setIsLyricsExpanded(false); return; }
        window.history.back();
    };

    useEffect(() => { loadFeeds(); }, []);

    async function loadFeeds() {
        setLoading(true);
        try {
            const recent = await axios.get(`${API_BASE}/api/songs/recent`, authHeaders);
            setHomeFeed(recent.data);
            const random = await axios.get(`${API_BASE}/api/songs/discover`, authHeaders);
            setDiscoveryFeed(random.data);
            fetchLibraryData(); fetchAllSongs(); 
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
        } catch (error) { console.error("YT Error:", error); return []; }
    };

    // QUOTA PROTECTED SEARCH
    useEffect(() => {
        if (searchMode === 'global') return; // Do nothing for global on type
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

    const triggerGlobalSearch = async () => {
        if (searchTerm.length > 1) {
            setLoading(true);
            const results = await searchYouTube(searchTerm);
            setSearchResults(results);
            setLoading(false);
        }
    };

    function getSongById(id) {
        if (songCache[id]) return songCache[id];
        const all = [...homeFeed, ...discoveryFeed, ...searchResults, ...likedSongs, ...allSongs, ...artistSongsFromDb];
        return all.find(s => s.id === id) || { id, title: 'Unknown', artistName: 'Unknown', coverUrl: null };
    }
    const currentSong = queue[currentIndex] ? getSongById(queue[currentIndex]) : null;

    const handleShare = (song) => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?songId=${song.id}`;
        if (navigator.share) {
            navigator.share({ title: song.title, text: `Listen to ${song.title} on Astronote`, url: shareUrl }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareUrl); alert("Link copied!");
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedId = params.get('songId');
        if (sharedId && allSongs.length > 0) {
            const song = allSongs.find(s => s.id === parseInt(sharedId));
            if (song) { playSong(song, [song]); window.history.replaceState({}, document.title, window.location.pathname); }
        }
    }, [allSongs]);

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

    const playNow = (song) => {
        setSongCache(prev => ({ ...prev, [song.id]: song }));
        if (song.isYouTube) { playSong(song); return; }
        if (queue.length === 0) { playSong(song); return; }
        const newQueue = [...queue];
        const insertIndex = currentIndex + 1;
        newQueue.splice(insertIndex, 0, song.id);
        setQueue(newQueue); setCurrentIndex(insertIndex); setPlaying(true);
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
        if (currentSong?.isYouTube) return;
        const update = (list) => list.map(s => s.id === songId ? { ...s, liked: !s.liked } : s);
        setHomeFeed(update); setDiscoveryFeed(update); setSearchResults(update); setLikedSongs(update); setAllSongs(update);
        try { await axios.post(`${API_BASE}/api/likes/${songId}`, {}, authHeaders); fetchLibraryData(); } catch (e) { }
    };

    const addToPlaylist = async (playlistId, songId) => {
        try {
            await axios.post(`${API_BASE}/api/playlists/${playlistId}/songs`, { songId }, authHeaders);
            alert("Added!"); setShowPlaylistSelector(null);
        } catch (e) { alert("Failed."); }
    };

    const handleNextSong = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < queue.length) { setCurrentIndex(nextIdx); setPlaying(true); }
        else if (repeatMode === 'all') { setCurrentIndex(0); setPlaying(true); }
        else { setPlaying(false); }
    };

    const handlePrevSong = () => {
        if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setPlaying(true); }
        else if (repeatMode === 'all') { setCurrentIndex(queue.length - 1); setPlaying(true); }
    };

    const recordListen = async (duration, genre) => {
        if (currentSong?.isYouTube) return;
        try {
            const mins = Math.ceil((duration || 180) / 60);
            await axios.post(`${API_BASE}/api/users/${user.id}/add-minutes`, { minutes: mins, genre: genre || "Unknown" });
            user.totalMinutesListened += mins;
        } catch (e) { }
    };

    useEffect(() => {
        if (!currentSong || !('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title, artist: currentSong.artistName, album: "Astronote Music",
            artwork: [{ src: currentSong.coverUrl || PERSON_PLACEHOLDER, sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevSong);
        navigator.mediaSession.setActionHandler('nexttrack', handleNextSong);
    }, [currentSong, currentIndex, queue]);

    const SongRow = ({ s, list, onClick }) => (
        <div className="glass-row" onClick={onClick ? onClick : () => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} className="row-thumb" onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="row-info"><div className="row-title">{s.title}</div><div className="row-artist">{s.artistName}</div></div>
            <div className="row-actions">
                {!s.isYouTube && (
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(s.id) }}>
                        <Heart size={20} fill={s.liked ? "#ff00cc" : "none"} color={s.liked ? "#ff00cc" : "rgba(255,255,255,0.5)"} />
                    </button>
                )}
                <div className="context-menu-container">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }}>
                        <MoreHorizontal size={20} color="rgba(255,255,255,0.7)" />
                    </button>
                    {openMenuId === s.id && (
                        <div className="context-menu" onClick={e => e.stopPropagation()}>
                            <button className="menu-item" onClick={() => { playNow(s); setOpenMenuId(null); }}><PlayCircle /> Play Now</button>
                            {!s.isYouTube && (
                                <>
                                    <button className="menu-item" onClick={() => { setShowPlaylistSelector(s.id); setOpenMenuId(null); }}><ListMusic /> Add to Playlist</button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const HomeSongCard = ({ s, list }) => (
        <div className="glass-card song-card" onClick={() => playSong(s, list)}>
            <img src={s.coverUrl || PERSON_PLACEHOLDER} onError={e => e.target.src = PERSON_PLACEHOLDER} alt={s.title} />
            <div className="marquee-container"><p className={`song-title ${s.title.length > 15 ? 'marquee-text' : ''}`}>{s.title}</p></div>
            <div className="marquee-container"><p className={`song-artist ${s.artistName.length > 15 ? 'marquee-text' : ''}`}>{s.artistName}</p></div>
        </div>
    );

    const MainViewContent = useMemo(() => {
        return (
            <>
                {activeTab === 'home' && (
                    <div className="tab-pane home-animate">
                        <header className="glass-header">
                            <img src="/my-brand.png" alt="Logo" height="32" />
                            <div className="header-text"><h1>Hi, {user.username}</h1><p>Welcome to your galaxy.</p></div>
                        </header>
                        <div className="usp-slider">
                            {USP_FEATURES.map((feat, i) => (
                                <div key={i} className="glass-card usp-card" style={{ background: feat.accent }}>
                                    <div className="usp-icon">{feat.icon}</div>
                                    <h3>{feat.title}</h3><p>{feat.subtitle}</p>
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
                        <h2 className="section-title">Top Artists</h2>
                        <div className="horizontal-scroll">
                            {FEATURED_ARTISTS.map((artist, i) => (
                                <div key={i} className="song-card" onClick={() => { setSelectedArtist(artist); setActiveTab('artist-view'); }} style={{ width: 120, marginRight: 16, cursor: 'pointer' }}>
                                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', marginBottom: 8 }}>
                                        <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }} />
                                    </div>
                                    <p className="song-title" style={{ textAlign: 'center', fontSize: 13 }}>{artist.name}</p>
                                </div>
                            ))}
                        </div>
                        <h2 className="section-title">Cosmic Arrivals</h2>
                        <div className="horizontal-scroll">{homeFeed.map(s => <HomeSongCard key={s.id} s={s} list={homeFeed} />)}</div>
                        <h2 className="section-title">Discovery</h2>
                        <div className="horizontal-scroll">{discoveryFeed.map(s => <HomeSongCard key={s.id} s={s} list={discoveryFeed} />)}</div>
                        <div className="spacer"></div>
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="tab-pane">
                        {/* MODERN SLIDING TOGGLE */}
                        <div className="search-toggle-container">
                            <div className={`search-toggle-track ${searchMode}`}>
                                <div className="toggle-thumb"></div>
                                <button className="toggle-btn" onClick={() => setSearchMode('local')}>Library</button>
                                <button className="toggle-btn" onClick={() => setSearchMode('global')}><Youtube size={14} color="#ff0000" /> Global</button>
                            </div>
                        </div>

                        <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Search size={20} className="search-icon" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                            <input 
                                className="glass-input" 
                                placeholder={searchMode === 'global' ? "Search YouTube & press Enter..." : "Search Library..."}
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && searchMode === 'global' && triggerGlobalSearch()}
                                autoFocus style={{ paddingLeft: 40 }} 
                            />
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="icon-btn" style={{ position: 'absolute', right: 8 }}><X size={18} color="#ccc" /></button>}
                        </div>
                        <div className="list-vertical">
                            {searchResults.map(s => <SongRow key={s.id} s={s} list={searchResults} onClick={() => playNow(s)} />)}
                        </div>
                        <div className="spacer"></div>
                    </div>
                )}
                {/* ... other tabs ... */}
            </>
        );
    }, [activeTab, searchMode, searchTerm, searchResults, homeFeed, discoveryFeed, user, loading]);

    return (
        <div className="glass-shell">
            <div className="glass-viewport" style={{ display: isLyricsExpanded ? 'none' : 'block' }}>
                {MainViewContent}
            </div>

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
                                <div className="art-glow-container">
                                    <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-glow-bg" alt="" />
                                    {currentSong.isYouTube && showVideo ? (
                                        <div className="youtube-overlay">
                                            <YouTube 
                                                videoId={currentSong.id} 
                                                opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, modestbranding: 1, controls: 1 } }} 
                                                onEnd={handleNextSong}
                                            />
                                        </div>
                                    ) : (
                                        <img src={currentSong.coverUrl || PERSON_PLACEHOLDER} className="art-front" alt="" />
                                    )}
                                </div>
                                <div className="modal-meta"><h1>{currentSong.title}</h1><p>{currentSong.artistName}</p></div>
                            </div>
                            
                            <div className="modal-controls-wrapper" style={{ opacity: isLyricsExpanded ? 0 : 1, pointerEvents: isLyricsExpanded ? 'none' : 'auto', height: isLyricsExpanded ? 0 : 'auto', overflow: 'hidden' }}>
                                <Player 
                                    song={currentSong} playing={playing} onToggle={() => setPlaying(!playing)} 
                                    onNext={handleNextSong} onPrev={handlePrevSong} onToggleLike={() => toggleLike(currentSong.id)} 
                                    onEnded={() => { recordListen(currentSong.durationSeconds, currentSong.genre); handleNextSong(); }} 
                                    hideCover={true} hideMeta={true} repeatMode={repeatMode} onToggleRepeat={toggleRepeat} 
                                    shuffle={shuffle} onToggleShuffle={toggleShuffle} sleepTime={sleepTime} onSetSleepTimer={setSleepTime} 
                                    onProgress={(c, t) => { setSongProgress(t ? (c / t) * 100 : 0); setSongCurrentTime(c); }} 
                                />
                            </div>
                            {/* ... Lyrics and Up Next ... */}
                        </div>
                    </div>
                </>
            )}
            {/* ... Navigation ... */}
        </div>
    );
}
