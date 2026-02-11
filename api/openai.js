export default async function handler(req, res) {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang } = req.body || {};

    if (!word) return res.status(400).json({ error: 'Missing word' });

    // 严谨的学术提示词
    const prompt = `You are an elite academic lexicographer and archaeologist. Create a deep scholarly card for the word "${word}" in the context of "${lang}".
    
    CRITICAL REQUIREMENTS:
    1. EXAMPLES: Provide EXACTLY TWO high-quality example sentences in the native language (${lang}). 
       - At least one must be a famous quote, classical text snippet, or academic sentence related to history/archaeology.
       - The language must be pure ${lang}, NO translation in the text field.
    2. ETYMOLOGY: Provide a rich, detailed scholarly explanation in CHINESE. 
       - Incorporate origin data from Wikimedia/Etymonline. 
       - Explain linguistic shifts and historical context. Aim for 100-200 characters.
    3. MEANING: Accurate, precise academic definition in Chinese.
    
    Structure:
    {
      "word": "${word}",
      "reading": "accurate phonetics/kana",
      "meaning": "academic definition",
      "etymology": "rich historical background in Chinese",
      "examples": [
        {"text": "native sentence 1", "cn": "chinese translation 1"},
        {"text": "native sentence 2", "cn": "chinese translation 2"}
      ]
    }`;

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

    const result = await response.json();
    return res.status(200).json(JSON.parse(result.choices[0].message.content));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
