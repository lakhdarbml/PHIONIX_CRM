import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { status } = await request.json();

    // Update employee status
    await query(
      'UPDATE Personne SET status = ? WHERE id_personne = ?',
      [status, id]
    );

    // Get updated employee data
    const [updatedEmployee] = await query(
      `SELECT 
        id_personne,
        nom,
        prenom,
        role,
        departement,
        status,
        date_creation
      FROM Personne 
      WHERE id_personne = ?`,
      [id]
    );

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { error: 'Failed to update employee status' },
      { status: 500 }
    );
  }
}