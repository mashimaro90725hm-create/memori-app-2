export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body || {};

    // 历史上的今天/今年逻辑
    if (type === 'timeline_today') {
      const todayPrompt = `Provide 5 significant global historical events that happened on this day (Month-Day) throughout history. Return as JSON: {"events": [{"year": "...", "event": "...", "tag": "..."}]}`;
      const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: todayPrompt }] })
      });
      const data = await response.json();
      return res.status(200).json(JSON.parse(data.choices[0].message.content));
    }

    // 核心辞典逻辑：支持双向查询与难词标记
    const isCJK = ['jp', 'zh', 'kr', 'lzh'].includes(lang);
    const isDual = !['zh', 'lzh'].includes(lang); // 现代/古典汉语不支持双向
    
    const prompt = `You are the scholarly editor for "忆栖 · Memori". 
    Task: Create a deep academic card for "${word}" in ${lang}.
    ${isDual ? "If the input is in Chinese, translate to the target language. If in the target language, translate to Chinese." : ""}
    
    Requirements:
    1. MEANING: Precise academic definition.
    2. ETYMOLOGY: Detailed scholarly origin in Chinese (150+ chars).
    3. EXAMPLES: Two sentences with high grammatical value. 
    ${isCJK ? "FOR CJK LANGUAGES: Identify professional terms (2+ chars) and wrap them in <span>tags</span> within the example text." : ""}
    4. NO IMAGES: Focus strictly on text and linguistics.
    
    Return JSON: { "word": "...", "reading": "...", "meaning": "...", "etymology": "...", "examples": [{"text": "...", "cn": "..."}] }`;

    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    return res.status(200).json(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
