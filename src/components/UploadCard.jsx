// src/components/UploadCard.jsx
import React, { useState } from "react";
import axios from "axios";

export default function UploadCard({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [artistImage, setArtistImage] = useState(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [album, setAlbum] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------------------------
  // 🛑 TODO: PASTE YOUR RENDER BACKEND URL HERE
  // Go to your Render Dashboard -> Copy the URL (e.g. https://music-app.onrender.com)
  // Do NOT add a slash "/" at the end.
  // -------------------------------------------------------------------------
  const API_BASE = "https://groove-j0kw.onrender.com"; 
  // -------------------------------------------------------------------------

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please choose an audio file.");

    // Check if user forgot to replace the URL
    if (API_BASE.includes("REPLACE_THIS")) {
      return alert("Setup Error: You forgot to paste your Render Backend URL inside UploadCard.jsx!");
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name.replace(/\.[^.]+$/, ""));
    if (artistName) fd.append("artistName", artistName);
    if (artistImage) fd.append("artistImage", artistImage);
    if (coverImage) fd.append("coverImage", coverImage);
    if (album) fd.append("album", album);

    setLoading(true);
    setProgress(0);

    try {
      // FIXED: Now uses the absolute URL to your backend
      const url = `${API_BASE}/api/songs/upload`;
      console.log("Uploading to:", url);

      await axios.post(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      // reset
      setFile(null);
      setCoverImage(null);
      setArtistImage(null);
      setTitle("");
      setArtistName("");
      setAlbum("");
      setProgress(0);
      setLoading(false);

      if (onUploaded) onUploaded();
      alert("Upload complete!");
    } catch (err) {
      console.error(err);
      setLoading(false);
      
      if (err.response && err.response.status === 405) {
         alert("Error 405: Still hitting Vercel. Check the API_BASE URL in code.");
      } else {
         alert("Upload failed — check backend console.");
      }
    }
  };

  return (
    <div style={{ background: "#111", padding: 12, borderRadius: 8 }}>
      <strong style={{ display: "block", marginBottom: 8 }}>
        Upload a song
      </strong>

      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Artist name (optional)"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Album (optional)"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#ccc", display: "block", marginBottom: 4 }}>
            Artist Image (optional)
          </label>
          <input type="file" accept="image/*" onChange={(e) => setArtistImage(e.target.files[0])} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#ccc", display: "block", marginBottom: 4 }}>
            Cover Image (optional)
          </label>
          <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files[0])} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Uploading..." : "Upload"}
        </button>

        {loading && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 6, background: "#222", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#11b84a" }} />
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{progress}%</div>
          </div>
        )}
      </form>
    </div>
  );
}
