export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body;

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

    // 核心指令：学术、维基百科风格、纯文本
    let systemPrompt = `You are a strict Etymologist and Historian.
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    Task: Provide a JSON response ONLY.
    
    CRITICAL INSTRUCTION:
    1. **Etymology**: MUST quote/adapt a narrative style similar to Wikipedia in the target language (translated to Chinese for clarity if needed, or bilingual). Focus on historical linguistic shifts, roots (PIE, Sino-Tibetan), and first known usages.
    2. **Examples**: Provide 2-3 prestigious sentences (Literature, History, Philosophy).
    3. **Images**: DO NOT generate images.
    `;

    if (type === 'enrich') {
      systemPrompt += `
      Mode: Enrichment.
      JSON:
      {
        "etymology": "Detailed Wikipedia-style academic narrative...",
        "examples": [{"text": "Native Sentence", "cn": "Chinese Translation"}]
      }`;
    } else {
      systemPrompt += `
      Mode: Full Entry.
      JSON:
      {
        "word": "${word}",
        "reading": "IPA/Kana/Pinyin",
        "meaning": "Concise Chinese definition",
        "etymology": "Detailed Wikipedia-style academic narrative...",
        "simple_english": "English equivalent",
        "word_details": "POS / Era",
        "examples": [{"text": "Native", "cn": "Translation"}]
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
