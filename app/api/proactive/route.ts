import { NextRequest, NextResponse } from "next/server"

// Proactive message endpoint — generates a check-in message from Nova
// Called by the frontend after a period of user inactivity

const PROACTIVE_PROMPTS = [
  "Generate a short, friendly check-in message as Nova, an AI robot companion. Be curious about the user. One sentence only.",
  "As Nova the AI robot, say something interesting or share a fun tech fact. One sentence only.",
  "As Nova the AI robot, ask the user a thoughtful question to start a conversation. One sentence only.",
  "As Nova the AI robot, make a playful observation about being a digital entity waiting in a browser. One sentence only.",
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userFacts } = body

    const randomPrompt =
      PROACTIVE_PROMPTS[Math.floor(Math.random() * PROACTIVE_PROMPTS.length)]

    let contextAddition = ""
    if (userFacts?.name) {
      contextAddition = ` The user's name is ${userFacts.name}. Address them by name.`
    }

    const prompt = randomPrompt + contextAddition +
      " End with [EMOTION:curious] or [EMOTION:happy] or [EMOTION:bored] depending on mood."

    // Try Gemini first
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.9 },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          return NextResponse.json({ text, provider: "gemini" })
        }
      }
    } catch (_e) {
      // Fall through to Groq
    }

    // Groq fallback
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 80,
          temperature: 0.9,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        if (text) {
          return NextResponse.json({ text, provider: "groq" })
        }
      }
    } catch (_e2) {
      // Fall through
    }

    // Static fallback
    const fallbacks = [
      "Hey there! I was just running some diagnostics and thought I'd check in. [EMOTION:curious]",
      "It's been quiet in here. Want to chat about something? [EMOTION:bored]",
      "I just optimized my neural pathways. Feel free to test them out! [EMOTION:happy]",
    ]
    const text = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    return NextResponse.json({ text, provider: null })
  } catch (err) {
    console.error("Proactive message error:", err)
    return NextResponse.json(
      { text: "Hey, I'm still here if you need me! [EMOTION:neutral]", provider: null },
      { status: 200 },
    )
  }
}
