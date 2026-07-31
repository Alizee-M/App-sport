/* ----------------------------------------------------------------------
 * Les défis éclair.
 *
 * À côté des séances tirées au hasard, quelques épreuves *fixes* : ce sont
 * les seules choses qui ne changent jamais, et c'est justement le but. Un
 * repère stable permet de mesurer ses progrès — impossible à faire quand
 * chaque séance est différente.
 * -------------------------------------------------------------------- */

/** `amrap` : le plus possible en un temps donné. `chrono` : finir au plus vite. `max` : tenir. */
export type FormatDefi = 'amrap' | 'chrono' | 'max';

export interface EtapeDefi {
  exerciceId: string;
  reps?: number;
}

export interface Defi {
  id: string;
  nom: string;
  emoji: string;
  description: string;
  format: FormatDefi;
  /** Durée imposée pour un `amrap`, plafond de sécurité pour un `max`. */
  dureeSec?: number;
  etapes: EtapeDefi[];
  /** Unité du score, pour l'affichage. */
  unite: string;
  /**
   * Score correspondant à un effort plein, pour un `amrap` ou un `max`.
   * En dessous, l'XP est proportionnelle : trois pompes ne valent pas
   * autant que trente.
   */
  reference?: number;
  /**
   * Temps en dessous duquel un `chrono` n'est pas crédible. Personne ne
   * fait 100 squats en huit secondes : c'est qu'on a appuyé sur
   * « Terminé » sans rien faire.
   */
  tempsMinimalSec?: number;
  niveauRequis: number;
}

export const DEFIS: Defi[] = [
  {
    id: 'minute_infernale',
    nom: 'La Minute Infernale',
    emoji: '🔥',
    description: 'Un maximum de burpees en 60 secondes. Ça a l\'air court. Ça ne l\'est pas.',
    format: 'amrap',
    dureeSec: 60,
    etapes: [{ exerciceId: 'burpees' }],
    unite: 'burpees',
    reference: 15,
    niveauRequis: 3,
  },
  {
    id: 'chaise_eternelle',
    nom: 'La Chaise Éternelle',
    emoji: '🪑',
    description: 'Dos au mur, cuisses à l\'horizontale. Tiens le plus longtemps possible.',
    format: 'max',
    dureeSec: 300,
    etapes: [{ exerciceId: 'chaise_murale' }],
    unite: 'secondes',
    reference: 60,
    niveauRequis: 1,
  },
  {
    id: 'planche_record',
    nom: 'La Planche des Braves',
    emoji: '🪚',
    description: 'Une planche. Le chrono tourne. Ton ventre décidera de la fin.',
    format: 'max',
    dureeSec: 300,
    etapes: [{ exerciceId: 'planche' }],
    unite: 'secondes',
    reference: 60,
    niveauRequis: 1,
  },
  {
    id: 'cent_squats',
    nom: 'Le Gantelet',
    emoji: '🦿',
    description: '100 squats. Le plus vite possible. Les pauses sont permises, le chrono s\'en moque.',
    format: 'chrono',
    etapes: [{ exerciceId: 'squats', reps: 100 }],
    unite: 'secondes',
    tempsMinimalSec: 90,
    niveauRequis: 2,
  },
  {
    id: 'metronome',
    nom: 'Le Métronome',
    emoji: '⏲️',
    description: 'Un maximum de pompes en 2 minutes. La forme compte autant que le nombre.',
    format: 'amrap',
    dureeSec: 120,
    etapes: [{ exerciceId: 'pompes' }],
    unite: 'pompes',
    reference: 30,
    niveauRequis: 1,
  },
  {
    id: 'triangle',
    nom: 'Le Triangle',
    emoji: '🔺',
    description: '5 pompes, 10 squats, 15 crunchs vélo. Autant de tours que possible en 5 minutes.',
    format: 'amrap',
    dureeSec: 300,
    etapes: [
      { exerciceId: 'pompes', reps: 5 },
      { exerciceId: 'squats', reps: 10 },
      { exerciceId: 'crunch_velo', reps: 15 },
    ],
    unite: 'tours',
    reference: 6,
    niveauRequis: 2,
  },
  {
    id: 'escalier',
    nom: 'L\'Escalier',
    emoji: '🪜',
    description: '10 pompes et 10 squats, puis 9 et 9, puis 8 et 8… jusqu\'à 1. Chrono en marche.',
    format: 'chrono',
    etapes: [
      { exerciceId: 'pompes', reps: 55 },
      { exerciceId: 'squats', reps: 55 },
    ],
    unite: 'secondes',
    tempsMinimalSec: 150,
    niveauRequis: 4,
  },
  {
    id: 'cent_fantassins',
    nom: 'Les Cent Fantassins',
    emoji: '⭐',
    description: '100 jumping jacks, sans t\'arrêter si tu peux. Attention aux voisins du dessous.',
    format: 'chrono',
    etapes: [{ exerciceId: 'jumping_jacks', reps: 100 }],
    unite: 'secondes',
    tempsMinimalSec: 60,
    niveauRequis: 1,
  },
];

export const DEFIS_PAR_ID: Record<string, Defi> = Object.fromEntries(
  DEFIS.map((d) => [d.id, d]),
);

export function defisDisponibles(niveau: number): Defi[] {
  return DEFIS.filter((d) => d.niveauRequis <= niveau);
}

/** Sur un `chrono`, le meilleur score est le plus petit. Ailleurs, le plus grand. */
export function plusGrandEstMeilleur(defi: Defi): boolean {
  return defi.format !== 'chrono';
}

/**
 * Part d'effort réellement fournie, de 0 à 1.
 *
 * C'est le garde-fou contre le défi « validé » sans rien faire : lancer
 * l'épreuve et appuyer aussitôt sur Terminé ne doit rien rapporter. On ne
 * peut pas mesurer un mouvement depuis un téléphone posé au sol, mais on
 * peut refuser de récompenser un résultat matériellement impossible.
 */
export function partEffort(defi: Defi, score: number): number {
  if (score <= 0) return 0;

  if (defi.format === 'chrono') {
    // Un temps trop court signifie qu'on n'a pas fait les répétitions.
    const minimum = defi.tempsMinimalSec ?? 0;
    return score < minimum ? 0 : 1;
  }

  // AMRAP et maintien : l'XP est proportionnelle au travail fourni,
  // plafonnée à l'effort de référence.
  const reference = defi.reference ?? 1;
  return Math.min(1, score / reference);
}

/** Un résultat qui ne vaut aucune XP ne vaut pas non plus un record. */
export function resultatCredible(defi: Defi, score: number): boolean {
  return partEffort(defi, score) > 0;
}

/** Le nouveau score bat-il l'ancien record ? Un premier score compte toujours. */
export function estRecord(defi: Defi, nouveau: number, ancien: number | null | undefined): boolean {
  if (!resultatCredible(defi, nouveau)) return false;
  if (ancien === null || ancien === undefined) return true;
  return plusGrandEstMeilleur(defi) ? nouveau > ancien : nouveau < ancien;
}

/** Score lisible : les secondes deviennent des minutes au-delà d'une minute. */
export function formaterScore(defi: Defi, score: number): string {
  if (defi.unite !== 'secondes') return `${score} ${defi.unite}`;
  if (score < 60) return `${score} s`;
  const minutes = Math.floor(score / 60);
  const secondes = score % 60;
  return `${minutes} min ${String(secondes).padStart(2, '0')} s`;
}

/**
 * XP d'un défi, proportionnelle à l'effort fourni.
 *
 * Battre son record paie double : c'est le progrès qu'on récompense, pas
 * le simple fait de rejouer une épreuve connue. Et un défi non fait ne
 * rapporte rien du tout.
 */
export function xpPourDefi(defi: Defi, score: number, record: boolean): number {
  const part = partEffort(defi, score);
  if (part <= 0) return 0;

  const base = defi.format === 'chrono' ? 60 : 45;
  const bonusNiveau = defi.niveauRequis * 5;
  return Math.round((base + bonusNiveau) * part * (record ? 2 : 1));
}
