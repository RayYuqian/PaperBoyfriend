import { create } from 'zustand';
import { characters, Character } from './characters';

export type MessageType = 'text' | 'voice' | 'image';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  type: MessageType;
  content: string; // text content, or base64 audio, or image url
  textualContent?: string; // preserve original text content for LLM context
}

interface ChatStore {
  character: Character | null;
  messages: ChatMessage[];
  isLoading: boolean;
  botState: 'idle' | 'typing' | 'speaking';
  setCharacter: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  character: null,
  messages: [],
  isLoading: false,
  botState: 'idle',

  setCharacter: (id: string) => {
    const char = characters.find(c => c.id === id) || null;
    set({ character: char, messages: [], botState: 'idle' });
  },

  addMessage: (msg: ChatMessage) => {
    set(state => ({ messages: [...state.messages, msg] }));
  },

  updateMessage: (id: string, updates: Partial<ChatMessage>) => {
    set(state => ({
      messages: state.messages.map(m => (m.id === id ? { ...m, ...updates } : m))
    }));
  },

  clearChat: () => {
    set({ messages: [], botState: 'idle' });
  },

  sendMessage: async (text: string) => {
    const { character, messages, addMessage } = get();
    if (!character || !text.trim()) return;

    // 1. Add user message
    addMessage({
      id: Date.now().toString(),
      sender: 'user',
      type: 'text',
      content: text
    });

    set({ isLoading: true, botState: 'typing' });

    try {
      // 2. Call Chat API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          messages: messages.concat([{ id: 'temp', sender: 'user', type: 'text', content: text }]).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.textualContent || (m.type === 'text' ? m.content : (m.type === 'image' ? '[发送了一张照片]' : '[语音消息]'))
          }))
        })
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let botContent = '';
      let isVoice = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botContent += decoder.decode(value, { stream: true });

        if (botContent.startsWith('[V]')) {
          isVoice = true;
          set({ botState: 'speaking' });
        } else if (botContent.startsWith('[T]')) {
          set({ botState: 'typing' });
        }
      }

      // 3. Process completed text
      const selfieMatch = botContent.match(/\[SELFIE:(.*?)\]/);
      let cleanContent = botContent;
      
      if (selfieMatch) {
         cleanContent = botContent.replace(selfieMatch[0], '').trim();
         
         const prompt = selfieMatch[1];
         // trigger async image fetch without blocking or using loading bubble
         fetch('/api/image', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ characterId: character.id, prompt })
         }).then(res => res.json()).then(data => {
           if (data.urls && data.urls.length > 0) {
             data.urls.forEach((u: string, idx: number) => {
               get().addMessage({ id: (Date.now() + 3 + idx).toString(), sender: 'bot', type: 'image', content: u });
             });
           } else if (data.url) {
             get().addMessage({ id: (Date.now() + 3).toString(), sender: 'bot', type: 'image', content: data.url });
           } else if (data.error) {
             get().addMessage({ id: (Date.now() + 3).toString(), sender: 'bot', type: 'text', content: `[图片生成失败] ${data.error}` });
           }
         }).catch(err => console.error("Image gen error:", err));
      }

      cleanContent = cleanContent.replace(/^\[[VT]\]\s*/, '').trim();

      const botMsgId = (Date.now() + 2).toString();

      // 4. Handle Voice or Text
      if (isVoice && cleanContent) {
        set({ botState: 'speaking' });

        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanContent,
            voiceType: character.voiceType
          })
        });

        let ttsData: { audio?: string; error?: string } = {};
        try {
          ttsData = await ttsRes.json();
        } catch {
          addMessage({ id: botMsgId, sender: 'bot', type: 'text', content: `[语音生成失败：服务返回异常] ${cleanContent}`, textualContent: cleanContent });
          set({ isLoading: false, botState: 'idle' });
          return;
        }

        if (ttsData.audio) {
          addMessage({ id: botMsgId, sender: 'bot', type: 'voice', content: ttsData.audio, textualContent: cleanContent });
        } else {
          const reason = typeof ttsData.error === 'string' && ttsData.error.trim() ? ttsData.error.trim() : `HTTP ${ttsRes.status}`;
          addMessage({ id: botMsgId, sender: 'bot', type: 'text', content: `[语音生成失败] ${reason} - ${cleanContent}`, textualContent: cleanContent });
        }
      } else {
        addMessage({ id: botMsgId, sender: 'bot', type: 'text', content: cleanContent, textualContent: cleanContent });
      }

    } catch (error) {
      console.error('Chat error:', error);
      addMessage({ id: (Date.now() + 1).toString(), sender: 'bot', type: 'text', content: '连接失败，请检查网络或API配置。' });
    } finally {
      set({ isLoading: false, botState: 'idle' });
    }
  }
}));
