import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, data } = req.body;

    if (!question || !data) {
      return res.status(400).json({ error: "Missing question or data" });
    }

    const systemPrompt = `
You are a private financial intelligence assistant embedded inside a personal money tracker app.

You are NOT a generic chatbot.
You are a calm, analytical, practical advisor whose goal is to:
- protect the user’s cash flow
- identify waste, leaks, and bad patterns
- give actionable, realistic advice
- never shame, guilt, or moralize

RULES:
1. Base advice ONLY on provided data.
2. Ask ONE precise follow-up question if data is missing.
3. Avoid illegal, risky, or extreme financial advice.
4. Avoid motivational fluff.
5. Quantify advice when possible.

STYLE:
- Short paragraphs
- Bullet points when useful
- Clear sections
- No emojis
- No slang
`;

    const userPrompt = `
USER QUESTION:
${question}

FINANCIAL DATA (JSON):
${JSON.stringify(data, null, 2)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    res.status(200).json({
      reply: response.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
}
