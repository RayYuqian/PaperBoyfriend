"use client";

import React, { useState, useEffect, useRef } from 'react';

interface VoiceMessageProps {
  base64Audio: string;
}

export default function VoiceMessage({ base64Audio }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // We add the prefix for data URI since the API just returns base64
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(Math.round(audio.duration));
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [base64Audio]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="audio-bar" onClick={togglePlay}>
      <svg className="audio-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
      {/* Visual bars if playing */}
      {isPlaying && (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '16px' }} className="playing">
          <div className="bar" style={{ width: '3px', height: '80%', background: 'currentColor', borderRadius: '2px', animationDelay: '0s' }}></div>
          <div className="bar" style={{ width: '3px', height: '100%', background: 'currentColor', borderRadius: '2px', animationDelay: '0.2s' }}></div>
          <div className="bar" style={{ width: '3px', height: '60%', background: 'currentColor', borderRadius: '2px', animationDelay: '0.4s' }}></div>
        </div>
      )}
      <span style={{ fontSize: '14px', marginLeft: isPlaying ? '4px' : '0' }}>{duration}''</span>
    </div>
  );
}
