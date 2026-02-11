export default async function handler(req, res) {
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY; // 或 OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

  const { word, lang, type } = req.body;
  
  // 语种映射优化
  const langMap = {
      jp: "Japanese", cjp: "Classical Japanese (Bungo)",
      zh: "Modern Chinese", lzh: "Classical Chinese (Literary Chinese)",
      en: "English", de: "German", it: "Italian", lat: "Latin", kr: "Korean"
  };
  const targetLang = langMap[lang] || "Chinese";

  // 构建 Prompt
  let systemPrompt = `You are an expert lexicographer and etymologist. `;
  
  if (type === 'enrichment') {
      // 模式 2: 仅补全 (Local-First 命中后的静默请求)
      systemPrompt += `Provide deep etymology and 2 high-quality examples for the word "${word}" in ${targetLang}. 
      Return strictly JSON: 
      {
        "etymology": "Detailed origin/history...",
        "examples": [{"text": "sentence in ${targetLang}", "cn": "translation"}],
        "pinyin": "pinyin if chinese, else null"
      }`;
  } else {
      // 模式 1: 全量生成
      systemPrompt += `Create a comprehensive dictionary entry for "${word}" in ${targetLang}.
      Rules:
      1. If ${lang} is ZH or LZH, strictly provide "pinyin".
      2. For classical languages (CJP, LZH, LAT), examples should be from actual historical texts if possible.
      3. Return strictly JSON:
      {
        "word": "${word}",
        "reading": "pronunciation/kana/romaji",
        "pinyin": "include tones if Chinese, else null",
        "meaning": "Clear definition in Chinese",
        "etymology": "Academic origin explanation",
        "examples": [
           {"text": "Native sentence", "cn": "Chinese translation"}
        ]
      }`;
  }

  try {
      const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
              model: "gpt-3.5-turbo", // 或 gpt-4o
              messages: [{ role: "user", content: systemPrompt }],
              response_format: { type: "json_object" }
          })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      return res.status(200).json(JSON.parse(data.choices[0].message.content));

  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Mining failed' });
  }
}
