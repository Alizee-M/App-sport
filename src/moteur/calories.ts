import type { Exercice, Famille, Seance } from './types';
import { construireEtapes } from './deroulement';

/* ----------------------------------------------------------------------
 * La dépense énergétique, et les récompenses qu'elle débloque.
 *
 * Méthode MET (Compendium of Physical Activities, Ainsworth et al.) :
 *
 *   kcal = MET × 3,5 × poids(kg) / 200 × minutes
 *
 * Deux avertissements que le reste du code doit respecter :
 *
 *   1. Sans poids corporel, aucun chiffre n'a de sens. On ne devine pas,
 *      on demande — et tant qu'on n'a pas la réponse, on n'affiche pas
 *      de calories.
 *   2. L'estimation reste juste à ±20-30 %. C'est la limite de la
 *      méthode, pas un défaut d'implémentation : deux personnes du même
 *      poids ne dépensent pas la même chose. L'app annonce donc des
 *      ordres de grandeur, jamais des valeurs exactes.
 *
 * Et un principe de conception : une récompense se *débloque*, elle ne se
 * *rembourse* pas. L'app ne dit jamais quoi manger, ne parle jamais de
 * poids à perdre, et ne présente aucun aliment comme une dette.
 * -------------------------------------------------------------------- */

/** Bornes de MET par famille : du plus facile au plus difficile. */
const MET_PAR_FAMILLE: Record<Famille, [number, number]> = {
  mobilite: [2.3, 2.3], // étirements et mobilité, effort léger
  gainage: [3.8, 5.5], // isométrie : coûteux musculairement, peu cardio
  pousse: [3.8, 8.0], // calisthénie modérée à vigoureuse
  tire: [3.8, 8.0],
  jambes: [4.0, 8.0],
  cardio: [6.0, 10.5], // course sur place, corde à sauter, burpees
};

/** Un repos n'est pas gratuit : le corps continue de tourner au ralenti. */
const MET_REPOS = 1.5;

/** Coût énergétique d'un exercice, interpolé sur sa difficulté. */
export function metDe(exercice: Exercice): number {
  const [bas, haut] = MET_PAR_FAMILLE[exercice.famille];
  const part = (Math.min(5, Math.max(1, exercice.difficulte)) - 1) / 4;
  return bas + (haut - bas) * part;
}

/** Dépense d'une durée passée à un effort donné. */
export function kcalPour(met: number, poidsKg: number, secondes: number): number {
  return (met * 3.5 * poidsKg) / 200 / 60 * secondes;
}

/**
 * Dépense estimée d'une séance, échauffement, repos et étirements
 * compris — c'est-à-dire ce qui sera réellement vécu, pas seulement les
 * moments d'effort.
 *
 * `ratio` est la part effectuée : s'arrêter à mi-parcours ne dépense pas
 * autant qu'aller au bout.
 */
export function caloriesSeance(seance: Seance, poidsKg: number, ratio = 1): number {
  if (poidsKg <= 0) return 0;

  let total = 0;
  for (const etape of construireEtapes(seance)) {
    const met = etape.prescrit ? metDe(etape.prescrit.exercice) : MET_REPOS;
    total += kcalPour(met, poidsKg, etape.secondes);
  }
  return Math.round(total * Math.min(1, Math.max(0, ratio)));
}

/* --------------------------- Les récompenses -------------------------- */

export type Palier = 'petite' | 'moyenne' | 'grosse' | 'legendaire';

export const LIBELLE_PALIER: Record<Palier, string> = {
  petite: 'Petite',
  moyenne: 'Moyenne',
  grosse: 'Grosse',
  legendaire: 'Légendaire',
};

export interface Recompense {
  id: string;
  nom: string;
  emoji: string;
  /** Valeur énergétique usuelle, en kilocalories. */
  kcal: number;
  palier: Palier;
}

/**
 * Le catalogue des récompenses.
 *
 * Les valeurs sont des ordres de grandeur courants, pas des mesures : une
 * pizza n'a pas de calorie officielle. Elles servent à fixer un objectif
 * d'effort, rien d'autre.
 */
export const RECOMPENSES: Recompense[] = [
  { id: 'carre_chocolat', nom: 'Un carré de chocolat', emoji: '🍫', kcal: 55, palier: 'petite' },
  { id: 'cafe_gourmand', nom: 'Un cookie', emoji: '🍪', kcal: 150, palier: 'petite' },
  { id: 'verre_vin', nom: 'Un verre de vin', emoji: '🍷', kcal: 120, palier: 'petite' },
  { id: 'boule_glace', nom: 'Une boule de glace', emoji: '🍨', kcal: 145, palier: 'petite' },

  { id: 'biere', nom: 'Une pinte de bière', emoji: '🍺', kcal: 215, palier: 'moyenne' },
  { id: 'croissant', nom: 'Un croissant', emoji: '🥐', kcal: 240, palier: 'moyenne' },
  { id: 'part_pizza', nom: 'Une part de pizza', emoji: '🍕', kcal: 285, palier: 'moyenne' },
  { id: 'tiramisu', nom: 'Un tiramisu', emoji: '🍮', kcal: 300, palier: 'moyenne' },
  { id: 'crepe_nutella', nom: 'Une crêpe au chocolat', emoji: '🥞', kcal: 350, palier: 'moyenne' },

  { id: 'frites', nom: 'Une grande frite', emoji: '🍟', kcal: 430, palier: 'grosse' },
  { id: 'part_gateau', nom: 'Une part de gâteau', emoji: '🍰', kcal: 400, palier: 'grosse' },
  { id: 'sushis', nom: 'Douze sushis', emoji: '🍣', kcal: 450, palier: 'grosse' },
  { id: 'burger', nom: 'Un burger', emoji: '🍔', kcal: 503, palier: 'grosse' },
  { id: 'tablette', nom: 'Une tablette de chocolat entière', emoji: '🍫', kcal: 550, palier: 'grosse' },

  { id: 'kebab', nom: 'Un kebab', emoji: '🌯', kcal: 750, palier: 'legendaire' },
  { id: 'raclette', nom: 'Une raclette', emoji: '🧀', kcal: 900, palier: 'legendaire' },
  { id: 'menu_burger', nom: 'Un menu burger complet', emoji: '🍔', kcal: 1100, palier: 'legendaire' },
  { id: 'brunch', nom: 'Un brunch à volonté', emoji: '🥓', kcal: 1400, palier: 'legendaire' },
];

export const RECOMPENSES_PAR_ID: Record<string, Recompense> = Object.fromEntries(
  RECOMPENSES.map((r) => [r.id, r]),
);

export function recompenseParId(id: string): Recompense | undefined {
  return RECOMPENSES_PAR_ID[id];
}

/* ------------------------- La quête en cours -------------------------- */

export interface QueteRecompense {
  recompenseId: string;
  /** Calories déjà dépensées au service de cette quête. */
  kcalAccumulees: number;
  /** Date de départ, au format ISO. */
  debutee: string;
}

export function progressionQuete(quete: QueteRecompense): number {
  const recompense = recompenseParId(quete.recompenseId);
  if (!recompense || recompense.kcal <= 0) return 0;
  return Math.min(1, quete.kcalAccumulees / recompense.kcal);
}

export function queteAccomplie(quete: QueteRecompense): boolean {
  return progressionQuete(quete) >= 1;
}

export function kcalRestantes(quete: QueteRecompense): number {
  const recompense = recompenseParId(quete.recompenseId);
  if (!recompense) return 0;
  return Math.max(0, Math.round(recompense.kcal - quete.kcalAccumulees));
}

/**
 * Nombre de séances encore nécessaires, arrondi au supérieur.
 *
 * C'est le chiffre qui remet les choses à leur place : un burger vaut
 * cinq séances intenses, pas une. Annoncer l'inverse serait mentir d'un
 * facteur cinq.
 */
export function seancesRestantes(quete: QueteRecompense, kcalParSeance: number): number {
  if (kcalParSeance <= 0) return 0;
  return Math.ceil(kcalRestantes(quete) / kcalParSeance);
}
