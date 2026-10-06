import React, { useState } from 'react';
import axios from 'axios';
import { Rocket, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Toggle endpoint based on user choice
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    
    // Get the base URL from environment or default to local
    const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

    try {
      const res = await axios.post(`${API_BASE}${endpoint}`, { username, password });
      
      // If login/register works, tell App.js!
      if (res.data) {
          onLogin(res.data);
      }
    } catch (err) {
      console.error(err);
      const msg = typeof err.response?.data === 'string' 
        ? err.response.data 
        : (err.response?.data?.message || err.message || 'Connection failed. Is backend running?');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1a1a2e 0%, #000 100%)', color: 'white'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        padding: '40px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)',
        width: '100%', maxWidth: '400px', textAlign: 'center'
      }}>
        <div style={{ marginBottom: 20 }}>
          <Rocket size={40} color="#ff00cc" style={{ marginBottom: 10 }} />
          <h1 style={{ margin: 0 }}>Astronote</h1>
          <p style={{ color: '#888' }}>{isRegistering ? 'Join the Galaxy' : 'Welcome back, Traveler'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required 
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #333', padding: '12px', color: 'white', borderRadius: '8px' }} />
          
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required 
             style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #333', padding: '12px', color: 'white', borderRadius: '8px' }} />

          {error && <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(90deg, #ff00cc, #3333ff)', border: 'none', padding: '12px',
            borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
          }}>
            {loading ? 'Processing...' : (isRegistering ? 'Launch Rocket' : 'Enter Orbit')} <ArrowRight size={16}/>
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: '0.9rem', color: '#aaa' }}>
          {isRegistering ? 'Already have a planet?' : 'New to the galaxy?'}
          <span onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            style={{ color: '#3333ff', cursor: 'pointer', marginLeft: 6, fontWeight: 'bold' }}>
            {isRegistering ? 'Login' : 'Create Account'}
          </span>
        </div>
      </div>
    </div>
  );
}
