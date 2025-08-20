import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Use Render's dynamic port or default 10000
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Example API endpoint using fetch safely
app.get("/api/data", async (req, res) => {
  try {
    const response = await fetch("https://api.example.com/data"); // Replace with your API URL

    const text = await response.text(); // Read as text first
    try {
      const data = JSON.parse(text); // Parse JSON safely
      res.json(data);
    } catch {
      // If it’s not JSON, return as text
      res.send(text);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
