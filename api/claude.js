// שרת קטן שמדבר עם Claude. המפתח נשמר ב-Vercel (ANTHROPIC_API_KEY) ולא נחשף לגולשים.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "missing_key" });

  const { prompt, mode } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 15000) {
    return res.status(400).json({ error: "bad_request" });
  }

  // שאלות השאלון: מודל מהיר וזול. הפרומפט הסופי: מודל חזק יותר.
  const quick = mode === "quick";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: quick ? "claude-haiku-5-5" : "claude-sonnet-5-5",
        max_tokens: quick ? 800 : 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Anthropic error", r.status, JSON.stringify(data));
      return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? "rate_limited" : "api_error" });
    }
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "api_error" });
  }
}
