import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array is required" },
        { status: 400 }
      )
    }

    // Default model is configurable via the OPENAI_MODEL env var (falls back to gpt-5-mini).
    // A model explicitly passed in the request body still takes precedence.
    const model = body.model || process.env.OPENAI_MODEL || "gpt-5-mini"
    const maxTokens = body.max_tokens || 150
    const temperature = body.temperature ?? 0.8

    // The gpt-5 / o-series reasoning models reject the legacy `max_tokens` param and only
    // accept the default temperature, so build the payload accordingly.
    const isReasoningModel = /^(gpt-5|o\d)/.test(model)
    const payload: Record<string, unknown> = {
      model,
      messages: body.messages,
      stream: false,
    }
    if (isReasoningModel) {
      payload.max_completion_tokens = maxTokens
    } else {
      payload.max_tokens = maxTokens
      payload.temperature = temperature
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API Error:", errorData)
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("OpenAI API Error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
