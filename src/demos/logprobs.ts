// xai-2MQPbF3ltpxm2C1AI9RAwMXwgjL6IaPmzlV5VbtBUMit4A5J5zoZ60CexcF7VMwet4EKEDFE5DHopONe
import type { GrokCompletionRequest, GrokCompletionResponse } from './logprobs.models'

const API_KEY =
	'xai-2MQPbF3ltpxm2C1AI9RAwMXwgjL6IaPmzlV5VbtBUMit4A5J5zoZ60CexcF7VMwet4EKEDFE5DHopONe'
const API_URL = 'https://api.groq.com/v1/completions'

export async function createGrokCompletion(
	params: GrokCompletionRequest
): Promise<GrokCompletionResponse> {
	const response = await fetch(API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	})

	if (!response.ok) {
		const error = await response.json()
		throw new Error(`Grok API error: ${JSON.stringify(error)}`)
	}

	return response.json()
}

// Example usage:
const completion = await createGrokCompletion({
	model: 'grok-beta',
	prompt: 'Hello, how are you?',
	max_tokens: 100,
	temperature: 0.7
})
