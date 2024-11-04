export interface GrokCompletionRequest {
	best_of?: number
	echo?: boolean
	frequency_penalty?: number
	logit_bias?: Record<string, number>
	logprobs?: boolean | null
	max_tokens?: number
	model: string
	n?: number
	presence_penalty?: number
	prompt: string | null
	seed?: number
	stop?: string | string[]
	stream?: boolean
	stream_options?: any
	suffix?: string
	temperature?: number
	top_p?: number
	user?: string
}

export interface GrokCompletionResponse {
	id: string
	object: string
	created: number
	model: string
	choices: {
		text: string
		index: number
		logprobs: null | {
			tokens: string[]
			token_logprobs: number[]
			top_logprobs: Record<string, number>[]
			text_offset: number[]
		}
		finish_reason: string
	}[]
	usage: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
}

export interface LogProbsCompletion {
	id: string
	tokens: string[]
	token_logprobs: number[]
	top_logprobs: Record<string, number>[]
	text_offset: number[]
	branches: Record<number, string>[] // when you branch
}
