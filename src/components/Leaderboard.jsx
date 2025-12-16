import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Medal, Crown, Flame, Zap, Sparkles } from "lucide-react";

export default function Leaderboard({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use the same API Base as the rest of your app
  const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com").replace(/\/$/, "");

  useEffect(() => {
    fetchLeaderboard();
  }, [user]); // Refresh if user changes

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // 1. GET REAL DATA FROM BACKEND
      const res = await axios.get(`${API_BASE}/api/leaderboard`);
      
      // 2. Ensure the current user is in the list or handle rank calculation
      // For now, we just show the top 50 returned by the API
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return { icon: <Crown size={20} fill="#ffd700" />, color: "#ffd700", label: "Galactic Emperor" };
    if (index === 1) return { icon: <Medal size={20} color="#c0c0c0" />, color: "#c0c0c0", label: "Space Commander" };
    if (index === 2) return { icon: <Medal size={20} color="#cd7f32" />, color: "#cd7f32", label: "Star Pilot" };
    return { icon: <Zap size={16} color="#a0a0ff" />, color: "#a0a0ff", label: "Cadet" };
  };

  return (
    <div className="tab-pane">
      <div style={{ 
          background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent)', 
          padding: '20px', borderRadius: '15px', marginBottom: '20px',
          border: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <h2 className="page-title" style={{ display:'flex', alignItems:'center', gap:12, margin:0, fontSize:'1.8rem' }}>
          <Trophy size={32} color="#ffd700" fill="rgba(255, 215, 0, 0.2)"/> 
          Galaxy Leaderboard
        </h2>
        <p style={{ color:'#aaa', margin:'5px 0 0 44px' }}>Top listeners in the universe</p>
      </div>
      
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#888' }}>
            <div className="spin-slow" style={{ display:'inline-block', marginBottom:10 }}><Sparkles size={30} color="#5eb3fd"/></div>
            <div>Scanning Galaxy...</div>
        </div>
      ) : (
        <div className="list-vertical">
          {users.map((u, index) => {
            const badge = getRankBadge(index);
            const isMe = u.id === user.id;
            
            return (
              <div key={u.id} className={`glass-row ${isMe ? 'active-row' : ''}`} style={{ cursor:'default', padding:'15px' }}>
                {/* Rank Number/Icon */}
                <div style={{ 
                  width: 45, height: 45, borderRadius: '50%', 
                  background: isMe ? 'var(--cloud-blue)' : 'rgba(255,255,255,0.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:'bold', fontSize: 18, color: isMe ? 'white' : '#ccc',
                  marginRight: 15,
                  boxShadow: index === 0 ? '0 0 15px rgba(255, 215, 0, 0.3)' : 'none',
                  border: `1px solid ${badge.color}`
                }}>
                  {index < 3 ? badge.icon : `#${index + 1}`}
                </div>
                
                {/* User Info */}
                <div className="row-info">
                  <div className="row-title" style={{ color: isMe ? '#5eb3fd' : 'white', fontSize: '1.1rem' }}>
                    {u.username} {isMe && "(You)"}
                  </div>
                  <div className="row-artist" style={{ color: badge.color, display:'flex', alignItems:'center', gap: 6 }}>
                    {badge.label} 
                    <span style={{width:4, height:4, borderRadius:'50%', background:'#555'}}></span>
                    <span style={{ color: '#fff' }}>
                        {Math.floor(u.minutes / 60)}h {u.minutes % 60}m
                    </span>
                  </div>
                </div>
                
                {/* Status Icon (Optional: Shows flame for top 3) */}
                {index < 3 && <Flame size={20} color={badge.color} fill={badge.color} style={{ opacity: 0.2 + (0.3 * (3-index)) }} />}
              </div>
            );
          })}
          
          {users.length === 0 && (
             <div style={{textAlign:'center', padding:40, color:'#666'}}>
                No explorers found yet. Start listening!
             </div>
          )}
        </div>
      )}
      <div className="spacer"></div>
    </div>
  );
}
