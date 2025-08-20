import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.post("/api/chat", async (req, res) => {
  const { prompt, model } = req.body;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const text = await response.text();  // read raw text first
    let data;

    try {
      data = JSON.parse(text);  // try parsing JSON
    } catch (err) {
      console.error("Non-JSON response received:", text);
      return res.status(500).json({ error: "Invalid response from API", raw: text });
    }

    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
