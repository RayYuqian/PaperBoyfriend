"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/useChatStore';
import VoiceMessage from '@/components/VoiceMessage';
import ImageMessage from '@/components/ImageMessage';

export default function ChatPage() {
  const router = useRouter();
  const { character, messages, isLoading, botState, sendMessage, clearChat } = useChatStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!character) {
      router.push('/');
    }
  }, [character, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!character) return null;

  return (
    <div className="app-container" style={{ backgroundImage: 'url(/chat_bg.png)', backgroundSize: 'cover' }}>
      {/* Header */}
      <div style={{
        height: '60px',
        backgroundColor: '#EDEDED',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--wechat-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button 
          onClick={() => { clearChat(); router.back(); }}
          style={{ marginRight: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/return-back-button-svgrepo-com.svg" alt="Back" style={{ width: '24px', height: '24px' }} />
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: '500' }}>
          {botState === 'typing' ? '对方正在输入...' : botState === 'speaking' ? '对方正在说话...' : character.name}
        </h2>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: isUser ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={isUser ? '/avatars/user.png' : character.avatar} 
                className="avatar" 
                alt="avatar" 
              />
              
              {msg.type === 'image' ? (
                <div style={{ marginTop: '4px' }}>
                  <ImageMessage url={msg.content} />
                </div>
              ) : (
                <div className={`bubble ${isUser ? 'send' : 'recv'}`}>
                  {msg.type === 'voice' ? (
                    <VoiceMessage base64Audio={msg.content} />
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F7F7F7',
        borderTop: '1px solid var(--wechat-border-light)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="发消息..."
          style={{
            flex: 1,
            border: 'none',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '16px',
            outline: 'none',
            resize: 'none',
            maxHeight: '100px',
            lineHeight: '1.4'
          }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          style={{
            backgroundColor: (inputText.trim() && !isLoading) ? '#07C160' : '#E0E0E0',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            height: '42px'
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
