import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";

export async function GET() {
  try {
    // Get all employee requests: join personne -> employe -> role and filter by employe.statut = 'inactif'
    const employeeRequests = await query(`
      SELECT
        p.id_personne,
        p.nom,
        p.prenom,
        r.libelle AS role,
        e.departement,
        e.statut AS status,
        p.created_at AS date_creation
      FROM personne p
      JOIN employe e ON e.id_personne = p.id_personne
      LEFT JOIN role r ON r.id_role = e.id_role
      WHERE e.statut = 'inactif'
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(employeeRequests);
  } catch (error) {
    console.error('Error fetching employee requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nom, prenom, email, telephone, role, message } = body || {};
    if (!nom || !prenom || !email || !role) {
      return NextResponse.json({ error: 'Nom, prénom, email et rôle requis.' }, { status: 400 });
    }
    // Validation role existant, pas admin
    const roles = await query('SELECT * FROM role WHERE libelle = ?', [role]);
    if (!roles || roles.length === 0 || String(role).toLowerCase()==='admin' || String(role).toLowerCase()==='client') {
      return NextResponse.json({ error: 'Ce rôle n\'est pas autorisé' }, { status: 400 });
    }
    const { id_role } = roles[0];
    // Vérifier unicité email côté personne
    const exists = await query('SELECT id_personne FROM personne WHERE email = ?', [email]);
    if (exists && exists.length > 0) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 400 });
    }
    // Inserer personne
    const { insertId: id_personne } = await query('INSERT INTO personne (nom, prenom, email, telephone, created_at) VALUES (?, ?, ?, ?, NOW())', [nom, prenom, email, telephone || null]);
    // Inserer employe statut inactif (role choisi)
    await query('INSERT INTO employe (id_personne, id_role, statut) VALUES (?, ?, ?)', [id_personne, id_role, 'inactif']);
    // Notification admin
    const admins = await query("SELECT p.id_personne FROM personne p JOIN employe e ON e.id_personne = p.id_personne JOIN role r ON r.id_role = e.id_role WHERE r.libelle = 'admin' LIMIT 1");
    if (admins && admins.length > 0) {
      const adminId = admins[0].id_personne;
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: 'Nouvelle demande d\'employé',
          message: `Demande : ${prenom} ${nom} (${email}, ${telephone || '-'}), rôle : ${role}` + (message ? `\nMessage : ${message}` : ''),
          destinataire_id: adminId,
          type: 'CLIENT_REQUEST',
          meta: { prenom, nom, email, telephone, role, message, id_personne }
        })
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la demande employé', error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la demande." }, { status: 500 });
  }
}

// Add route.ts under api/employe/requests/[id] for handling PUT requests