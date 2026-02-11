export default async function handler(req, res) {
  // CORS 
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body; // type: 'full' | 'enrich'

    // 语种映射
    const langMap = {
      cjp: "Classical Japanese (Bungo, historical context)",
      lzh: "Classical Chinese (Literary Chinese)",
      lat: "Latin",
      jp: "Modern Japanese",
      zh: "Modern Chinese",
      en: "English",
      de: "German",
      it: "Italian",
      kr: "Korean"
    };
    const targetLang = langMap[lang] || "English";

    let systemPrompt = `You are an expert Etymologist and Lexicographer. 
    User Query: "${word}" in ${targetLang}.
    
    Output JSON ONLY. No markdown.
    `;

    if (type === 'enrich') {
      // 补全模式：只查词源和例句
      systemPrompt += `
      Task: Provide deep academic background and high-quality examples.
      
      Requirements:
      1. **Etymology**: 200+ words. Trace roots (PIE, Proto-Sino-Tibetan, etc.). Bilingual explanation (Chinese + ${targetLang}). Mention historical shifts.
      2. **Examples**: 2-3 sentences. MUST be from: Famous Literature, Ancient Texts, Historical Events, or Philosophers. No simple daily conversation.
      
      Structure:
      {
        "etymology": "Detailed string...",
        "examples": [{"text": "Native text", "cn": "Chinese translation"}]
      }`;
    } else {
      // 全量模式
      systemPrompt += `
      Task: Create a comprehensive dictionary entry.
      
      Requirements:
      1. **Meaning**: Professional definition in Chinese.
      2. **Reading**: IPA, Kana, or Pinyin.
      3. **Etymology**: Wikipedia-level academic depth.
      4. **Examples**: 2-3 High-quality quotes/historical text.
      
      Structure:
      {
        "word": "${word}",
        "reading": "...",
        "meaning": "...",
        "etymology": "...",
        "simple_english": "Quick translation",
        "word_details": "Part of speech / JLPT level / Era",
        "examples": [{"text": "...", "cn": "..."}]
      }`;
    }

    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return res.status(200).json(content);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
