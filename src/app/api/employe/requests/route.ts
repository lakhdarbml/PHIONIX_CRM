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

// Add route.ts under api/employe/requests/[id] for handling PUT requests