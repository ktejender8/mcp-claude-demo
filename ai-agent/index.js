import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Anthropic endpoint
const ANTHROPIC_API_URL =
  process.env.AI_API_URL || "https://api.anthropic.com/v1/messages";

// API key
const API_KEY = process.env.CLAUDE_API_KEY || process.env.CLAUDE_KEY;

// FIX: Correct model name
const MODEL =
  process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest";

// Basic health endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("AI Agent is running. Use POST /ask");
});

// AI handler
app.post("/ask", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(400).json({ error: "Missing CLAUDE_API_KEY" });
    }

    const body = {
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: req.body.prompt }]
    };

    const response = await axios.post(ANTHROPIC_API_URL, body, {
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    });

    res.json({
      reply: response.data?.content?.[0]?.text || ""
    });

  } catch (err) {
    console.error(
      "Anthropic API error:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(8080, () =>
  console.log("AI Agent running on port 8080")
);
