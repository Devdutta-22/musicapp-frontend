import React, { useState, useEffect } from "react";
import axios from "axios";
import '../App.css'; 

export default function UploadCard({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // Added for preview
  const [coverImage, setCoverImage] = useState(null);
  const [artistImage, setArtistImage] = useState(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [album, setAlbum] = useState("");
  
  const [genre, setGenre] = useState("Pop");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://musicapp-o3ow.onrender.com"; 

  // Clean up memory when component closes or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle file selection and preview generation
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please choose an audio file.");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    fd.append("genre", genre);

    if (artistName) fd.append("artistName", artistName);
    if (artistImage) fd.append("artistImage", artistImage);
    if (coverImage) fd.append("coverImage", coverImage);
    if (album) fd.append("album", album);

    setLoading(true);
    setProgress(0);

    try {
      const cleanBase = API_BASE.replace(/\/+$/, "");
      const url = `${cleanBase}/api/songs/upload`;
      console.log("Uploading to:", url);

      await axios.post(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      setFile(null);
      setPreviewUrl(null); // Reset preview
      setCoverImage(null);
      setArtistImage(null);
      setTitle("");
      setArtistName("");
      setAlbum("");
      setGenre("Pop");
      setProgress(0);
      setLoading(false);

      if (onUploaded) onUploaded();
      alert("Upload complete!");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Upload failed — check console for details.");
    }
  };

  return (
    <div className="upload-card">
      <strong className="upload-title">Upload a Song</strong>

      <form onSubmit={submit}>
        <div className="form-group">
          <label className="file-label-text">Audio File *</label>
          <input 
            className="file-input" 
            type="file" 
            accept="audio/*" 
            onChange={handleFileChange} // Updated handler
          />
        </div>

        {/* --- AUDIO PREVIEW --- */}
        {previewUrl && (
          <div className="preview-player" style={{ marginBottom: '15px' }}>
             <p className="file-label-text" style={{fontSize: '11px', color: '#ffa500'}}>Previewing: {file.name}</p>
             <audio src={previewUrl} controls style={{ width: '100%', height: '35px' }} />
          </div>
        )}

        <div className="form-group">
          <input
            className="upload-input"
            placeholder="Song Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <input
            className="upload-input"
            placeholder="Artist Name (optional)"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="file-label-text" style={{marginBottom: '5px', display:'block'}}>Genre</label>
          <select
            className="upload-input"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            style={{ cursor: 'pointer', appearance: 'auto' }} 
          >
            <option value="Pop">Pop / Dance</option>
            <option value="Rock">Rock / Metal</option>
            <option value="Hip-Hop">Hip-Hop / Rap</option>
            <option value="Lo-Fi">Lo-Fi / Chill</option>
            <option value="Electronic">Electronic</option>
            <option value="Classical">Classical</option>
          </select>
        </div>

        <div className="form-group">
          <input
            className="upload-input"
            placeholder="Album Name (optional)"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="file-label-text">Artist Image (optional)</label>
          <input 
            className="file-input" 
            type="file" 
            accept="image/*" 
            onChange={(e) => setArtistImage(e.target.files[0])} 
          />
        </div>

        <div className="form-group">
          <label className="file-label-text">Cover Image (optional)</label>
          <input 
            className="file-input" 
            type="file" 
            accept="image/*" 
            onChange={(e) => setCoverImage(e.target.files[0])} 
          />
        </div>

        <button className="upload-btn" type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload Song"}
        </button>

        {loading && (
          <div className="upload-progress-container">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">{progress}%</div>
          </div>
        )}
      </form>
    </div>
  );
}
