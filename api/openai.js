export default async function handler(req, res) {
  // 1. CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body;

    // 语种全称映射
    const langMap = {
      cjp: "Classical Japanese (Bungo)",
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
    const isChineseTarget = lang === 'zh' || lang === 'lzh';

    // 核心 Prompt Logic
    let systemPrompt = `You are a professional Etymologist and Lexicographer.
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    CRITICAL INSTRUCTION:
    1. If the User Query is in Chinese AND Target Language is NOT Chinese/Classical Chinese:
       - FIRST, translate "${word}" into ${targetLang}.
       - THEN, create the dictionary entry for that TRANSLATED word.
       - Example: User searches "苹果" in English -> You output data for "Apple".
    2. If Target Language IS Chinese/Classical Chinese:
       - Treat "${word}" strictly as the target word. Do NOT translate.
    
    Output strictly valid JSON. NO markdown.
    `;

    if (type === 'enrich') {
      // 补全模式
      systemPrompt += `
      Task: Provide deep etymology and examples only.
      JSON Structure:
      {
        "etymology": "Detailed bilingual etymology (Chinese + Native)...",
        "examples": [{"text": "Native Sentence", "cn": "Chinese Translation"}]
      }`;
    } else {
      // 全量模式
      systemPrompt += `
      Task: Create a full dictionary card.
      JSON Structure:
      {
        "word": "The word in ${targetLang}",
        "reading": "Pronunciation (IPA/Kana/Pinyin)",
        "meaning": "Definition in Chinese",
        "etymology": "Brief origin",
        "simple_english": "English equivalent",
        "word_details": "Part of speech",
        "examples": [{"text": "Example sentence", "cn": "Translation"}]
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
