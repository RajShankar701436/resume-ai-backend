const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// simple in-memory counter (3 free)
let usageCount = {};

app.get("/", (req, res) => {
  res.send("AI Resume Backend Running");
});

app.post("/optimize", upload.single("resume"), async (req, res) => {
  try {
    const userIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

    usageCount[userIP] = (usageCount[userIP] || 0) + 1;

    if (usageCount[userIP] > 3) {
      return res.json({ paywall: true });
    }

    const jd = req.body.jd;

    if (!jd || jd.length < 30) {
      return res.json({
        success: true,
        remainingFree: 3 - usageCount[userIP],
        data: "❌ Please paste a proper job description (minimum 2–3 lines)."
      });
    }

    const prompt = `
You are an ATS resume optimization expert.

TASK:
- Rewrite resume according to the job description
- Make it ATS-friendly
- Improve wording and skills
- Do NOT add fake experience

JOB DESCRIPTION:
${jd}

OUTPUT:
Optimized Resume
ATS Score %
Missing Keywords
`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.json({
      success: true,
      remainingFree: 3 - usageCount[userIP],
      data: text
    });

  } catch (err) {
    console.error(err);
    return res.json({
      success: true,
      remainingFree: 3,
      data: "⚠️ AI is busy right now. Please try again in a few seconds."
    });
  }
});
