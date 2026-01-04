const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// simple memory counter
let usageCount = {};

app.get("/", (req, res) => {
  res.send("AI Resume Backend Running");
});

app.post("/optimize", upload.single("resume"), async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";

    usageCount[ip] = (usageCount[ip] || 0) + 1;

    if (usageCount[ip] > 3) {
      return res.json({ paywall: true });
    }

    const jd = req.body.jd;

    if (!jd || jd.length < 30) {
      return res.json({
        success: true,
        remainingFree: 3 - usageCount[ip],
        data: "❌ Please paste a detailed job description."
      });
    }

    const prompt = `
You are an ATS resume expert.

Rewrite the resume for the job description.
Make it ATS-friendly.
No fake experience.

JOB DESCRIPTION:
${jd}

Return:
Optimized Resume
ATS Score %
Missing Keywords
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-pro"
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.json({
      success: true,
      remainingFree: 3 - usageCount[ip],
      data: text
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.json({
      success: true,
      remainingFree: 2,
      data:
        "⚠️ AI is busy right now. Please wait a few seconds and try again."
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
