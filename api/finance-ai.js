import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, data } = req.body;

    if (!message || !data) {
      return res.status(400).json({ error: "Missing input data" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a private financial intelligence assistant embedded inside a personal money tracker app.

You are calm, analytical, practical, and strict-but-supportive.
You give realistic, quantified advice.
You ONLY use the provided financial data.
No fluff. No emojis. No slang.
`
        },
        {
          role: "user",
          content: `
User question:
${message}

User financial data (JSON):
${JSON.stringify(data, null, 2)}
`
        }
      ],
      temperature: 0.3
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({ error: "AI service failure" });
  }
}
