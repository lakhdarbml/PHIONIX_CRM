import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { emitNotification } from '@/lib/notify';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const body = await request.json();
    const { etape, user_id, restaurer } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID opportunité requis' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 });
    }

    // Vérifier les droits (admin, manager, ou sales propriétaire) et récupérer les infos utilisateur
    const userRoles = await query<any[]>(
      'SELECT r.libelle, e.id_employe, p.nom, p.prenom FROM employe e JOIN role r ON r.id_role = e.id_role JOIN personne p ON p.id_personne = e.id_personne WHERE e.id_personne = ?',
      [user_id]
    );

    if (!userRoles || (Array.isArray(userRoles) && userRoles.length === 0)) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userRole = Array.isArray(userRoles) ? userRoles[0] : userRoles;
    if (!userRole || !userRole.libelle) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const role = String(userRole.libelle).toLowerCase();
    const userEmployeId = userRole.id_employe;
    const userName = `${userRole.prenom || ''} ${userRole.nom || ''}`.trim() || `User ${user_id}`;

    // Vérifier que l'opportunité existe et qui est le propriétaire
    const opportunities = await query<any[]>(
      'SELECT * FROM opportunite WHERE id_opportunite = ?',
      [id]
    );

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ error: 'Opportunité non trouvée' }, { status: 404 });
    }

    const opp = Array.isArray(opportunities) ? opportunities[0] : opportunities;

    // Seuls admin/manager peuvent arrêter n'importe quelle opportunité
    // Les sales peuvent arrêter uniquement leurs propres opportunités
    if (role !== 'admin' && role !== 'manager') {
      if (role === 'sales' && opp.id_employe !== userEmployeId) {
        return NextResponse.json({ error: 'Vous ne pouvez arrêter que vos propres opportunités' }, { status: 403 });
      }
      if (role !== 'sales') {
        return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
      }
    }

    // Si restauration, récupérer l'ancienne étape depuis les métadonnées ou utiliser une étape par défaut
    let newEtape: string;
    let oldEtape = opp.etape;
    
    if (restaurer) {
      // Pour la restauration, on remet l'opportunité à son étape précédente ou à 'Prospection' par défaut
      // On pourrait stocker l'ancienne étape dans une colonne ou table d'audit
      // Pour l'instant, on remet à 'Prospection' ou on utilise l'étape fournie
      newEtape = etape || 'Prospection';
      
      // Log de restauration
      console.log(`[AUDIT] Opportunité ${id} (${opp.titre}) restaurée de "${oldEtape}" vers "${newEtape}" par user ${user_id} - Date: ${new Date().toISOString()}`);
    } else {
      newEtape = etape || 'Arrêtée';
    }
    
    await query(
      'UPDATE opportunite SET etape = ?, updated_at = NOW() WHERE id_opportunite = ?',
      [newEtape, id]
    );

    // Garder une trace (audit log) si l'opportunité est arrêtée
    if (newEtape === 'Arrêtée') {
      try {
        // Log d'audit dans la console (traçabilité)
        console.log(`[AUDIT] Opportunité ${id} (${opp.titre}) arrêtée par ${userName} (${user_id}, ${role}) - Étape précédente: ${oldEtape} - Date: ${new Date().toISOString()}`);
        
        // Optionnel: créer une table d'audit si elle n'existe pas
        // await query(`
        //   CREATE TABLE IF NOT EXISTS opportunite_audit (
        //     id_audit INT AUTO_INCREMENT PRIMARY KEY,
        //     id_opportunite INT NOT NULL,
        //     action VARCHAR(50) NOT NULL,
        //     ancienne_etape VARCHAR(50),
        //     nouvelle_etape VARCHAR(50),
        //     id_utilisateur INT NOT NULL,
        //     date_action DATETIME DEFAULT CURRENT_TIMESTAMP,
        //     details TEXT
        //   )
        // `);
        
        // await query(
        //   'INSERT INTO opportunite_audit (id_opportunite, action, ancienne_etape, nouvelle_etape, id_utilisateur, details) VALUES (?, ?, ?, ?, ?, ?)',
        //   [id, 'ARRET', oldEtape, newEtape, user_id, JSON.stringify({ titre: opp.titre, raison: 'Arrêtée par utilisateur' })]
        // );
      } catch (auditError) {
        console.error('Erreur lors de l\'audit:', auditError);
        // Ne pas bloquer la requête si l'audit échoue
      }

      // Envoyer une notification à tous les admins
      try {
        // Trouver tous les admins
        const admins = await query<any[]>(
          `SELECT p.id_personne, p.nom, p.prenom, p.email 
           FROM personne p
           JOIN employe e ON e.id_personne = p.id_personne
           JOIN role r ON e.id_role = r.id_role
           WHERE r.libelle = ?`,
          ['admin']
        );

        const adminList = Array.isArray(admins) ? admins : (admins ? [admins] : []);
        
        // Créer une notification pour chaque admin
        for (const admin of adminList) {
          const adminId = admin.id_personne || admin;
          const adminName = `${admin.prenom || ''} ${admin.nom || ''}`.trim() || `Admin ${adminId}`;
          
          const titre = 'Opportunité arrêtée';
          const message = `L'opportunité "${opp.titre}" (ID: ${id}) a été arrêtée par ${userName} (${role}). Étape précédente: ${oldEtape || 'N/A'}`;
          
          try {
            const res: any = await query(
              'INSERT INTO notification (titre, message, destinataire_id, type_notification, priority, meta) VALUES (?, ?, ?, ?, ?, ?)',
              [
                titre,
                message,
                adminId,
                'OPPORTUNITY',
                'high',
                JSON.stringify({ 
                  id_opportunite: id,
                  titre: opp.titre,
                  ancienne_etape: oldEtape,
                  nouvelle_etape: newEtape,
                  id_utilisateur: user_id,
                  action: 'ARRET'
                })
              ]
            );
            
            // Récupérer la notification créée pour l'émettre via socket
            const [createdNotif] = await query<any[]>(
              'SELECT * FROM notification WHERE id_notification = ?',
              [res.insertId]
            );
            
            if (createdNotif) {
              emitNotification(createdNotif);
            }
          } catch (notifError) {
            console.error(`Erreur lors de l'envoi de la notification à l'admin ${adminId}:`, notifError);
            // Continuer même si une notification échoue
          }
        }
      } catch (notificationError) {
        console.error('Erreur lors de la notification aux admins:', notificationError);
        // Ne pas bloquer la requête si les notifications échouent
      }
    }

    // Récupérer l'opportunité mise à jour
    const updated = await query<any[]>(
      'SELECT * FROM opportunite WHERE id_opportunite = ?',
      [id]
    );

    const updatedOpp = Array.isArray(updated) ? updated[0] : updated;
    return NextResponse.json(updatedOpp || null);
  } catch (error: any) {
    console.error('Erreur mise à jour opportunité:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour de l\'opportunité' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const body = await request.json().catch(() => ({}));
    const { user_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID opportunité requis' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur est admin ou manager
    const userRoles = await query<any[]>(
      'SELECT r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_personne = ?',
      [user_id]
    );

    if (!userRoles || (Array.isArray(userRoles) && userRoles.length === 0)) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userRole = Array.isArray(userRoles) ? userRoles[0] : userRoles;
    const role = String(userRole.libelle).toLowerCase();

    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Seuls les admins et managers peuvent supprimer des opportunités' }, { status: 403 });
    }

    // Vérifier que l'opportunité existe
    const opportunities = await query<any[]>(
      'SELECT * FROM opportunite WHERE id_opportunite = ?',
      [id]
    );

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({ error: 'Opportunité non trouvée' }, { status: 404 });
    }

    const opp = Array.isArray(opportunities) ? opportunities[0] : opportunities;

    // Log d'audit avant suppression
    console.log(`[AUDIT] Opportunité ${id} (${opp.titre}) supprimée définitivement par user ${user_id} (${role}) - Date: ${new Date().toISOString()}`);

    // Supprimer l'opportunité
    await query('DELETE FROM opportunite WHERE id_opportunite = ?', [id]);

    return NextResponse.json({ success: true, message: 'Opportunité supprimée définitivement' });
  } catch (error: any) {
    console.error('Erreur suppression opportunité:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression de l\'opportunité' },
      { status: 500 }
    );
  }
}

