app.post("/optimize", upload.single("resume"), async (req, res) => {
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
      data: "❌ Please paste a detailed job description."
    });
  }

  const prompt = `
You are an ATS resume expert.

Optimize the resume for the job description.
Rules:
- ATS friendly
- No fake experience
- Improve wording & skills
- Professional tone

Job Description:
${jd}

Return:
Optimized Resume
ATS Score %
Missing Keywords
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 🔁 RETRY LOGIC
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (text && text.length > 20) {
        return res.json({
          success: true,
          remainingFree: 3 - usageCount[userIP],
          data: text
        });
      }
    } catch (err) {
      console.error(`Gemini attempt ${attempt} failed`);
      if (attempt === 2) {
        return res.json({
          success: true,
          remainingFree: 3 - usageCount[userIP],
          data:
            "⚠️ AI is busy right now. Please wait 20–30 seconds and try again."
        });
      }
    }
  }
});
