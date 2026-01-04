const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Gemini API key Render ke Environment Variable se aayegi
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory free usage counter (3 free resumes)
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
      return res.json({
        paywall: true,
        message: "3 free resumes used. Please pay to continue."
      });
    }

    const resumeText = fs.readFileSync(req.file.path, "utf8");
    const jobDescription = req.body.jd;

    const prompt = `
You are an ATS resume optimization expert.

RULES:
- Make resume ATS friendly
- Do NOT add fake experience
- Improve wording, skills, and courses
- Match job description keywords
- Target ATS score above 85%

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

OUTPUT FORMAT:
1. Optimized Resume
2. ATS Score (percentage)
3. Missing Keywords
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    res.json({
      success: true,
      remainingFree: 3 - usageCount[userIP],
      data: output
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
