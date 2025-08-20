// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // make sure node-fetch is installed
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Serve frontend static files
app.use(express.static(path.join(__dirname, "build")));

// Example API route
app.get("/api/example", async (req, res) => {
  try {
    const response = await fetch("https://your-api-endpoint.com/data"); 
    const text = await response.text();

    // Check if response is JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Response was not valid JSON:", text);
      return res.status(500).json({ error: "Invalid JSON from upstream API" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// All other routes serve the frontend index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
