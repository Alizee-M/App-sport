import type { ResultatSeance } from '../etat/magasin';

/** Écrans de la pile principale et paramètres attendus par chacun. */
export type ParamsPile = {
  Onglets: undefined;
  Tirage: { noeudId?: string } | undefined;
  Seance: undefined;
  Bilan: { resultat: ResultatSeance; titre: string };
  // Le bilan d'un défi reste dans l'écran du défi : on veut pouvoir
  // relancer l'épreuve immédiatement après avoir vu son score.
  Defi: { defiId: string };
};

export type ParamsOnglets = {
  Camp: undefined;
  Aventure: undefined;
  Defis: undefined;
  Journal: undefined;
};
