export default async function handler(req, res) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body; // type: 'full' | 'enrich'

    // 语种全称映射
    const langMap = {
      cjp: "Classical Japanese (Bungo, with historical kana usage)",
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

    // 核心 Prompt 设计
    let systemPrompt = `You are a professional linguist, etymologist, and historian. 
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    Task: Provide a JSON response. NO markdown formatting.
    `;

    if (type === 'enrich') {
      // 模式 A: 局部补全 (Local Hit -> Enrich)
      systemPrompt += `
      Focus ONLY on deep Etymology and diverse Sentences.
      
      Requirements:
      1. **Etymology**: Explain the origin/root in CHINESE and ${targetLang}. Reach Wikipedia academic depth. Mention historical shifts if any.
      2. **Sentences**: Provide 2-3 examples. MUST choose from: Famous Quotes, Ancient Poems, Historical Texts, or Complex Grammar structures. Include native text and Chinese translation.
      
      Output JSON Structure:
      {
        "etymology": "Detailed bilingual etymology...",
        "examples": [
          {"text": "Native sentence", "cn": "Chinese translation"}
        ]
      }`;
    } else {
      // 模式 B: 全量发掘 (Full Discovery)
      systemPrompt += `
      Generate a complete dictionary card.
      
      Requirements:
      1. **Meaning**: Clear definition in Chinese.
      2. **Reading**: Pronunciation (IPA, Kana, or Pinyin).
      3. **Etymology**: Detailed academic origin (Bilingual: Chinese + Native).
      4. **Sentences**: 2-3 High-quality examples (Quotes/History/Literature).
      
      *CRITICAL FOR CJK*: For Chinese/Japanese/Korean words in the "meaning" or "examples", if there are difficult words, wrap them in simple text (Frontend will handle regex wrapping, or you can wrap key terms in <span class='interactive-word'>...</span> if you want specific highlighting).
      
      Output JSON Structure:
      {
        "word": "${word}",
        "reading": "...",
        "meaning": "...",
        "etymology": "...",
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
        model: "gpt-3.5-turbo", // 或 gpt-4o
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
