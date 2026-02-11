export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { word, lang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 语种考据提示词
    const prompt = `You are an expert lexicographer and historian. 
    Create a deep-dive entry for the word "${word}" in ${lang}. 
    Return a JSON object with this EXACT structure:
    {
      "word": "${word}",
      "reading": "pronunciation/phonetic",
      "pinyin": "if Chinese, provide pinyin with tones, else null",
      "meaning": "concise Chinese definition",
      "etymology": "historical and academic origin (in Chinese)",
      "examples": [
        {"text": "example sentence in native language", "cn": "Chinese translation"}
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
    const data = JSON.parse(result.choices[0].message.content);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
