// Modèle commun pour les tableaux de détail admin (présences, repas, plus tard chambres).
// Garantit un classement identique partout : résidence → étage → chambre → nom → prénom,
// les invitées (sans étage/chambre) étant placées en fin de bloc résidence.

export interface PersonneDetail {
  id: string; // identifiant unique (user_id, ou "invite-XX" pour un invité repas)
  nom: string;
  prenom: string;
  residence?: string; // "12" / "36"
  etage?: string | null;
  chambre?: string | null;
  isInvite: boolean; // true = invitée / invité (placée après les résidentes)
}

export function sortAdminPeople<T extends PersonneDetail>(people: T[]): T[] {
  return [...people].sort((a, b) => {
    const resA = a.residence ?? "";
    const resB = b.residence ?? "";
    if (resA !== resB) return resA.localeCompare(resB, "fr", { numeric: true });

    // Résidentes avant invitées au sein d'une même résidence
    if (a.isInvite !== b.isInvite) return a.isInvite ? 1 : -1;

    if (!a.isInvite) {
      const etA = a.etage ?? "";
      const etB = b.etage ?? "";
      if (etA !== etB) return etA.localeCompare(etB, "fr", { numeric: true });
      const chA = a.chambre ?? "";
      const chB = b.chambre ?? "";
      if (chA !== chB) return chA.localeCompare(chB, "fr", { numeric: true });
    }

    const nomCmp = a.nom.localeCompare(b.nom, "fr");
    if (nomCmp !== 0) return nomCmp;
    return a.prenom.localeCompare(b.prenom, "fr");
  });
}

// Les valeurs BDD des étages/chambres sont codées (ex. "r12_etage4") : on les rend lisibles.
export function formatEtage(etage?: string | null): string | null {
  if (!etage) return null;
  const m = etage.match(/(?:etage|étage|et)[ _-]?(\d+)/i);
  if (m) return `Étage ${m[1]}`;
  if (/^\d+$/.test(etage)) return `Étage ${etage}`;
  return etage;
}

export function formatChambre(chambre?: string | null): string | null {
  if (!chambre) return null;
  // Normalement déjà résolu en libellé (« Grand Palais ») ; si un code brut passe
  // (« grand_palais »), on le rend présentable en secours.
  if (chambre.includes("_")) {
    return chambre
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return chambre;
}

// Libellé compact de rattachement (pour les listes).
export function personneSublabel(p: PersonneDetail): string {
  if (p.isInvite) return `Rés. ${p.residence ?? "?"} · invitée`;
  const parts = [`Rés. ${p.residence ?? "?"}`];
  const et = formatEtage(p.etage);
  if (et) parts.push(et);
  const ch = formatChambre(p.chambre);
  if (ch) parts.push(ch);
  return parts.join(" · ");
}
