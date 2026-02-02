import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { question, financialData } = req.body;

    if (!question || !financialData) {
      return res.status(400).json({ error: "Missing input data" });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are a private financial intelligence assistant embedded inside a personal money tracker app.

You are calm, analytical, practical.
Base advice ONLY on provided data.
Quantify recommendations.
Ask ONE follow-up question if data is missing.
Avoid fluff and moralizing.
          `.trim()
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            financial_data: financialData
          })
        }
      ]
    });

    res.status(200).json({
      reply: response.output_text
    });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI service failure" });
  }
}
