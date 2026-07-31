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
  Recompenses: undefined;
  Competences: undefined;
};

export type ParamsOnglets = {
  Camp: undefined;
  Aventure: undefined;
  /**
   * Onglet purement décoratif : il n'affiche rien et détourne l'appui vers
   * l'écran de tirage. Lancer une séance est la seule action qu'on veut à
   * portée de pouce depuis n'importe où dans l'app.
   */
  Tirer: undefined;
  Defis: undefined;
  Journal: undefined;
};
