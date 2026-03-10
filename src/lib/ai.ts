import axios from 'axios'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'minimax/minimax-m2.5'

export async function callAI(
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string
  const model = (import.meta.env.VITE_AI_MODEL as string) || DEFAULT_MODEL

  if (!apiKey) throw new Error('Missing VITE_OPENROUTER_API_KEY')

  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const content = response.data?.choices?.[0]?.message?.content
  if (!content) throw new Error('No response from AI model')
  return content
}
