"use client";

import React, { useState } from 'react';

interface ImageMessageProps {
  url: string;
}

export default function ImageMessage({ url }: ImageMessageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          width: '150px',
          height: '200px',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          backgroundColor: '#ddd'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={url} 
          alt="自拍" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>

      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={url} 
            alt="自拍大图" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} 
          />
        </div>
      )}
    </>
  );
}
