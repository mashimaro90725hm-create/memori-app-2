export default async function handler(req, res) {
  // CORS 配置
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

    // 专业学术 Prompt
    let systemPrompt = `You are a professional Etymologist and Lexicographer writing for an academic encyclopedia.
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    CRITICAL:
    1. If Query is Chinese & Target is NOT Chinese -> Translate first, then define the translated word.
    2. Output strict JSON.
    
    Task Requirements:
    - **Etymology**: Provide a Wikipedia-style narrative. Discuss Proto-roots (PIE, Proto-Sino-Tibetan), cognates, and historical semantic shifts. Use academic tone.
    - **Examples**: Select 2-3 prestigious sentences (Literature/History/Philosophy).
    `;

    if (type === 'enrich') {
      systemPrompt += `
      Mode: Enrichment (Etymology & Examples only).
      JSON Structure:
      {
        "etymology": "Detailed encyclopedic narrative...",
        "examples": [{"text": "Native", "cn": "Translation"}]
      }`;
    } else {
      systemPrompt += `
      Mode: Full Dictionary Entry.
      JSON Structure:
      {
        "word": "Target Word",
        "reading": "IPA/Kana/Pinyin",
        "meaning": "Concise definition in Chinese",
        "etymology": "Detailed encyclopedic narrative...",
        "simple_english": "English equivalent",
        "word_details": "Part of speech / Origin Era",
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
