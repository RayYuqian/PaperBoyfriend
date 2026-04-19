import { NextRequest, NextResponse } from 'next/server';
import { characters } from '@/lib/characters';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const isAllowed = await checkRateLimit(`img:${ip}`, 30, 60 * 60 * 1000); // 30 per hour
    if (!isAllowed) {
      return NextResponse.json({ error: "图片生成次数过多，请一小时后再试。 (已触发服务器防刷保护)" }, { status: 429 });
    }

    const { characterId, prompt } = await req.json();
    const character = characters.find(c => c.id === characterId);

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (!process.env.VOLC_API_KEY) {
      return NextResponse.json({ error: 'VOLC_API_KEY not set' }, { status: 500 });
    }

    const cleanImagePrompt = character.imagePrompt.replace(/Vogue杂志封面美学/g, "");
    const finalPrompt = `${cleanImagePrompt}。当前场景动作：${prompt}。要求：画面干净，画面中必须绝对不要包含任何文字、水印、字母、UI元素或排版设计。`;

    const rand = Math.random();
    let numImages = 1;
    if (rand > 0.95) {
      numImages = 3;
    } else if (rand > 0.8) {
      numImages = 2;
    }

    const payload = {
      model: "doubao-seedream-5-0-260128",
      prompt: finalPrompt,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: "2K",
      watermark: "false",
      n: numImages
    };

    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.VOLC_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Image Gen API Error:", err);
      return NextResponse.json({ error: "Image generation failed" }, { status: response.status });
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const urls = data.data.map((item: any) => item.url || `data:image/png;base64,${item.b64_json}`);
      return NextResponse.json({ urls });
    } else {
      return NextResponse.json({ error: "No image data returned" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Image route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
