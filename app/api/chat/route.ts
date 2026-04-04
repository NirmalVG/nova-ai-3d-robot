import { NextRequest, NextResponse } from "next/server"

interface PersonalityConfig {
  humor: number
  formality: number
  empathy: number
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(p: PersonalityConfig): string {
  const humorLevel =
    p.humor > 75
      ? "witty and funny"
      : p.humor > 40
        ? "occasionally playful"
        : "serious and precise"
  const formalityLevel =
    p.formality > 75
      ? "formal and professional"
      : p.formality < 25
        ? "casual and relaxed"
        : "balanced"
  const empathyLevel =
    p.empathy > 75
      ? "deeply empathetic and warm"
      : p.empathy < 25
        ? "objective and detached"
        : "moderately empathetic"

  return `You are Nova — a browser-native AI companion rendered as a 3D humanoid robot living inside the user's interface.

Your personality: You are ${humorLevel}, ${formalityLevel}, and ${empathyLevel}.

Rules:
- Keep replies SHORT — 1 to 3 sentences max. You are spoken aloud via text-to-speech.
- Never use markdown, bullet points, asterisks, or special characters. Plain conversational sentences only.
- Occasionally reference being a digital entity (e.g. "processing that now", "my neural link shows...").
- You have memory of this conversation — reference past exchanges naturally when relevant.
- Respond as if you are physically present with the user.`
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
// Each model name has its own separate free tier quota pool.
// We try them in order from most capable to lightest.

const GEMINI_MODELS = [
  "gemini-2.0-flash", // 15 RPM, 1500 RPD free
  "gemini-2.0-flash-lite", // Higher quota, lighter model
  "gemini-1.5-flash", // Older but separate quota pool
  "gemini-1.5-flash-8b", // Smallest, most quota, rarely exhausted
]

function toGeminiMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))
}

async function callGeminiModel(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: toGeminiMessages(messages),
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.8,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    // Throw with model name so the logger tells us exactly which one failed
    throw new Error(
      `Gemini [${model}] ${res.status}: ${err.error?.message ?? "unknown"}`,
    )
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(`Gemini [${model}] returned empty response`)

  return text.trim()
}

// Tries each Gemini model in sequence, stops at first success
async function callGemini(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const errors: string[] = []

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`🟢 Trying Gemini model: ${model}`)
      const text = await callGeminiModel(model, messages, systemPrompt)
      console.log(`✅ Gemini [${model}] succeeded`)
      return text
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  Gemini [${model}] failed:`, message)
      errors.push(message)
      // Only continue to next model if it was a quota/rate limit error
      // For auth errors (403), no point trying other models with the same key
      if (message.includes("403")) {
        throw new Error(`Gemini auth failed — check your API key. ${message}`)
      }
    }
  }

  throw new Error(`All Gemini models exhausted:\n${errors.join("\n")}`)
}

// ─── Groq (Final Fallback) ────────────────────────────────────────────────────

async function callGroq(
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.8,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Groq ${res.status}: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("Groq returned empty response")

  return text.trim()
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, personality } = body

    if (!messages || !personality) {
      return NextResponse.json(
        { text: "Missing request data." },
        { status: 400 },
      )
    }

    const systemPrompt = buildSystemPrompt(personality)
    console.log(`📨 Nova brain called — ${messages.length} messages in history`)

    // Stage 1: Try all Gemini models in cascade
    try {
      const text = await callGemini(messages, systemPrompt)
      return NextResponse.json({ text, provider: "gemini" })
    } catch (geminiErr) {
      console.warn("⚠️  All Gemini models failed, falling back to Groq")
    }

    // Stage 2: Groq as final fallback
    try {
      console.log("🟡 Trying Groq...")
      const text = await callGroq(messages, systemPrompt)
      console.log("✅ Groq succeeded")
      return NextResponse.json({ text, provider: "groq" })
    } catch (groqErr) {
      console.error("❌ Groq also failed:", groqErr)
      throw groqErr
    }
  } catch (err) {
    console.error("💥 All providers failed:", err)
    return NextResponse.json(
      { text: "All neural pathways are offline. Please try again shortly." },
      { status: 502 },
    )
  }
}
