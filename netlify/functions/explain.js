exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { treatment, patientName, readingLevel, additionalNotes } = JSON.parse(event.body);

    const levelInstructions = {
      simple: "Use very simple, everyday language a child could understand. Avoid all technical terms. Short sentences. Warm and reassuring tone.",
      standard: "Use clear, plain English suitable for the average adult. Explain any dental terms briefly in brackets when you use them. Friendly and professional tone.",
      detailed: "Use clear language but include more detail about the procedure, what to expect, and why it's being done. Suitable for patients who want to understand fully.",
    };

    const prompt = `You are a friendly dental practice assistant helping patients understand their treatment plan.

Patient name: ${patientName || "the patient"}
Treatment: ${treatment}
${additionalNotes ? `Additional notes from dentist: ${additionalNotes}` : ""}

Writing level: ${levelInstructions[readingLevel] || levelInstructions.standard}

Write a patient-friendly explanation of this treatment plan. Structure it as follows:

**What you're having done**
A clear, simple description of the treatment.

**Why you need this treatment**
Explain the reason in reassuring, non-alarming terms.

**What happens during your appointment**
Step by step what the patient will experience, in plain terms.

**After your appointment**
What to expect afterwards and any aftercare advice.

**Any questions?**
Encourage them to ask the dental team anything they're unsure about.

Keep it warm, reassuring and clear. Do not include any disclaimers or say you are an AI. Write as if from the dental practice directly to the patient.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "API error");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanation: data.content[0].text }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate explanation. Please try again." }),
    };
  }
};
