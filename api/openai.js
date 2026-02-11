export default async function handler(req, res) {
  // --- 保持原有的 CORS 设置 (不做改动) ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang } = req.body || req.query || {};
    if (!word) return res.status(400).json({ error: '未提供单词' });

    // --- 核心优化：增强型学术提示词 ---
    const prompt = `你是一名专业的考古学家和词典编纂者。请为词汇 "${word}"（语种：${lang || 'jp'}）制作一份极高规格的学术词条。
    
    【核心要求】：
    1. 例句语言 (examples.text)：必须完全使用单词所属的 "${lang}" 语种编写。严禁在 text 字段出现中文（除非是引用原文）。
    2. 词源解释 (etymology)：请参考维基百科、学术专著或考证资料。不仅要说明起源，还要详细描述其在考古、文化或历史语境下的演变。内容要丰富、详细，并统一使用【中文】解释。
    3. 释义 (meaning)：使用中文，提供精准的学术定义。

    Return a JSON object with this exact structure:
    {
      "word": "${word}",
      "reading": "pronunciation/kana",
      "meaning": "学术释义(中文)",
      "etymology": "详细的词源考证与历史背景(中文)",
      "word_details": "词性及学科分类",
      "simple_english": "simple english translation",
      "examples": [
        {"text": "必须使用 ${lang} 编写的例句", "cn": "该例句的中文翻译"}
      ]
    }`;

    // 使用 fetch 访问中转 API
    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", 
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const responseData = await response.json();
    const data = JSON.parse(responseData.choices[0].message.content);
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: '挖掘失败', message: error.message });
  }
}
