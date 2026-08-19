// Un étage d'un bloc « résidence ». Liste de référence : la table `etages`.
//
// `value` est la clé technique déjà stockée dans `places.etage` et dans le ciblage
// (`visibilite.etage`) — souvent un code hérité comme « r12_etage4 ». Elle ne bouge
// jamais. `label` est le nom affiché, librement modifiable.
export interface Etage {
  id: string;
  residence: string;
  value: string;
  label: string;
  ordre: number;
}

// Étage enrichi du nombre de chambres qu'il contient (renvoyé par l'API admin).
export interface EtageWithCount extends Etage {
  nb_places: number;
}
