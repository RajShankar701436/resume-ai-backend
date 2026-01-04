const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3 free resumes per IP
let usageCount = {};

app.get("/", (req, res) => {
  res.send("AI Resume Backend Running");
});

app.post("/optimize", upload.single("resume"), async (req, res) => {
  const userIP =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  usageCount[userIP] = (usageCount[userIP] || 0) + 1;

  if (usageCount[userIP] > 3) {
    return res.json({
      paywall: true
    });
  }

  try {
    const jd = req.body.jd;

    if (!jd || jd.length < 20) {
      return res.json({
        success: true,
        remainingFree: 3 - usageCount[userIP],
        data: "❌ Please paste a proper job description (minimum 2–3 lines)."
      });
    }

    const prompt = `
You are a professional ATS resume optimization expert.

The user has uploaded a resume file (PDF/DOCX).

TASK:
- Rewrite the resume according to the job description
- Make it ATS-friendly
- Improve skills, wording, and courses
- Do NOT add fake experience
- Target ATS score above 85%

JOB DESCRIPTION:
${jd}

OUTPUT FORMAT:
Optimized Resume:
[full resume content]

ATS Score:
[number]%

Missing Keywords:
[list]
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // HARD SAFETY
    const finalText =
      text && text.trim().length > 10
        ? text
        : "⚠️ AI could not generate a strong result. Please try a different job description.";

    res.json({
      success: true,
      remainingFree: 3 - usageCount[userIP],
      data: finalText
    });

  } catch (err) {
    console.error("GEMINI ERROR:", err);

    res.json({
      success: true,
      remainingFree: 3 - usageCount[userIP],
      data:
        "⚠️ Temporary AI issue. Please wait 10 seconds and try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
