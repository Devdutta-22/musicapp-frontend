import React, { useState, useEffect } from "react";
import './index.css'; // Keep your global styles
import MusicApp from "./components/MusicApp";
import Login from "./components/Login"; // We will create this next

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Music app rendering failed.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'white', padding: 24, textAlign: 'center' }}>
          <div>
            <h2>Something went wrong while loading the player.</h2>
            <button type="button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getSavedUser() {
  try {
    const saved = localStorage.getItem('astronote_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    // Safari private browsing can deny storage access, and stale data can be invalid.
    return null;
  }
}

function App() {
  // 1. Check if user is already logged in (saved in browser memory)
  const [user, setUser] = useState(getSavedUser);

  // 2. Function to handle when a user logs in
  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('astronote_user', JSON.stringify(userData));
    } catch {
      // Keep the in-memory login working when browser storage is unavailable.
    }
  };

  // 3. Function to handle logout
  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('astronote_user');
    } catch {
      // There is nothing else to clean up when browser storage is unavailable.
    }
  };

  // 4. The Gatekeeper Logic
  return (
    <div className="App">
      <AppErrorBoundary>
        {!user ? (
          // If NO user, show Login Screen
          <Login onLogin={handleLogin} />
        ) : (
          // If user EXISTS, show Music App (and pass user info)
          <MusicApp user={user} onLogout={handleLogout} />
        )}
      </AppErrorBoundary>
    </div>
  );
}

export default App;
