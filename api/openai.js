export default async function handler(req, res) {
  // 1. 完全复刻您的跨域 (CORS) 设置
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  // 处理预检请求
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

    // 3. 解析前端发送的参数 (兼容您的 App.vue 发送的 POST 请求体)
    const { word, lang } = req.body || req.query || {};
    if (!word) {
      return res.status(400).json({ error: '未提供单词' });
    }

    // 4. 完美复刻您的 Lexicographer 提示词 (Prompt)
    const prompt = `You are a professional lexicographer.
    Create a high-quality vocabulary card for the word "${word}" in ${lang || 'Chinese'}.
    Return a JSON object with this exact structure:
    {
      "word": "${word}",
      "reading": "pronunciation/kana",
      "meaning": "concise definition in Chinese",
      "etymology": "brief origin of the word",
      "word_details": "part of speech and grammar tips",
      "simple_english": "simple english translation",
      "examples": [
        {"text": "example sentence in ${lang}", "cn": "chinese translation"}
      ]
    }`;
    console.log(`🤖 正在为单词 [${word}] 挖掘内容...`);

    // 5. 使用 fetch 适配中转 API 站 (解决云端 @google/generative-ai 连接失败的问题)
    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // 中转站会将此映射至正确的模型
        messages: [
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" } // 强制返回 JSON 格式
      })
    });
    if (!response.ok) {
        throw new Error(`中转 API 请求失败: ${response.status}`);
    }

    const responseData = await response.json();
    const textContent = responseData.choices[0].message.content;
    // 6. 解析并返回数据给前端
    const data = JSON.parse(textContent);
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ 挖掘失败详细日志:", error);
    return res.status(500).json({ 
      error: '挖掘失败', 
      message: error.message,
      suggestion: "请检查 API Key 是否有效以及环境变量是否配置正确" 
    });
  }
}
