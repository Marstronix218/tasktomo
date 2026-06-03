export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content: string
    }
  }>
  error?: string
}

export async function callOpenAI(
  messages: ChatMessage[],
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  try {
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        // Only forward a model when the caller explicitly asks for one; otherwise let the
        // server route apply the OPENAI_MODEL env default.
        ...(options.model ? { model: options.model } : {}),
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.8,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`API request failed: ${response.status}`)
    }

    const data: OpenAIResponse = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }

    return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    throw error
  }
}

// Helper function for character-specific prompts
export function createCharacterPrompt(
  characterPrompt: string,
  username: string,
  taskContext?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${characterPrompt}\n\nThe user's name is "${username}". You can use their name in conversation when appropriate.`,
    }
  ]

  if (taskContext) {
    messages.push({
      role: 'system',
      content: taskContext
    })
  }

  return messages
}

// Helper function for task completion messages
export function createTaskCompletionPrompt(
  character: any,
  task: any,
  username: string
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `${character.prompt}\n\nThe user's name is "${username}". You are celebrating their task completion.`,
    },
    {
      role: 'user',
      content: `I just completed the task: "${task.text}" (${task.category}, ${task.difficulty} difficulty). Please give me a brief, encouraging response celebrating this achievement!`
    }
  ]
} 