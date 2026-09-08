import React, { useEffect } from "react";
import { X, Youtube } from "lucide-react";
import "../styles/inAppVideo.css";

export default function InAppYouTubePlayer({ open, onClose, title, videoId, playlistId, note }) {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const source = playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0`
    : `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

  return <div className="ne-video-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ne-video-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <span><Youtube size={22} /><small>Playing inside Nature&apos;s Elixirz</small><strong>{title}</strong></span>
        <button type="button" onClick={onClose} aria-label="Close video"><X size={22} /></button>
      </header>
      <div className="ne-video-frame">
        <iframe src={source} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </div>
      {note && <p>{note}</p>}
    </section>
  </div>;
}
