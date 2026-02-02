export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, data } = req.body;

    if (!message || !data) {
      return res.status(400).json({ error: "Missing input data" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
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
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return res.status(500).json({ error: "AI service failure" });
    }

    const json = await response.json();
    const reply = json.choices[0].message.content;

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Unhandled AI error:", err);
    return res.status(500).json({ error: "AI service failure" });
  }
}
