import { api } from './api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const { data } = await api.post<ChatResponse>('/chat', { message, history });
  return data.response;
}
