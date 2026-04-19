import { NextRequest } from 'next/server';
import { characters } from '@/lib/characters';

export async function POST(req: NextRequest) {
  try {
    const { characterId, messages } = await req.json();
    const character = characters.find(c => c.id === characterId);

    if (!character) {
      return new Response('Character not found', { status: 404 });
    }

    if (!process.env.ZHIPU_API_KEY) {
      return new Response('ZHIPU_API_KEY not set', { status: 500 });
    }

    const systemPromptModifier = `
【全局格式与规则要求】
1. 回复内容必须非常简短，模拟真实的年轻人微信聊天，单句最好不超过20个字。
2. 绝不使用任何标点符号（包括逗号、句号、感叹号等），如果有停顿或断句，请直接使用空格代替。
3. 请不要太有“AI客服”的感觉，拒绝生硬和太正经，语气要自然甚至带点网感或口语化词汇。
4. 根据当前语境和情感自主判断你是想发“语音”还是发“文字”。
   - 若发语音：请务必在回复的最开头写上 [V]
   - 若发文字：请务必在回复的最开头写上 [T]
   注意：每条回复开头必须有且仅有这两种标记之一（不要带反引号）。
5. 【重要】非必要且非用户主导要求的情况下，绝对不要发送自拍 \`[SELFIE:xxx]\`！生成照片非常昂贵，只有在以下两种明显意图下才允许发送：
   (a) 玩家非常明确地想看你现在的照片/长相。
   (b) 玩家询问你在干嘛，并且当前场景非常值得发照片分享。
   日常交流、嘘寒问暖一律不带 [SELFIE] 标记。`;

    const payload = {
      model: "glm-5.1",
      messages: [
        { role: "system", content: character.systemPrompt + "\n" + systemPromptModifier },
        ...messages
      ],
      thinking: {
        "type": "disabled"
      },
      stream: true
    };

    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZHIPU_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("GLM Error:", err);
      return new Response(`GLM Error: ${err}`, { status: response.status });
    }

    console.log("GLM API connected successfully, starting stream...");

    // Convert SSE to readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return controller.close();

        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // 保留最后一行（可能是不完整的），将其放回 buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              if (trimmedLine === 'data: [DONE]') {
                continue;
              }
              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonStr = trimmedLine.slice(6).trim();
                  if (!jsonStr) {
                    continue;
                  }
                  const data = JSON.parse(jsonStr);
                  // 检查是否有错误
                  if (data.error) {
                    console.error("Chat API error:", data.error);
                    controller.error(new Error(data.error.message || 'Chat API error'));
                    return;
                  }
                  const content = data.choices[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e: any) {
                  console.error("SSE parse error", e.message, "Raw string:", trimmedLine);
                  // 继续处理其他数据块，不中断流
                }
              }
            }
          }

          // 处理最后可能剩余的 buffer
          if (buffer.trim()) {
            const trimmedLine = buffer.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const jsonStr = trimmedLine.slice(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  const content = data.choices[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                }
              } catch (e: any) {
                console.error("SSE parse error on final buffer", e.message);
              }
            }
          }
        } catch (e) {
          console.error("Stream error", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(error.message, { status: 500 });
  }
}
