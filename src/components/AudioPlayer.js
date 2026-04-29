// src/components/AudioPlayer.js
import React, { useState, useRef, useEffect } from 'react';

export default function AudioPlayer({ label, book, audioJson, startChap = 1, lang = 'en', chapterLabels = null }) {
  const urls = React.useMemo(() => {
    if (!audioJson) return [];
    try {
      const parsed = JSON.parse(audioJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [audioJson];
    }
  }, [audioJson]);

  const [activeIdx, setActiveIdx] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.load();
  }, [activeIdx]);

  // Reset to first chapter when audio source changes (language switch)
  useEffect(() => {
    setActiveIdx(0);
  }, [audioJson]);

  if (urls.length === 0) return null;

  // Chapter button label based on language
  function chapterLabel(idx) {
    if (chapterLabels && chapterLabels[idx]) return chapterLabels[idx];
    const chapNum = startChap + idx;
    if (lang === 'zh' || lang === 'sc') return `${book} 第${chapNum}章`;
    if (lang === 'es') return `${book} Cap. ${chapNum}`;
    return `${book} Ch. ${chapNum}`;
  }

  // Single chapter label shown in header
  function singleLabel() {
    if (chapterLabels && chapterLabels[0]) return chapterLabels[0];
    const chapNum = startChap;
    if (lang === 'zh' || lang === 'sc') return `${book} 第${chapNum}章`;
    if (lang === 'es') return `${book} Cap. ${chapNum}`;
    return `${book.toUpperCase()} CH. ${chapNum}`;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.icon}>🎵</span>
        <span style={styles.labelText}>{label.toUpperCase()}</span>
        {urls.length === 1 && (
          <span style={styles.chapRight}>{singleLabel()}</span>
        )}
      </div>

      <audio ref={audioRef} controls style={styles.audio} src={urls[activeIdx]} />

      {urls.length > 1 && (
        <div style={styles.chapRow}>
          {urls.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{ ...styles.chapBtn, ...(idx === activeIdx ? styles.chapBtnActive : {}) }}
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
  wrapper: { background: '#1a1a2e', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', border: '1px solid #2a2a4a' },
  header: { display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px' },
  icon: { fontSize: '14px' },
  labelText: { color: '#a0a0c0', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', flex: 1 },
  chapRight: { color: '#00d4aa', fontSize: '12px', fontWeight: '600' },
  audio: { width: '100%', height: '36px', borderRadius: '20px', outline: 'none' },
  chapRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' },
  chapBtn: { padding: '4px 14px', borderRadius: '20px', border: 'none', background: '#2a2a4a', color: '#c0c0e0', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' },
  chapBtnActive: { background: '#00d4aa', color: '#0a0a1a', fontWeight: '700' },
};