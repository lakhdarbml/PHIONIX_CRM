import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const bodyParsed = body || {};
  const { titre, id_assigner_a, id_createur, id_client, description, statut, priorite, date_echeance, progress } = bodyParsed;
  if (!titre) return NextResponse.json({ error: 'titre is required' }, { status: 400 });
  if (!id_createur) return NextResponse.json({ error: 'id_createur is required' }, { status: 400 });

  // determine creator role to apply validation rules for professional tasks
  const [creator] = await query('SELECT r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_employe = ?', [id_createur]);
  const creatorRole = creator ? String(creator.libelle).toLowerCase() : null;

  // If task is personal (no client), ensure assignee is the creator
  let finalAssigner = id_assigner_a;
  if (!id_client) {
    finalAssigner = id_createur;
  }

  // Decide statut: personal tasks are 'Ouverte'. Professional tasks: if creator is admin/manager then 'Ouverte' else 'PendingValidation' unless statut explicitly provided.
  let finalStatut = statut || null;
  if (!id_client) {
    finalStatut = 'Ouverte';
  } else {
    if (!finalStatut) {
      finalStatut = (creatorRole === 'admin' || creatorRole === 'manager') ? 'Ouverte' : 'PendingValidation';
    }
  }

  const result: any = await query(
    'INSERT INTO task (titre, id_assigner_a, id_createur, id_client, description, statut, priorite, date_echeance, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      titre,
      finalAssigner,
      id_createur,
      id_client || null,
      description || null,
      finalStatut,
      priorite || 'Moyenne',
      date_echeance || null,
      typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : 0,
    ]
  );
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM task WHERE id_task = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_task, titre, id_assigner_a, id_client, description, statut, priorite, date_echeance, progress, user_id, action } = body;

  // Status validation helpers
  const STATUS_TRANSITIONS: Record<string, string[]> = {
    'Ouverte': ['En Cours'],
    'En Cours': ['Terminée'],
    'PendingValidation': ['Ouverte', 'En Cours'],
    'Terminée': [],
    'Annulée': []
  };

  const validateStatusTransition = (currentStatus: string, newStatus: string) => {
    const validNextStates = STATUS_TRANSITIONS[currentStatus] || [];
    return validNextStates.includes(newStatus);
  };
  if (!id_task) return NextResponse.json({ error: 'id_task required' }, { status: 400 });
  if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 });

  // Find the caller's employe row (to get id_employe and role)
  const [caller] = await query('SELECT e.id_employe, r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_personne = ?', [user_id]);
  if (!caller) return NextResponse.json({ error: 'User not found as employe' }, { status: 404 });

  // Load the task to check current assignee
  const [taskRow] = await query('SELECT * FROM task WHERE id_task = ?', [id_task]);
  if (!taskRow) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const callerRole = String(caller.libelle).toLowerCase();
  const callerEmployeId = String(caller.id_employe);
  const taskAssigneeId = String(taskRow.id_assigner_a);
  // If caller requested an action (advance), handle it first and allow admin or assignee
  if (action === 'advance') {
    if (!(['admin', 'manager'].includes(callerRole) || callerEmployeId === taskAssigneeId)) {
      return NextResponse.json({ error: 'Droits insuffisants pour avancer le statut' }, { status: 403 });
    }

    // Define status state machine with allowed transitions
    const STATUS_TRANSITIONS: Record<string, string[]> = {
      'Ouverte': ['En Cours'],
      'En Cours': ['Terminée'],
      'PendingValidation': ['Ouverte', 'En Cours'],
      'Terminée': [],
      'Annulée': []
    };

    // Get valid next states for current status
    const validNextStates = STATUS_TRANSITIONS[taskRow.statut] || [];
    if (validNextStates.length === 0) {
      return NextResponse.json({ error: 'Aucune transition possible depuis ce statut' }, { status: 400 });
    }

    // Move to the next state
    const nextStatut = validNextStates[0]; // Take first valid transition
    await query('UPDATE task SET statut = ?, updated_at = NOW() WHERE id_task = ?', [nextStatut, id_task]);
    const rows = await query('SELECT * FROM task WHERE id_task = ?', [id_task]);
    return NextResponse.json(rows[0] || null);
  }

  // Admins/managers can update everything
  if (['admin', 'manager'].includes(callerRole)) {
    // Validate status transition if status is being updated
    if (statut && statut !== taskRow.statut) {
      if (!validateStatusTransition(taskRow.statut, statut)) {
        return NextResponse.json({ 
          error: `Transition de statut invalide: ${taskRow.statut} → ${statut}. Transitions valides: ${STATUS_TRANSITIONS[taskRow.statut].join(', ')}` 
        }, { status: 400 });
      }
    }

    await query(
      'UPDATE task SET titre = ?, id_assigner_a = ?, id_client = ?, description = ?, statut = ?, priorite = ?, date_echeance = ?, progress = ?, updated_at = NOW() WHERE id_task = ?',
      [
        titre || taskRow.titre, id_assigner_a || taskRow.id_assigner_a, id_client || taskRow.id_client, description || taskRow.description,
        statut || taskRow.statut, priorite || taskRow.priorite, date_echeance || taskRow.date_echeance, typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : taskRow.progress || 0, id_task,
      ]
    );
  } else if (action === 'advance') {
    // Allow assignee to advance status even if not admin/manager (as long as assignee)
    if (callerEmployeId !== taskAssigneeId) {
      return NextResponse.json({ error: 'Droits insuffisants pour avancer le statut' }, { status: 403 });
    }

    // Define simple progression order
    const ORDER = ['Ouverte', 'En Cours', 'Terminée'];
    const currentIndex = ORDER.indexOf(taskRow.statut);
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Statut courant non pris en charge pour avancée' }, { status: 400 });
    }
    if (currentIndex === ORDER.length - 1) {
      return NextResponse.json({ error: 'La tâche est déjà dans le statut final' }, { status: 400 });
    }
    const nextStatut = ORDER[currentIndex + 1];
    await query('UPDATE task SET statut = ?, updated_at = NOW() WHERE id_task = ?', [nextStatut, id_task]);
  } else {
    // Non-admins: only the assignee may update progress
    if (callerEmployeId !== taskAssigneeId) {
      return NextResponse.json({ error: 'Droits insuffisants pour modifier cette tâche' }, { status: 403 });
    }

    // Only update progress (and updated_at)
    if (typeof progress === 'number') {
      const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
      await query('UPDATE task SET progress = ?, updated_at = NOW() WHERE id_task = ?', [safeProgress, id_task]);
    } else {
      return NextResponse.json({ error: 'Seul le champ `progress` peut être modifié par l\'assigné' }, { status: 400 });
    }
  }

  const rows = await query('SELECT * FROM task WHERE id_task = ?', [id_task]);
  return NextResponse.json(rows[0] || null);
}
