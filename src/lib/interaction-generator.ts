import { query } from '@/lib/mysql';
import { generateSummary, buildMessages } from '@/lib/llm';
import { updateLastInteractionTime } from '@/lib/interaction-timestamps';
import { logger } from '@/lib/logger';

type InteractionInput = {
  id_employe: number | string;
  id_client: number | string;
  resultat: string;
  id_type?: number | string | null; // defaults to Note (id_type = 4 if exists)
  date_interaction?: Date | string;
};

async function resolveTypeId(fallbackLabel: string = 'Note'): Promise<number | null> {
  try {
    const rows = await query<any[]>(
      'SELECT id_type FROM type_interaction WHERE LOWER(libelle) = LOWER(?) LIMIT 1',
      [fallbackLabel]
    );
    if (rows && rows[0] && rows[0].id_type) return Number(rows[0].id_type);
  } catch (err) {
    logger.warn('interaction.type', 'Failed to resolve type by label', { fallbackLabel, err });
  }
  try {
    const [first] = await query<any[]>('SELECT id_type FROM type_interaction ORDER BY id_type ASC LIMIT 1');
    if (first?.id_type) return Number(first.id_type);
  } catch (err) {
    logger.warn('interaction.type', 'Failed to resolve fallback type', err);
  }
  return null;
}

export async function insertInteraction(input: InteractionInput): Promise<number | null> {
  logger.debug('interaction.insert', 'Preparing to insert interaction', input);
  try {
    const typeId = input.id_type != null ? Number(input.id_type) : (await resolveTypeId('Note'));
    const res: any = await query(
      'INSERT INTO interaction (id_employe, id_client, id_type, resultat, date_interaction) VALUES (?, ?, ?, ?, ?)',
      [input.id_employe, input.id_client, typeId, input.resultat || null, input.date_interaction || new Date()]
    );
    const insertId = res?.insertId != null ? Number(res.insertId) : null;
    logger.info('interaction.insert', 'Inserted interaction', { insertId, id_employe: input.id_employe, id_client: input.id_client, typeId });
    return insertId;
  } catch (error) {
    logger.error('interaction.insert', 'Failed to insert interaction', { error, input });
    return null;
  }
}

export async function generateFromTask(taskId: number | string) {
  logger.info('interaction.task', 'Generating from task', { taskId });
  // Compose a short, informative summary for the interaction
  const [task] = await query<any[]>('SELECT * FROM task WHERE id_task = ?', [taskId]);
  if (!task) return;
  const titre = task.titre || `Tâche ${taskId}`;
  const statut = task.statut;
  const priorite = task.priorite;
  const resLines: string[] = [];
  resLines.push(`Tâche: ${titre}`);
  resLines.push(`Statut: ${statut} | Priorité: ${priorite}`);
  if (task.description) resLines.push(`Description: ${task.description}`);
  if (task.date_echeance) resLines.push(`Échéance: ${new Date(task.date_echeance).toLocaleString()}`);
  // Essayer un résumé LLM (fallback sur résumé statique)
  const system = "Tu es un assistant CRM. Résume brièvement une tâche pour un journal d'interaction en 1–3 phrases, en français, sans fioritures.";
  const userText = resLines.join('\n');
  const llm = await generateSummary(buildMessages(system, userText));
  const resultat = llm || resLines.join(' \\n ');

  // If professional task, link client; personal tasks may not have client
  const id_client = task.id_client ?? null;
  const id_employe = task.id_assigner_a ?? task.id_createur;
  if (!id_client || !id_employe) return;
  const interactionId = await insertInteraction({ id_employe, id_client, resultat });
  if (interactionId != null) {
    try { updateLastInteractionTime(String(interactionId), 0); logger.debug('interaction.task', 'Updated last interaction time', { interactionId }); } catch (e) { logger.warn('interaction.task', 'Failed to update last interaction time', e); }
  }
}

export async function generateFromOpportunity(opportunityId: number | string, action: 'create' | 'update' = 'update') {
  logger.info('interaction.opp', 'Generating from opportunity', { opportunityId, action });
  const [opp] = await query<any[]>('SELECT * FROM opportunite WHERE id_opportunite = ?', [opportunityId]);
  if (!opp) return;
  const titre = opp.titre || `Opportunité ${opportunityId}`;
  const etape = opp.etape || 'N/A';
  const valeur = opp.valeur != null ? String(opp.valeur) : 'N/A';
  const base = action === 'create'
    ? `Nouvelle opportunité créée: ${titre} • Étape: ${etape} • Valeur: ${valeur}`
    : `Opportunité mise à jour: ${titre} • Nouvelle étape: ${etape} • Valeur: ${valeur}`;
  const oppSystem = "Tu es un assistant CRM. Résume en 1 phrase l'événement d'opportunité pour le journal des interactions, en français.";
  const oppLLM = await generateSummary(buildMessages(oppSystem, base));
  const resultat = oppLLM || base;
  const id_client = opp.id_client;
  const id_employe = opp.id_employe;
  if (!id_client || !id_employe) return;
  const interactionId = await insertInteraction({ id_employe, id_client, resultat });
  if (interactionId != null) {
    try { updateLastInteractionTime(String(interactionId), 0); logger.debug('interaction.opp', 'Updated last interaction time', { interactionId }); } catch (e) { logger.warn('interaction.opp', 'Failed to update last interaction time', e); }
  }
}

export async function generateFromConversationMessages(conversationId: number | string, lastMinutes: number = 30) {
  logger.info('interaction.conv', 'Generating from conversation messages', { conversationId, lastMinutes });
  // Gather recent messages within time window and combine
  const rows = await query<any[]>(
    'SELECT m.*, p.prenom, p.nom FROM message m JOIN personne p ON p.id_personne = m.id_emetteur WHERE m.id_conversation = ? AND m.date_envoi >= (NOW() - INTERVAL ? MINUTE) ORDER BY m.date_envoi ASC',
    [conversationId, Math.max(5, lastMinutes)]
  );
  if (!rows || rows.length === 0) { logger.info('interaction.conv', 'No recent messages found, skipping', { conversationId }); return; }

  // Resolve client and employe for the conversation
  const parts = await query<any[]>(
    'SELECT pa.id_personne, pa.type_participant FROM participant pa WHERE pa.id_conversation = ?',
    [conversationId]
  );
  if (!parts) { logger.warn('interaction.conv', 'No participants found, skipping', { conversationId }); return; }
  const clientPart = parts.find(p => String(p.type_participant).toLowerCase() === 'client');
  if (!clientPart) { logger.warn('interaction.conv', 'No client participant found, skipping', { conversationId }); return; }
  const [clientRow] = await query<any[]>(
    'SELECT id_client FROM client WHERE id_personne = ? LIMIT 1',
    [clientPart.id_personne]
  );
  const id_client = clientRow?.id_client;
  if (!id_client) { logger.warn('interaction.conv', 'Could not resolve client id, skipping', { conversationId }); return; }

  // Prefer first employee sender or any employee participant for id_employe
  let id_employe: number | null = null;
  for (const m of rows) {
    const [emp] = await query<any[]>(
      'SELECT id_employe FROM employe WHERE id_personne = ? LIMIT 1',
      [m.id_emetteur]
    );
    if (emp?.id_employe) { id_employe = Number(emp.id_employe); break; }
  }
  if (!id_employe) {
    const empPart = parts.find(p => String(p.type_participant).toLowerCase() === 'employe');
    if (empPart) {
      const [emp] = await query<any[]>(
        'SELECT id_employe FROM employe WHERE id_personne = ? LIMIT 1',
        [empPart.id_personne]
      );
      if (emp?.id_employe) id_employe = Number(emp.id_employe);
    }
  }
  if (!id_employe) { logger.warn('interaction.conv', 'Could not resolve employe id, skipping', { conversationId }); return; }

  const lines = rows.map(m => {
    const name = [m.prenom, m.nom].filter(Boolean).join(' ').trim() || `User ${m.id_emetteur}`;
    return `${name}: ${m.contenu}`;
  });
  const combined = `Conversation ${conversationId}:\n` + lines.join('\n');
  const msgSystem = "Tu es un assistant CRM. Fais un court résumé en français des messages ci-dessous (1–2 phrases) en mettant en évidence les points d'action éventuels.";
  const msgLLM = await generateSummary(buildMessages(msgSystem, combined));
  const resultat = msgLLM || (`Messages récents (conv ${conversationId}):\\n` + lines.join(' \\n '));

  const lastMessageId = rows[rows.length - 1]?.id_message ? Number(rows[rows.length - 1].id_message) : 0;
  const interactionId = await insertInteraction({ id_employe, id_client, resultat, id_type: await resolveTypeId('Email') });
  if (interactionId != null) {
    try { updateLastInteractionTime(String(interactionId), lastMessageId); logger.debug('interaction.conv', 'Updated last interaction time', { interactionId, lastMessageId }); } catch (e) { logger.warn('interaction.conv', 'Failed to update last interaction time', e); }
  }
}


