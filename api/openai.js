export default async function handler(req, res) {
  // 1. 保留您的跨域 (CORS) 设置
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. 读取 API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ 错误: 环境变量 GEMINI_API_KEY 未设置");
      return res.status(500).json({ error: '服务器配置错误：缺少 API Key' });
    }

    // 3. 解析前端参数
    const { word, lang } = req.body || req.query || {};
    if (!word) {
      return res.status(400).json({ error: '未提供单词' });
    }

    // 4. 优化后的词典编纂提示词：去图片化，强调考古与学术严谨性
    // 这里的 prompt 移除了视觉描述，增加了对考古语境的理解
    const prompt = `You are a professional lexicographer specializing in Archaeology and Linguistics. 
    Create a high-quality academic vocabulary card for the word "${word}" in the context of ${lang || 'Japanese/Chinese'}.
    
    Return a JSON object with this exact structure:
    {
      "word": "${word}",
      "reading": "kana for Japanese or pinyin for Chinese",
      "meaning": "concise academic definition in Chinese",
      "etymology": "historical or linguistic origin of the word",
      "word_details": "academic category (e.g., Archaeology, Art History, etc.)",
      "simple_english": "clear english academic term",
      "examples": [
        {"text": "example sentence showing usage in academic literature", "cn": "accurate chinese translation"}
      ]
    }`;

    console.log(`🏛️ 正在对考古词汇 [${word}] 进行学术挖掘...`);

    // 5. 调用中转 API (保持原有适配逻辑)
    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", 
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant that outputs only JSON for archaeology and language learning." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
        throw new Error(`中转 API 请求失败: ${response.status}`);
    }

    const responseData = await response.json();
    const textContent = responseData.choices[0].message.content;

    // 6. 解析并返回
    const data = JSON.parse(textContent);
    
    // 确保返回的数据中不包含任何旧有的图片链接字段，保持简洁明快
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ 后端挖掘失败:", error);
    return res.status(500).json({ 
      error: '挖掘失败', 
      message: error.message
    });
  }
}
