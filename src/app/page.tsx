"use client";

import { characters } from '@/lib/characters';
import { useChatStore } from '@/lib/useChatStore';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const setCharacter = useChatStore(state => state.setCharacter);

  const handleSelect = (id: string) => {
    setCharacter(id);
    router.push('/chat');
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: '#fff',
      alignItems: 'center',
      padding: '20px',
      overflowY: 'auto' as const,
    }}>
      <h1 style={{ marginTop: '40px', marginBottom: '10px', fontSize: '24px' }}>纸片人男友</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>选择你的专属陪伴</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        width: '100%',
        padding: '0 10px'
      }}>
        {characters.map(char => (
          <div
            key={char.id}
            onClick={() => handleSelect(char.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={char.avatar}
              alt={char.name}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: '12px'
              }}
            />
            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{char.name}</h3>
            <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>{char.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
