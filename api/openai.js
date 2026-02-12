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
      zh: "Modern Chinese (Mandarin)",
      en: "English",
      de: "German",
      it: "Italian",
      lat: "Latin"
    };
    const targetLang = langMap[lang] || "English";
    
    // 词源控制
    const needsEtymology = ['en', 'de', 'it', 'lat'].includes(lang);

    // --- 核心 Prompt ---
    let systemPrompt = `You are a professional Lexicographer and Etymologist.
    Target Language: ${targetLang}.
    User Query: "${word}".
    
    CRITICAL INSTRUCTION (Mutual Search):
    1. If the User Query is in CHINESE, but Target Language is NOT Chinese:
       - FIRST, translate "${word}" into ${targetLang}.
       - THEN, create the dictionary entry for the TRANSLATED word.
       - Example: User searches "苹果" in English -> You output data for "Apple".
    
    2. **Examples Constraint**:
       - The "text" field MUST be in ${targetLang} (NOT Chinese).
       - The "cn" field is the Chinese translation.
    
    Output JSON ONLY. Format:
    `;

    if (type !== 'enrich') {
      systemPrompt += `
      {
        "word": "The word in ${targetLang}",
        "pinyin": ${lang === 'zh' ? '"Pinyin with tones"' : 'null'},
        "reading": "IPA/Kana",
        "meaning": "Rich, Encyclopedic definition in Chinese (Wikipedia level)",
        "etymology": ${needsEtymology ? '"Detailed academic origin narrative..."' : 'null'},
        "word_details": "Part of speech / Origin",
        "examples": [
          {"text": "Sentence IN ${targetLang}", "cn": "Chinese Translation"}
        ]
      }`;
    } else {
      systemPrompt += `
      {
        "etymology": ${needsEtymology ? '"Detailed narrative..."' : 'null'},
        "examples": [{"text": "Native Sentence", "cn": "Translation"}]
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
