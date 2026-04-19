import { NextRequest, NextResponse } from 'next/server';

/** 豆包语音 HTTP 非流式合成常见文本上限（含标点），超出易失败 */
const MAX_TTS_UTF8_CHARS = 2000;

export async function POST(req: NextRequest) {
  try {
    const { text, voiceType } = await req.json();

    const apiKey = process.env.VOLC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            '未配置语音鉴权：请在 .env.local 中设置 VOLC_API_KEY（新版控制台「豆包语音」- 语音合成大模型）。'
        },
        { status: 500 }
      );
    }

    const rawText = typeof text === 'string' ? text.trim() : '';
    if (!rawText) {
      return NextResponse.json({ error: 'text 不能为空' }, { status: 400 });
    }

    const safeText =
      rawText.length > MAX_TTS_UTF8_CHARS ? rawText.slice(0, MAX_TTS_UTF8_CHARS) : rawText;

    const resourceId = process.env.VOLC_TTS_RESOURCE_ID?.trim() || 'seed-tts-2.0';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'X-Api-Resource-Id': resourceId
    };

    // 使用新版HTTP Chunked单向流式接口
    const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        req_params: {
          text: safeText,
          speaker: voiceType,
          "audio_params": {
            "format": "mp3",
            "sample_rate": 24000
          }
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("TTS API Error:", err);
      return NextResponse.json({ error: "TTS generation failed" }, { status: response.status });
    }

    // 新版HTTP Chunked单向流式接口返回的是 NDJSON 格式（多行JSON）
    // 每行JSON中的 data 字段可能包含 base64 编码的 mp3 音频片段
    const textResp = await response.text();
    const lines = textResp.split('\n');
    let audioChunks: Buffer[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.data) {
          audioChunks.push(Buffer.from(parsed.data, 'base64'));
        } else if (parsed.code !== 0 && parsed.code !== 20000000) {
          console.error("TTS API returned error line:", line);
        }
      } catch (e) {
        console.error("Failed to parse TTS response line:", line);
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('TTS API did not return any audio data');
    }

    const fullAudioBuffer = Buffer.concat(audioChunks);
    const audioBase64 = fullAudioBuffer.toString('base64');

    return NextResponse.json({ audio: audioBase64 });

  } catch (error: any) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
