import { NextResponse } from "next/server";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Route API GET /api/options
 * 
 * Cette route sert à récupérer dynamiquement les options hiérarchiques (catégories, sous-catégories, etc.)
 * depuis la table `select_options` dans Supabase.
 * 
 * Elle est utilisée par le composant <DynamicSelectGroup /> pour construire des menus déroulants dépendants.
 */

export async function GET(request: Request) {
    // Création du client Supabase côté serveur, en utilisant les cookies de l'utilisateur connecté
    const supabase = createServerComponentClient({ cookies });

    // Extraction des paramètres d'URL
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("category");  // Exemple : "evenement", "repas", "residence"
    console.log('type envoyé : ', type)
    const parentId = searchParams.get("parentId"); // Exemple : "12" → ID du parent pour récupérer ses enfants

    // Préparation de la requête de base
    // On sélectionne toutes les colonnes de la table "select_options"
    // et on trie les résultats par label (ordre alphabétique)
    let query = supabase.from("select_options").select("*").order("label");

    // Application des filtres selon les paramètres reçus
    if (parentId) {
        // Si on a un parentId, on récupère les enfants directs de cet élément
        query = query.eq("parent_id", parentId);
    } 
    else if (type) {
        // Sinon, si on a un type (category), on récupère les éléments racine de cette catégorie
        // (donc ceux dont parent_id est NULL)
        query = query.eq("category", type).is("parent_id", null);
    } 
    else {
        // Fallback : si aucun paramètre, on retourne tous les éléments racine (sans parent)
        query = query.is("parent_id", null);
    }

    // Exécution de la requête
    const { data, error } = await query;

    // Gestion des erreurs
    if (error) {
        // Si une erreur Supabase est renvoyée, on la renvoie au client avec un code HTTP 400
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Réponse réussie : on renvoie les options trouvées au format JSON
    return NextResponse.json(data);
}
