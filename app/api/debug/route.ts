import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    groqKeyPresent: !!process.env.GROQ_API_KEY,
    geminiKeyPrefix: process.env.GEMINI_API_KEY?.slice(0, 8) ?? "MISSING",
    groqKeyPrefix: process.env.GROQ_API_KEY?.slice(0, 8) ?? "MISSING",
  })
}
