const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// Gemini API key Render environment variable se aayegi
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let usageCount = {};

app.post("/optimize", upload.single("resume"), async (req, res) => {
  try {
    const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    usageCount[userIP] = (usageCount[userIP] || 0) + 1;

    if (usageCount[userIP] > 3) {
      return res.json({ paywall: true });
    }

    const resumeText = fs.readFileSync(req.file.path, "utf8");
    const jd = req.body.jd;

    const prompt = `
You are an ATS resume optimization expert.

Rules:
- ATS friendly
- No fake experience
- Optimize skills, courses & wording
- Target ATS score above 85%

Job Description:
${jd}

Resume:
${resumeText}

Return:
1. Optimized Resume
2. ATS Score %
3. Missing Keywords
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    res.json({
      output: result.response.text(),
      remainingFree: 3 - usageCount[userIP]
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/", (req, res) => {
  res.send("AI Resume Backend Running");
});

app.listen(process.env.PORT || 3000);
