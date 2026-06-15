const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { treatment, patientName, readingLevel, additionalNotes, language = "English" } = JSON.parse(event.body);

    if (!treatment) {
      return { statusCode: 400, body: JSON.stringify({ error: "Treatment is required" }) };
    }

    const levelInstructions = {
      simple:   "Use very simple, everyday language. Short sentences. Avoid all medical jargon. Imagine explaining to someone who finds reading difficult.",
      standard: "Use clear, friendly language that most adults can understand. Explain any medical terms briefly when you use them.",
      detailed: "Use thorough, informative language. Include more clinical detail. The patient wants to fully understand their treatment.",
    };

    const languageInstruction = language !== "English"
      ? `IMPORTANT: Write the entire explanation in ${language}. Do not use English at all in the explanation body.`
      : "";

    const nameIntro = patientName ? `This explanation is for a patient named ${patientName}.` : "";
    const notesSection = additionalNotes ? `Additional instructions: ${additionalNotes}` : "";

    const prompt = `You are a friendly dental practice assistant. Write a clear, reassuring patient explanation for the following dental treatment.

${nameIntro}
Treatment: ${treatment}
Reading level: ${levelInstructions[readingLevel] || levelInstructions.standard}
${notesSection}
${languageInstruction}

Structure the explanation with these sections using markdown ## headings:
- What is this treatment?
- Why do you need it?
- What will happen during the treatment?
- What to expect afterwards?
- Any important things to remember?

Keep it warm, reassuring and professional. Do not include any pricing information.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const explanation = message.content[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanation }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Something went wrong" }),
    };
  }
};
