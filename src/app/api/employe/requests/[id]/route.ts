import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { status, user_id, password } = await request.json();
    if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 });
    // Vérifie le rôle
    const [user] = await query('SELECT r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_personne = ?', [user_id]);
    if (!user || !['admin','manager'].includes(String(user.libelle).toLowerCase())) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }
    // Si activation, password requis
    if (String(status) === 'actif') {
      if (!password || password.length < 8) return NextResponse.json({ error:'Mot de passe requis (min 8 caractères)' },{status:400});
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE employe SET statut = ?, mot_de_passe = ? WHERE id_personne = ?', [status, hash, id]);
    } else {
      await query('UPDATE employe SET statut = ? WHERE id_personne = ?', [status, id]);
    }
    // Retourner employé à jour (hors hash)
    const [updatedEmploye] = await query(
      `SELECT e.id_employe, e.id_personne, e.statut, p.nom, p.prenom FROM employe e JOIN personne p ON p.id_personne = e.id_personne WHERE e.id_personne = ?`, [id]);
    return NextResponse.json(updatedEmploye);
  } catch (error) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { error: 'Failed to update employee status' },
      { status: 500 }
    );
  }
}