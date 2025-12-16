import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Crown } from "lucide-react";

export default function Leaderboard({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data generator (Replace with real API later)
  useEffect(() => {
    setTimeout(() => {
      const mockUsers = [
        { id: 99, username: "StarLord", minutes: 4500 },
        { id: 98, username: "Nebula", minutes: 3200 },
        { id: 97, username: "Rocket", minutes: 2800 },
        { id: user.id, username: user.username, minutes: user.totalMinutesListened || 120 }, // You
        { id: 96, username: "Groot", minutes: 50 },
      ].sort((a, b) => b.minutes - a.minutes);
      setUsers(mockUsers);
      setLoading(false);
    }, 800);
  }, [user]);

  const getRankLevel = (mins) => {
    if (mins > 4000) return { title: "Galactic Emperor", color: "#ffd700" }; // Gold
    if (mins > 2500) return { title: "Space Commander", color: "#c0c0c0" }; // Silver
    if (mins > 1000) return { title: "Star Pilot", color: "#cd7f32" }; // Bronze
    return { title: "Space Cadet", color: "#a0a0ff" };
  };

  return (
    <div className="tab-pane">
      <h2 className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Trophy size={28} color="#ffd700"/> Galaxy Leaderboard
      </h2>
      
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#888' }}>Scanning Galaxy...</div>
      ) : (
        <div className="list-vertical">
          {users.map((u, index) => {
            const level = getRankLevel(u.minutes);
            const isMe = u.id === user.id;
            
            return (
              <div key={u.id} className={`glass-row ${isMe ? 'active-row' : ''}`} style={{ cursor:'default' }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: '50%', 
                  background: index === 0 ? '#ffd700' : 'rgba(255,255,255,0.1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:'bold', color: index === 0 ? 'black' : 'white',
                  marginRight: 15
                }}>
                  {index === 0 ? <Crown size={20}/> : `#${index + 1}`}
                </div>
                
                <div className="row-info">
                  <div className="row-title" style={{ color: isMe ? 'var(--neon)' : 'white' }}>
                    {u.username} {isMe && "(You)"}
                  </div>
                  <div className="row-artist" style={{ color: level.color }}>
                    {level.title} • {Math.floor(u.minutes / 60)}h {u.minutes % 60}m
                  </div>
                </div>
                
                {index < 3 && <Medal size={24} color={level.color} />}
              </div>
            );
          })}
        </div>
      )}
      <div className="spacer"></div>
    </div>
  );
}
