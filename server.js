import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Make sure node-fetch is installed

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Detect static folder: build or public
const buildPath = path.join(process.cwd(), "build");
const publicPath = path.join(process.cwd(), "public");
const staticPath = fs.existsSync(buildPath) ? buildPath : publicPath;

// Serve static files
app.use(express.static(staticPath));

// Example API route (adjust based on your existing code)
app.post("/api/some-endpoint", async (req, res) => {
  try {
    const response = await fetch("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Catch-all for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
