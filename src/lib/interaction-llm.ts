import type { Message } from '@/types/messages';
import { generateSummary, buildMessages } from '@/lib/llm';

export async function getNewMessages(interactionId: string): Promise<Message[]> {
  const response = await fetch(`/api/interaction/${interactionId}/messages`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

export async function sendMessagesToLLM(messages: Message[]): Promise<void> {
  if (messages.length === 0) return;

  // Build a concise summary via Gemini (fallback handled in generateSummary)
  const system = "Tu es un assistant CRM. Résume en 1–2 phrases en français les messages suivants, en mettant en évidence l'action principale.";
  const user = messages
    .sort((a, b) => new Date(a.date_envoi).getTime() - new Date(b.date_envoi).getTime())
    .map(m => `#${m.id_message} (${new Date(m.date_envoi).toLocaleString()}): ${m.contenu}`)
    .join('\n');

  const summary = await generateSummary(buildMessages(system, user));
  if (!summary) {
    throw new Error('LLM did not return a summary');
  }

  // After successful processing, update the timestamp for the interaction
  const interactionId = String(messages[0].id_interaction);
  const latestMessage = messages.reduce((latest, current) => {
    return new Date(current.date_envoi) > new Date(latest.date_envoi) ? current : latest;
  }, messages[0]);

  await fetch(`/api/interaction/${interactionId}/timestamp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lastMessageId: latestMessage.id_message,
      lastUpdate: latestMessage.date_envoi
    })
  });
}

export async function processNewMessages(interactionId: string): Promise<void> {
  try {
    // Get new messages
    const newMessages = await getNewMessages(interactionId);
    
    // Process with LLM if there are new messages
    if (newMessages.length > 0) {
      await sendMessagesToLLM(newMessages);
    }
  } catch (error) {
    console.error('Failed to process new messages:', error);
    throw error;
  }
}