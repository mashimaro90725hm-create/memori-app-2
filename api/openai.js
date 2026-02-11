export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang, type } = req.body;

    const langMap = {
      jp: "Modern Japanese",
      cjp: "Classical Japanese (Bungo)",
      kr: "Korean",
      zh: "Modern Chinese",
      lzh: "Classical Chinese",
      en: "English",
      de: "German",
      it: "Italian",
      lat: "Latin"
    };
    const targetLang = langMap[lang] || "English";
    
    // 5. 判定是否为欧美语系 (需要词源)
    const needsEtymology = ['en', 'de', 'it', 'lat'].includes(lang);

    let systemPrompt = `You are a strict Etymologist and Lexicographer.
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    Task: Provide a JSON response ONLY.
    
    CRITICAL INSTRUCTION:
    1. **Translation**: If Query is Chinese & Target is NOT Chinese -> Translate first.
    2. **Examples**: Provide 2-3 prestigious sentences (Literature, History) with Chinese translation.
    `;

    // 5. 词源控制逻辑
    if (needsEtymology) {
      systemPrompt += `3. **Etymology**: MUST quote/adapt a narrative style similar to Wikipedia in the target language (translated to Chinese). Focus on PIE roots/history.`;
    } else {
      systemPrompt += `3. **Etymology**: Do NOT provide etymology field. Return null or empty string.`;
    }

    if (type === 'enrich') {
      systemPrompt += `
      Mode: Enrichment.
      JSON Structure:
      {
        "etymology": ${needsEtymology ? '"Detailed Wikipedia-style narrative..."' : 'null'},
        "examples": [{"text": "Native Sentence", "cn": "Chinese Translation"}]
      }`;
    } else {
      systemPrompt += `
      Mode: Full Entry.
      JSON Structure:
      {
        "word": "Target Word",
        "reading": "IPA/Kana/Pinyin",
        "meaning": "Concise Chinese definition",
        "etymology": ${needsEtymology ? '"Detailed Wikipedia-style narrative..."' : 'null'},
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
