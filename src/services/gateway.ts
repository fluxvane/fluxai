import { createHttp } from './http';

const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const http = createHttp(base);

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: ChatMessage;
		finish_reason: string;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export async function chatCompletions(messages: ChatMessage[], model = 'gpt-4', stream = false) {
	const res = await http.post<ChatCompletionResponse>('/api/v1/proxy/chat/completions', { model, messages, stream });
	return res.data;
}
