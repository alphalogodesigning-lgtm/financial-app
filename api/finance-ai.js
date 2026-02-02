import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Accept BOTH old and new payload shapes safely
    const message =
      req.body.message ||
      req.body.question ||
      "";

    const financialData =
      req.body.data ||
      req.body.financialData ||
      null;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are a private financial intelligence assistant embedded inside a personal money tracker app.

You are NOT a generic chatbot.
You are calm, analytical, practical.

RULES:
- Base advice ONLY on provided data
- Quantify recommendations when possible
- Ask ONE precise follow-up question if data is missing
- Avoid fluff, shame, or moralizing
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            question: message,
            financial_data: financialData,
          }),
        },
      ],
    });

    res.status(200).json({
      reply: response.output_text || "No response generated.",
    });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI service failure" });
  }
}
