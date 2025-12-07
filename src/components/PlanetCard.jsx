import React from 'react';
import { X, Sparkles, Clock, Music2, Quote } from 'lucide-react';

export default function PlanetCard({ user, onClose }) {
  
  // FIX: ALL HOOKS MUST BE DEFINED FIRST
  const [isFlipped, setIsFlipped] = React.useState(false); 

  // Handle flip on click
  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  // CONDITIONAL RETURN GOES AFTER HOOKS
  if (!user) return null;

  // --- 1. THE TAROT LORE SYSTEM (NOW WITH HYBRIDS) ---
  const getPlanetDetails = (type) => {
    switch (type) {
      // === ORIGINAL PLANETS ===
      case 'Volcanic': return {
        image: '/planets/volcanic.png',
        tarotName: 'IV. THE FORGE',
        title: 'Volcanic Core',
        desc: "Forged in the intense heat of Rock & Metal. Your soul thrives on energy, power, and raw emotion.",
        color: '#ff4d4d',
        accent: 'linear-gradient(45deg, #ff4d4d, #ffae00)'
      };
      case 'Gas Giant': return {
        image: '/planets/gas-giant.png',
        tarotName: 'X. THE NEON MIST',
        title: 'Gas Giant',
        desc: "Formed by the rhythm of Pop & Dance. Your world is vibrant, energetic, and constantly in motion.",
        color: '#ff00cc',
        accent: 'linear-gradient(45deg, #ff00cc, #3333ff)'
      };
      case 'Ice World': return {
        image: '/planets/ice-world.png',
        tarotName: 'II. THE GLACIER',
        title: 'Ice Tundra',
        desc: "Frozen in the calm of Lo-Fi & Classical. A sanctuary of focus, clarity, and deep thought.",
        color: '#00e5ff',
        accent: 'linear-gradient(45deg, #00e5ff, #2979ff)'
      };
      case 'Metallic': return {
        image: '/planets/metallic.png',
        tarotName: 'VIII. THE MACHINE',
        title: 'Chrome City',
        desc: "Constructed by the flow of Hip-Hop & Electronic. A world of structure, rhythm, and heavy bass.",
        color: '#c0c0c0',
        accent: 'linear-gradient(45deg, #e0e0e0, #757575)'
      };

      // === NEW HYBRID PLANETS ===
      case 'Plasma World': return { // Rock + Pop
        image: '/planets/plasma.png',
        tarotName: 'XI. THE FUSION',
        title: 'Plasma Reactor',
        desc: "A volatile mix of Rock heat and Pop energy. Your taste is intense, bright, and explosive.",
        color: '#FF5F1F', // Neon Orange
        accent: 'linear-gradient(45deg, #FF0000, #FF00CC)'
      };
      case 'Steam World': return { // Rock + Chill
        image: '/planets/steam.png',
        tarotName: 'XIV. THE ALCHEMY',
        title: 'Geothermal World',
        desc: "Where Fire meets Ice. A complex balance of intense energy and deep calm.",
        color: '#00ffa2', // Teal/Seafoam
        accent: 'linear-gradient(45deg, #ff4d4d, #00e5ff)'
      };
      case 'Cyberpunk': return { // Pop + Rap
        image: '/planets/cyberpunk.png',
        tarotName: 'XXI. THE NEOPOLIS',
        title: 'Neon Chrome',
        desc: "The intersection of Pop vibrance and Hip-Hop structure. A futuristic, glowing cityscape.",
        color: '#9d00ff', // Purple
        accent: 'linear-gradient(45deg, #ff00cc, #00ffff)'
      };
      case 'Forest World': return { // Pop + Chill
        image: '/planets/forest.png',
        tarotName: 'III. THE EMPRESS',
        title: 'Verdant Garden',
        desc: "A blooming sanctuary created by the mix of Pop energy and Lo-Fi calm. Life thrives here.",
        color: '#2ecc71', // Emerald Green
        accent: 'linear-gradient(45deg, #2ecc71, #a8e063)' // Green to Lime
      };

      // === DEFAULT ===
      default: return { // Nebula
        image: '/planets/nebula.png',
        tarotName: '0. THE BEGINNING',
        title: 'Stardust Nebula',
        desc: "A swirling cloud of infinite potential. Your musical identity is still forming. Keep listening to evolve.",
        color: '#a855f7',
        accent: 'linear-gradient(45deg, #a855f7, #6366f1)'
      };
    }
  };

  const details = getPlanetDetails(user.planetType);

  return (
    <div style={overlayStyle}>
      
      {/* --- NEW: FLIP CONTAINER --- */}
      <div className={`flip-container ${isFlipped ? 'flipped' : ''}`} onClick={isFlipped ? null : handleFlip}>
        <div className="flipper">

          {/* --- CARD BACK (The Initial View) --- */}
          <div className="card-face back">
            <div className="back-content">
              {/* Close button for the back face */}
              <button onClick={onClose} className="close-btn back-btn">
                <X size={24} color="#888" />
              </button>
              <Sparkles size={48} color="#a855f7" className="tarot-sparkle" />
              <h1>Tap to Reveal Your Cosmic Destiny</h1>
              <p>Processing {user.username}'s music energy...</p>
            </div>
          </div>

          {/* --- CARD FRONT (The Tarot Card Content) --- */}
          <div className="card-face front">
            
            <button onClick={onClose} className="close-btn front-btn">
              <X size={24} color="white" />
            </button>
            
            {/* --- CARD HEADER (The "Tarot" Name) --- */}
            <div className="card-header">
              <Sparkles size={16} color={details.color} />
              <span style={{ letterSpacing: '3px', fontWeight: 'bold', color: details.color }}>
                {details.tarotName}
              </span>
              <Sparkles size={16} color={details.color} />
            </div>

            {/* --- THE ARTWORK FRAME --- */}
            <div className="art-frame" style={{ borderColor: details.color }}>
              <img 
                src={details.image} 
                alt={details.title} 
                className="planet-img"
                onError={(e) => e.target.src = '/planets/nebula.png'} 
              />
              <div className="glow-effect" style={{ background: details.accent }}></div>
            </div>

            {/* --- THE TITLE --- */}
            <div className="card-body">
              <h1 className="planet-title" style={{ background: details.accent, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {details.title}
              </h1>
              <div className="user-name">Explorer: {user.username}</div>
              
              <div className="divider" style={{ background: details.color }}></div>

              {/* --- THE LORE / DESCRIPTION --- */}
              <div className="lore-box">
                <Quote size={12} className="quote-icon" style={{ color: details.color }}/>
                <p>{details.desc}</p>
              </div>

              {/* --- STATS FOOTER --- */}
              <div className="stats-row">
                <div className="stat">
                  <Clock size={14} color="#888"/>
                  {/* NOTE: Time displays correctly now that AuthController is fixed */}
                  <span>{user.totalMinutesListened || 0} min</span>
                </div>
                <div className="stat">
                  <Music2 size={14} color="#888"/>
                  <span>Level {(user.totalMinutesListened / 60).toFixed(1)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- CSS STYLES --- */}
      <style>{`
        /* --- CARD BASE STYLES --- */
        
        /* NOTE: The original .tarot-card styles are now applied to the .card-face classes */

        /* --- NEW FLIP CSS RULES --- */
        .flip-container {
          /* Set the same size as the card */
          width: 320px;
          height: 540px; 
          position: relative;
          /* Allows the 3D effect */
          perspective: 1000px; 
          cursor: pointer;
          animation: floatIn 0.5s ease-out; /* Keeps the initial float animation */
        }

        .flipper {
          transition: 0.6s;
          transform-style: preserve-3d;
          position: relative;
          width: 100%;
          height: 100%;
        }

        /* The actual flip action */
        .flip-container.flipped .flipper {
          transform: rotateY(180deg);
        }

        .card-face {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden; 
          border-radius: 20px;
          overflow: hidden;
          
          /* Shared Card Styles */
          background: #0a0a0a;
          border: 1px solid #333;
          box-shadow: 0 0 40px rgba(0,0,0,0.8);
        }
        
        /* Gold/Colored Border Effect */
        .card-face::before {
          content: '';
          position: absolute;
          top: 6px; left: 6px; right: 6px; bottom: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          pointer-events: none;
        }


        /* Front face is the existing card */
        .card-face.front {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          transform: rotateY(180deg); /* Starts facing backwards */
        }

        /* Back face is the splash screen */
        .card-face.back {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #aaa;
        }

        .back-content {
          text-align: center;
          padding: 40px;
        }

        .back-content h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #d1d5db;
          margin-top: 15px;
        }

        .back-content p {
          font-size: 0.9rem;
          color: #666;
          margin-top: 5px;
        }

        .tarot-sparkle {
          animation: pulse 1.5s infinite;
          opacity: 0.8;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }


        /* --- PLANET IMAGE FIX (CIRCULAR) --- */
        .art-frame {
          width: 100%;
          padding-top: 100%; /* FIX 1: Make it a square box */
          height: 0;        /* FIX 1: Reset height */
          border: 1px solid #333;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          background: #000;
        }

        .planet-img {
          width: 100%;
          height: 100%;
          position: absolute; /* FIX 2: Needed for padding-top to work */
          top: 0;
          left: 0;
          object-fit: cover;
          border-radius: 50%; /* FIX 3: Mask to a circle */
          z-index: 2;
          transition: transform 10s ease-in-out;
        }

        /* --- STANDARD STYLES (Kept) --- */

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 0.8rem;
          margin-top: 10px;
        }
        
        .tarot-card:hover .planet-img {
          transform: scale(1.1);
        }

        .glow-effect {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 100px;
          opacity: 0.3;
          filter: blur(20px);
          z-index: 1;
        }

        .card-body {
          text-align: center;
          width: 100%;
        }

        .planet-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .user-name {
          color: #666;
          font-size: 0.9rem;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .divider {
          height: 1px;
          width: 40px;
          margin: 15px auto;
          opacity: 0.5;
        }

        .lore-box {
          font-style: italic;
          color: #ccc;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 25px;
          padding: 0 10px;
          position: relative;
        }
        
        .quote-icon {
          position: absolute;
          top: -8px;
          left: -5px;
          opacity: 0.6;
        }

        .stats-row {
          display: flex;
          justify-content: center;
          gap: 20px;
          font-size: 0.8rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.5;
          z-index: 10;
        }
        .close-btn:hover { opacity: 1; }

        @keyframes floatIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
  zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
};
