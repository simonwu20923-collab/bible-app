// src/components/AudioPlayer.js
// Drop this file into src/components/ and import it in Reading.js:
//   import AudioPlayer from '../components/AudioPlayer';
//
// Usage in Reading.js (replace existing audio elements):
//   <AudioPlayer label="NT Audio" book="Luke" audioJson={verseData.nt_audio} startChap={1} />
//   <AudioPlayer label="OT Audio" book="Deuteronomy" audioJson={verseData.ot_audio} startChap={7} />

import React, { useState, useRef, useEffect } from 'react';

export default function AudioPlayer({ label, book, audioJson, startChap = 1 }) {
  // audioJson is either a JSON array string ["url1","url2",...] or a plain URL string or null
  const urls = React.useMemo(() => {
    if (!audioJson) return [];
    try {
      const parsed = JSON.parse(audioJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [audioJson]; // plain URL fallback
    }
  }, [audioJson]);

  const [activeIdx, setActiveIdx] = useState(0);
  const audioRef = useRef(null);

  // When the active chapter changes, reload the audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [activeIdx]);

  if (urls.length === 0) return null;

  const currentUrl = urls[activeIdx];
  const chapterLabel = (idx) => `${book} Ch. ${startChap + idx}`;

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon}>🎵</span>
        <span style={styles.labelText}>{label.toUpperCase()}</span>
        {urls.length === 1 && (
          <span style={styles.chapRight}>{chapterLabel(0).toUpperCase()}</span>
        )}
      </div>

      {/* Native audio player */}
      <audio
        ref={audioRef}
        controls
        style={styles.audio}
        src={currentUrl}
      />

      {/* Chapter buttons — only show when there are multiple chapters */}
      {urls.length > 1 && (
        <div style={styles.chapRow}>
          {urls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{
                ...styles.chapBtn,
                ...(idx === activeIdx ? styles.chapBtnActive : {}),
              }}
            >
              {chapterLabel(idx)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#1a1a2e',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '10px',
    border: '1px solid #2a2a4a',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '8px',
  },
  icon: {
    fontSize: '14px',
  },
  labelText: {
    color: '#a0a0c0',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    flex: 1,
  },
  chapRight: {
    color: '#00d4aa',
    fontSize: '12px',
    fontWeight: '600',
  },
  audio: {
    width: '100%',
    height: '36px',
    borderRadius: '20px',
    outline: 'none',
  },
  chapRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px',
  },
  chapBtn: {
    padding: '4px 14px',
    borderRadius: '20px',
    border: 'none',
    background: '#2a2a4a',
    color: '#c0c0e0',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  chapBtnActive: {
    background: '#00d4aa',
    color: '#0a0a1a',
    fontWeight: '700',
  },
};