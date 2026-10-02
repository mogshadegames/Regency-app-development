export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const { text, prompt, stage, keywords } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "There is nothing to Flourish yet." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "Flourish needs its Vercel API key before it can run." });
  const instructions = [
    "You are the Flourish copy-editor for Regency: The Season.",
    "Gently clean dictated journal prose.",
    "Correct punctuation, capitalization, grammar, obvious repetitions and highly likely speech-recognition errors.",
    "Use the prompt context to resolve obvious homophones or mistranscriptions, such as bowl/ball when the context is a ballroom.",
    "Preserve the player's meaning, events, point of view, vocabulary, tone and level of detail.",
    "Do not add events, descriptions, emotions, Regency-style language, metaphors, dialogue or ideas the player did not provide.",
    "Do not make the writing grander or more literary.",
    "Return only the cleaned journal text."
  ].join(" ");
  const context = "Prompt: "+(prompt||"")+". Stage: "+(stage||"")+". Keywords: "+(Array.isArray(keywords)?keywords.join(", "):"")+".\n\nPlayer text:\n"+text;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer "+process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: "gpt-6-luna", instructions, input: context, max_output_tokens: 600 })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "Flourish could not complete this pass." });
    const output = (data.output || []).flatMap(item => item.content || []).find(part => part.type === "output_text");
    if (!output || !output.text) return res.status(502).json({ error: "Flourish returned no text." });
    return res.status(200).json({ text: output.text.trim() });
  } catch {
    return res.status(500).json({ error: "Flourish could not connect." });
  }
}
