export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { word, lang } = req.body || {};
    if (!word) return res.status(400).json({ error: 'Missing word' });

    // 严谨的考古学术提示词
    const prompt = `你是一位顶尖的语源学家和考古学教授。请针对 "${lang}" 语种的词汇 "${word}" 制作一份极具学术深度的辞典词条。
    
    【强制要求】：
    1. 例句：提供【两个】极具深度的例句。优先选择该语言的经典著作、名人名言、古典诗词或历史考古文献原文。
    2. 语种对齐：examples.text 必须纯正使用 "${lang}" 编写，严禁混入中文。
    3. 词源考证：etymology 字段需参考维基百科或专业语源学辞典，提供 150 字左右详细的考证说明，解释词汇的历史演变，并统一使用【中文】。
    4. 学术释义：meaning 使用中文，确保定义严谨、精确。

    JSON 结构：
    {
      "word": "${word}",
      "reading": "准确读音或假名",
      "meaning": "学术定义",
      "etymology": "详尽中文词源说明",
      "word_details": "学科分类/词性",
      "simple_english": "对应英文专业学术词汇",
      "examples": [
        {"text": "原文例句 1", "cn": "学术级翻译 1"},
        {"text": "原文例句 2", "cn": "学术级翻译 2"}
      ]
    }`;

    const response = await fetch('https://api.openai-proxy.org/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } })
    });

    const result = await response.json();
    return res.status(200).json(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
