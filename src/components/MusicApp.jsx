.search-toggle-container {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.search-toggle-track {
    position: relative;
    display: flex;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50px;
    padding: 4px;
    width: 100%;
    max-width: 300px;
}

.toggle-btn {
    position: relative;
    flex: 1;
    z-index: 2;
    background: none;
    border: none;
    color: white;
    padding: 10px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: color 0.3s;
}

.toggle-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border-radius: 50px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
}

/* Sliding animation */
.search-toggle-track.global .toggle-thumb {
    transform: translateX(100%);
}

/* Video Overlay */
.youtube-overlay {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 10;
    border-radius: 20px;
    overflow: hidden;
}
