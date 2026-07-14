import { type NextRequest, NextResponse } from "next/server"

// When BUTTERBASE_API_KEY is set, chat goes through the Butterbase AI gateway
// (OpenAI-compatible, uses Butterbase credits). Otherwise it falls back to OpenAI direct.
const BUTTERBASE_URL = "https://api.butterbase.ai/v1/chat/completions"
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"

export async function POST(request: NextRequest) {
  try {
    const butterbaseKey = process.env.BUTTERBASE_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!butterbaseKey && !openaiKey) {
      console.error("No AI provider key configured")
      return NextResponse.json(
        { error: "No AI provider configured. Add BUTTERBASE_API_KEY or OPENAI_API_KEY to your environment variables." },
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

    // Default model is configurable via the OPENAI_MODEL env var (falls back to gpt-4.1-nano,
    // a fast non-reasoning chat model). A model explicitly passed in the request body still
    // takes precedence.
    let model = body.model || process.env.OPENAI_MODEL || "gpt-4.1-nano"
    const maxTokens = body.max_tokens || 150
    const temperature = body.temperature ?? 0.8

    // Butterbase model IDs are provider-prefixed (e.g. "openai/gpt-4.1-nano",
    // "anthropic/claude-haiku-4.5"). Bare OpenAI names get the prefix added; an ID that
    // already contains a "/" is passed through untouched.
    if (butterbaseKey && !model.includes("/")) {
      model = `openai/${model}`
    }

    // The gpt-5 / o-series reasoning models reject the legacy `max_tokens` param and only
    // accept the default temperature, so build the payload accordingly. (Match against the
    // bare model name so the provider prefix doesn't hide it.)
    const bareModel = model.split("/").pop() || model
    const isReasoningModel = /^(gpt-5|o\d)/.test(bareModel)
    const payload: Record<string, unknown> = {
      model,
      messages: body.messages,
      stream: false,
    }
    if (isReasoningModel) {
      // Reasoning models spend tokens on hidden reasoning that counts against
      // max_completion_tokens. A small budget (e.g. 150) gets fully consumed by reasoning,
      // leaving the visible content empty. Add generous headroom so a personality-rich
      // reply actually fits, and keep reasoning short.
      payload.max_completion_tokens = maxTokens + 1200
      payload.reasoning_effort = "low"
    } else {
      payload.max_tokens = maxTokens
      payload.temperature = temperature
    }

    const url = butterbaseKey ? BUTTERBASE_URL : OPENAI_URL
    const apiKey = butterbaseKey || openaiKey

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("AI gateway error:", errorData)
      return NextResponse.json(
        { error: `AI gateway error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("AI gateway error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
