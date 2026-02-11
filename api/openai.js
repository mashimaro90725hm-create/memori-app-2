export default async function handler(req, res) {
  // 1. 完全复刻您的跨域 (CORS) 设置 [cite: 1-4]
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: '服务器配置错误：缺少 API Key' });

    const { word, lang, type } = req.body || req.query || {};

    // --- 新增：年表“历史上的今天/今年”逻辑 ---
    if (type === 'timeline_today') {
      return await handleTimelineToday(res, apiKey);
    }

    if (!word) return res.status(400).json({ error: '未提供单词' });

    // --- 核心 Prompt 升级：忆栖 · Memori 学术辞典模式 ---
    // 强化了中日韩的难词标注逻辑，去掉了历史考古的显性标签
    const prompt = `You are the lead editor for "忆栖 · Memori", an elite multi-disciplinary academic dictionary. 
    Create a scholarly card for the word "${word}" in the context of "${lang}".

    CORE REQUIREMENTS:
    1. MEANING & ETYMOLOGY: Provide a precise academic definition and a detailed etymology (150+ chars) in CHINESE. Use Wikipedia/academic standards. 
    2. EXAMPLES (CJK Languages - ZH, JP, KR): 
       - Provide TWO deep, grammatically valuable sentences in native ${lang}. 
       - Identify and wrap "challenging professional terms" (2+ characters) within the sentences with <span> tags for the "search-within-sentence" feature.
    3. EXAMPLES (European Languages - EN, DE, IT, LAT): 
       - Provide TWO deep, grammatically valuable sentences. 
       - Focus on classical literature or high-level academic usage. No <span> wrapping needed.
    4. GRAMMAR VALUE: Each example must demonstrate significant syntactic patterns of ${lang}.

    Structure:
    {
      "word": "${word}",
      "reading": "accurate pronunciation",
      "meaning": "precise chinese definition",
      "etymology": "rich scholarly etymology in Chinese",
      "word_details": "academic POS and category",
      "simple_english": "precise English equivalent",
      "examples": [
        {"text": "depth sentence with <span>tags for CJK words</span>", "cn": "pro translation"}
      ]
    }`;

    console.log(`📑 [忆栖 · Memori] 正在编纂词条: [${word}]...`);

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
    console.error("❌ 编纂失败:", error);
    return res.status(500).json({ error: '挖掘失败', message: error.message });
  }
}

// 辅助函数：处理年表“历史上的今天”
async function handleTimelineToday(res, apiKey) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  const prompt = `Provide 3-5 major global historical events that happened on ${month} month ${day} day throughout history. 
  Return in JSON format: {"events": [{"year": "...", "event": "...", "tag": "..."}]}`;

  const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }] })
  });
  
  const data = await response.json();
  return res.status(200).json(JSON.parse(data.choices[0].message.content));
}
