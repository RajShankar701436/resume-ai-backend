const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Gemini API (from Render Environment Variable)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3 free resumes per IP (simple MVP logic)
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

  const jobDescription = req.body.jd;

  if (!jobDescription || jobDescription.length < 30) {
    return res.json({
      success: true,
      remainingFree: 3 - usageCount[userIP],
      data: "❌ Please paste a proper job description (at least 2–3 lines)."
    });
  }

  // LIGHT + STABLE PROMPT (less throttling)
  const prompt = `
You are a professional ATS resume optimization expert.

TASK:
- Rewrite resume according to the job description
- Make it ATS-friendly
- Improve wording, skills, and courses
- Do NOT add fake experience
- Professional tone only

JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT:
Optimized Resume:
(full resume text)

ATS Score:
(number)%

Missing Keywords:
(list)
`;

  try {
    // ✅ STABLE MODEL
    const model = genAI.getGenerativeModel({
      model: "gemini-pro"
    });

    // �
