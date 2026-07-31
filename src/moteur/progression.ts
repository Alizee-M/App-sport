import type { Seance, Stat, ExercicePrescrit, Intensite, TypeSeance } from './types';
import { STATS } from './types';

/* ----------------------------------------------------------------------
 * Progression du héros : XP, niveaux, jauges de stats, titres.
 *
 * Règle de conception : on ne gagne jamais d'XP en regardant l'app. L'XP
 * vient du volume réellement effectué, pondéré par l'intensité choisie et
 * les contraintes acceptées. Un niveau ne se perd jamais — rater une
 * semaine coûte un enchaînement, pas des acquis.
 * -------------------------------------------------------------------- */

export interface StatsBrutes {
  force: number;
  cardio: number;
  souplesse: number;
  gainage: number;
}

export function statsVides(): StatsBrutes {
  return { force: 0, cardio: 0, souplesse: 0, gainage: 0 };
}

/** XP à accumuler pour passer de `niveau` au suivant. */
export function xpRequisPourNiveau(niveau: number): number {
  return 80 + 40 * (niveau - 1);
}

export interface NiveauInfo {
  niveau: number;
  /** XP accumulée à l'intérieur du niveau courant. */
  xpDansNiveau: number;
  /** XP nécessaire pour finir le niveau courant. */
  xpRequisNiveau: number;
  /** Avancement dans le niveau courant, de 0 à 1. */
  progression: number;
}

/** Convertit une XP cumulée en niveau + avancement dans ce niveau. */
export function niveauDepuisXp(xpTotal: number): NiveauInfo {
  let niveau = 1;
  let restant = Math.max(0, Math.floor(xpTotal));

  while (restant >= xpRequisPourNiveau(niveau)) {
    restant -= xpRequisPourNiveau(niveau);
    niveau += 1;
  }

  const xpRequisNiveau = xpRequisPourNiveau(niveau);
  return {
    niveau,
    xpDansNiveau: restant,
    xpRequisNiveau,
    progression: restant / xpRequisNiveau,
  };
}

/** XP cumulée nécessaire pour atteindre un niveau donné. */
export function xpCumuleePourAtteindre(niveau: number): number {
  let total = 0;
  for (let n = 1; n < niveau; n++) total += xpRequisPourNiveau(n);
  return total;
}

const MULTIPLICATEUR_INTENSITE: Record<Intensite, number> = {
  1: 0.85,
  2: 1,
  3: 1.2,
};

const MULTIPLICATEUR_TYPE: Record<TypeSeance, number> = {
  libre: 1,
  aventure: 1.15,
  boss: 1.5,
};

/**
 * XP promise par une séance si elle est terminée intégralement.
 *
 * Le multiplicateur des cartes modificatrices est appliqué ici : c'est ce
 * qui rend une contrainte attirante plutôt que subie.
 */
export function xpPotentielSeance(
  dureeEstimeeSec: number,
  intensite: Intensite,
  type: TypeSeance,
  bonusModificateurs: number,
): number {
  const base = (dureeEstimeeSec / 60) * 8;
  return Math.round(
    base * MULTIPLICATEUR_INTENSITE[intensite] * MULTIPLICATEUR_TYPE[type] * bonusModificateurs,
  );
}

/** Volume d'un exercice prescrit, ramené à une échelle commune. */
function volumeRelatif(prescrit: ExercicePrescrit): number {
  if (prescrit.exercice.mesure === 'temps') {
    return (prescrit.secondes ?? 0) / 30;
  }
  return (prescrit.reps ?? 0) / 10;
}

/**
 * Points de stats gagnés par une séance, en ne comptant que la fraction
 * réellement effectuée (`ratioComplete` entre 0 et 1).
 */
export function statsGagnees(seance: Seance, ratioComplete = 1): StatsBrutes {
  const gains = statsVides();

  const ajouter = (prescrit: ExercicePrescrit, facteur: number) => {
    const volume = volumeRelatif(prescrit) * facteur;
    for (const stat of STATS) {
      const poids = prescrit.exercice.stats[stat];
      if (poids) gains[stat] += poids * volume;
    }
  };

  for (const p of seance.echauffement) ajouter(p, 0.5);
  for (const bloc of seance.blocs) {
    for (const p of bloc.exercices) ajouter(p, bloc.tours);
  }
  for (const p of seance.retourCalme) ajouter(p, 0.5);

  for (const stat of STATS) {
    gains[stat] = Math.round(gains[stat] * ratioComplete * 10) / 10;
  }
  return gains;
}

/**
 * Rang d'une jauge de stat. Les paliers s'écartent progressivement pour
 * que la première étoile arrive vite et la dixième se mérite.
 */
export function rangStat(points: number): number {
  return Math.floor(Math.sqrt(Math.max(0, points) / 12));
}

/** Points restants avant le rang suivant, et avancement de 0 à 1. */
export function progressionRangStat(points: number): { rang: number; progression: number } {
  const rang = rangStat(points);
  const seuilActuel = 12 * rang * rang;
  const seuilSuivant = 12 * (rang + 1) * (rang + 1);
  return {
    rang,
    progression: (points - seuilActuel) / (seuilSuivant - seuilActuel),
  };
}

/** La stat la plus développée : sert à donner un surnom au héros. */
export function statDominante(stats: StatsBrutes): Stat {
  return STATS.reduce((meilleure, stat) =>
    stats[stat] > stats[meilleure] ? stat : meilleure,
  );
}

const TITRES: { niveau: number; titre: string }[] = [
  { niveau: 1, titre: 'Chaussette du dimanche' },
  { niveau: 2, titre: 'Apprenti du tapis' },
  { niveau: 3, titre: 'Écuyer du salon' },
  { niveau: 5, titre: 'Chevalier de la moquette' },
  { niveau: 7, titre: 'Bourreau des burpees' },
  { niveau: 9, titre: 'Gardien du gainage' },
  { niveau: 12, titre: 'Seigneur du canapé vaincu' },
  { niveau: 15, titre: 'Champion de la pièce à vivre' },
  { niveau: 18, titre: 'Légende domestique' },
  { niveau: 22, titre: 'Mythe du parquet' },
];

/** Titre honorifique correspondant au niveau atteint. */
export function titrePourNiveau(niveau: number): string {
  let titre = TITRES[0].titre;
  for (const palier of TITRES) {
    if (niveau >= palier.niveau) titre = palier.titre;
  }
  return titre;
}

/** Prochain titre à décrocher, s'il en reste un. */
export function prochainTitre(niveau: number): { niveau: number; titre: string } | null {
  return TITRES.find((t) => t.niveau > niveau) ?? null;
}

/* ------------------------------ Enchaînement ------------------------- */

/** Jour calendaire local au format AAAA-MM-JJ (et non UTC : on vit en local). */
export function jourLocal(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function differenceEnJours(jourA: string, jourB: string): number {
  const [aa, am, aj] = jourA.split('-').map(Number);
  const [ba, bm, bj] = jourB.split('-').map(Number);
  const a = Date.UTC(aa, am - 1, aj);
  const b = Date.UTC(ba, bm - 1, bj);
  return Math.round((a - b) / 86400000);
}

export interface Enchainement {
  /** Nombre de jours consécutifs avec au moins une séance. */
  serie: number;
  /** Dernier jour d'entraînement, au format AAAA-MM-JJ. */
  dernierJour: string | null;
}

/**
 * Met à jour l'enchaînement après une séance.
 *
 * Deux séances le même jour ne comptent qu'une fois : on récompense la
 * régularité, pas l'acharnement d'un seul dimanche.
 */
export function majEnchainement(actuel: Enchainement, aujourdhui: string): Enchainement {
  if (!actuel.dernierJour) return { serie: 1, dernierJour: aujourdhui };

  const ecart = differenceEnJours(aujourdhui, actuel.dernierJour);
  if (ecart === 0) return actuel;
  if (ecart === 1) return { serie: actuel.serie + 1, dernierJour: aujourdhui };
  return { serie: 1, dernierJour: aujourdhui };
}

/**
 * Enchaînement affiché aujourd'hui : une série s'éteint dès qu'un jour
 * entier est sauté, mais pas le jour même où l'on n'a pas encore bougé.
 */
export function serieAffichee(etat: Enchainement, aujourdhui: string): number {
  if (!etat.dernierJour) return 0;
  const ecart = differenceEnJours(aujourdhui, etat.dernierJour);
  return ecart <= 1 ? etat.serie : 0;
}

/** Bonus d'XP lié à la régularité, plafonné pour rester atteignable. */
export function bonusSerie(serie: number): number {
  return Math.min(0.25, serie * 0.02);
}
