import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files from public folder
const staticPath = path.join(process.cwd(), "public");
app.use(express.static(staticPath));

// Example API route
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Catch-all route to serve index.html
app.get("*", (req, res) => {
  const indexFile = path.join(staticPath, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("index.html not found");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
