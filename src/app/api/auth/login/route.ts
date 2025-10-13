import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

// POST /api/auth/login { email, password }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    // Find personne by email
    const personnes: any = await query('SELECT * FROM Personne WHERE email = ?', [email]);
    if (!personnes || (personnes as any[]).length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const personne = (personnes as any[])[0];

    // Try employe and check mot_de_passe
    const employes: any = await query('SELECT * FROM Employe WHERE id_personne = ?', [personne.id_personne]);
    if (employes && (employes as any[]).length > 0) {
      const employe = (employes as any[])[0];
      const stored = employe.mot_de_passe || '';
      // NOTE: passwords are stored in plain text in seed for demo; compare directly
      if (String(stored) !== String(password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const roles: any = await query('SELECT * FROM Role WHERE id_role = ?', [employe.id_role]);
      const role = (roles && (roles as any[]).length > 0) ? roles[0] : null;

      return NextResponse.json({
        uid: String(employe.id_employe),
        personneId: String(personne.id_personne),
        email: personne.email,
        displayName: `${personne.prenom} ${personne.nom}`,
        photoURL: null,
        role: role ? role.libelle : 'client'
      });
    }

    // For clients we do not support password login in this demo
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (e) {
    console.error('Login error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
