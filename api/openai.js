export default async function handler(req, res) {
  // 1. 设置跨域 (移植自您本地内测版)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY; // 读取 Vercel 中的 sk- 密钥
    const { word, lang } = req.query || {};

    if (!word) return res.status(400).json({ error: '未提供单词' });

    // 2. 请求中转站地址
    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", 
        messages: [
          { role: "system", content: "You are a professional lexicographer." },
          { role: "user", content: `Create a vocabulary card for "${word}" in ${lang || 'Chinese'}. Return pure JSON:{"word":"${word}","reading":"pronunciation","meaning":"definition","etymology":"origin","word_details":"grammar","simple_english":"English","examples":[{"text":"sentence","cn":"translation"}]}` }
        ],
        response_format: { type: "json_object" } 
      })
    });

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    return res.status(200).json(JSON.parse(resultText));
  } catch (error) {
    return res.status(500).json({ error: '挖掘失败', message: error.message });
  }
}
