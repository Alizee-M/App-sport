import type { Exercice, Seance } from './types';
import { exerciceParId } from './exercices';
import { construireEtapes } from './deroulement';

/* ----------------------------------------------------------------------
 * Les voies de compétence.
 *
 * Le tirage au sort est excellent contre l'ennui, mais il ne mène nulle
 * part en particulier : à force de piocher, on ne construit aucun geste
 * difficile. Une voie répond à ça — un objectif nommé (tenir sur les
 * mains), découpé en paliers ordonnés, et un tirage qui programme
 * réellement l'exercice du palier en cours.
 *
 * Deux garde-fous :
 *
 *   1. Un palier ne se valide pas d'un clic. Il faut d'abord avoir
 *      *pratiqué* l'exercice — l'app compte le volume réellement effectué
 *      en séance — puis réussir un test. Sans ce seuil, la voie ne serait
 *      qu'une liste à cocher.
 *   2. Le test se valide sur l'honneur, comme les règles du jour : aucun
 *      téléphone ne peut vérifier un équilibre. Mais on ne peut pas le
 *      valider avant d'avoir fait le travail.
 * -------------------------------------------------------------------- */

export interface PratiqueRequise {
  /** Répétitions cumulées de l'exercice du palier. */
  reps?: number;
  /** Secondes cumulées, pour les exercices tenus. */
  secondes?: number;
}

export interface Palier {
  id: string;
  /** Exercice à travailler pour franchir ce palier. */
  exerciceId: string;
  /** Le test à réussir, formulé simplement. */
  test: string;
  /** Volume à accumuler avant de pouvoir tenter le test. */
  pratique: PratiqueRequise;
  /** Ce que le palier apprend, en une phrase. */
  pourquoi: string;
}

export interface Voie {
  id: string;
  nom: string;
  emoji: string;
  objectif: string;
  /** Exercices annexes à favoriser aussi : le geste ne tient pas seul. */
  soutiens: string[];
  paliers: Palier[];
}

export const VOIES: Voie[] = [
  {
    id: 'equilibre',
    nom: 'L\'Équilibre',
    emoji: '🤸',
    objectif: 'Tenir sur les mains, sans appui.',
    soutiens: ['planche', 'hollow_hold', 'pompes_pike'],
    paliers: [
      {
        id: 'equilibre_1',
        exerciceId: 'pompes_pike',
        test: 'Huit pompes en V propres, tête qui touche le sol.',
        pratique: { reps: 120 },
        pourquoi: 'Sans épaules capables de pousser au-dessus de la tête, rien ne suit.',
      },
      {
        id: 'equilibre_2',
        exerciceId: 'poirier_tete',
        test: 'Tenir le trépied 45 secondes, jambes tendues.',
        pratique: { secondes: 400 },
        pourquoi: 'Le trépied apprend à être à l\'envers avec trois points d\'appui : la peur tombe.',
      },
      {
        id: 'equilibre_3',
        exerciceId: 'marche_mur',
        test: 'Marcher jusqu\'à ce que les mains soient à un empan du mur.',
        pratique: { reps: 40 },
        pourquoi: 'On apprend à porter son poids sur les mains sans jamais risquer la chute.',
      },
      {
        id: 'equilibre_4',
        exerciceId: 'poirier_poitrine_mur',
        test: 'Tenir 45 secondes face au mur, corps aligné, sans cambrer.',
        pratique: { secondes: 600 },
        pourquoi: 'Face au mur, impossible de tricher avec le dos : c\'est la position juste.',
      },
      {
        id: 'equilibre_5',
        exerciceId: 'poirier_libre',
        test: 'Tenir 15 secondes sans appui, et savoir en sortir proprement.',
        pratique: { secondes: 300 },
        pourquoi: 'L\'objectif. Corriger avec les doigts, sortir par une roulade plutôt que se raidir.',
      },
    ],
  },
  {
    id: 'bras_unique',
    nom: 'Le Bras Unique',
    emoji: '💪',
    objectif: 'Une pompe sur un seul bras.',
    soutiens: ['planche_tap', 'hollow_hold', 'pompes'],
    paliers: [
      {
        id: 'bras_1',
        exerciceId: 'pompes',
        test: 'Vingt pompes d\'affilée, poitrine au sol à chaque fois.',
        pratique: { reps: 300 },
        pourquoi: 'La base. Sans vingt pompes propres, un bras seul n\'a aucune chance.',
      },
      {
        id: 'bras_2',
        exerciceId: 'pompes_diamant',
        test: 'Douze pompes diamant.',
        pratique: { reps: 150 },
        pourquoi: 'Les triceps porteront une grande part de la charge sur un seul bras.',
      },
      {
        id: 'bras_3',
        exerciceId: 'pompes_archer',
        test: 'Huit pompes archer de chaque côté.',
        pratique: { reps: 120 },
        pourquoi: 'Premier vrai déséquilibre : un bras pousse, l\'autre accompagne à peine.',
      },
      {
        id: 'bras_4',
        exerciceId: 'pompes_une_main_inclinees',
        test: 'Six pompes un bras sur un support bas, de chaque côté.',
        pratique: { reps: 100 },
        pourquoi: 'On baisse le support cran par cran : c\'est la même pompe, en plus dur.',
      },
      {
        id: 'bras_5',
        exerciceId: 'pompes_une_main',
        test: 'Une pompe un bras complète, au sol, de chaque côté.',
        pratique: { reps: 40 },
        pourquoi: 'L\'objectif. Pieds larges, hanches stables, corps qui ne pivote pas.',
      },
    ],
  },
  {
    id: 'pistolet',
    nom: 'Le Pistolet',
    emoji: '🦿',
    objectif: 'Un squat complet sur une jambe.',
    soutiens: ['pont_une_jambe', 'mollets_une_jambe', 'chaise_murale'],
    paliers: [
      {
        id: 'pistolet_1',
        exerciceId: 'squats',
        test: 'Trente squats profonds, talons au sol.',
        pratique: { reps: 400 },
        pourquoi: 'Sans amplitude complète à deux jambes, inutile d\'en retirer une.',
      },
      {
        id: 'pistolet_2',
        exerciceId: 'fentes_bulgares',
        test: 'Dix fentes bulgares de chaque côté.',
        pratique: { reps: 150 },
        pourquoi: 'Le premier appui vraiment asymétrique, sans exiger encore l\'équilibre.',
      },
      {
        id: 'pistolet_3',
        exerciceId: 'pistol_assiste',
        test: 'Huit pistolets assistés de chaque côté, descente lente.',
        pratique: { reps: 120 },
        pourquoi: 'La chaise ne porte presque rien : elle rassure et corrige la trajectoire.',
      },
      {
        id: 'pistolet_4',
        exerciceId: 'pistolet',
        test: 'Trois pistolets complets de chaque côté, sans appui.',
        pratique: { reps: 60 },
        pourquoi: 'L\'objectif. Bras tendus devant, talon ancré, remontée sans à-coup.',
      },
    ],
  },
  {
    id: 'l_sit',
    nom: 'Le L-sit',
    emoji: '📐',
    objectif: 'Tenir le corps en L, décollé du sol.',
    soutiens: ['planche', 'dead_bug', 'releves_jambes'],
    paliers: [
      {
        id: 'lsit_1',
        exerciceId: 'hollow_hold',
        test: 'Tenir la banane 45 secondes, lombaires plaquées.',
        pratique: { secondes: 500 },
        pourquoi: 'Le L-sit est un hollow hold en appui : sans le premier, pas de second.',
      },
      {
        id: 'lsit_2',
        exerciceId: 'l_sit_groupe',
        test: 'Tenir 30 secondes genoux repliés, fesses décollées.',
        pratique: { secondes: 400 },
        pourquoi: 'Genoux repliés, le levier est court : on apprend à pousser le sol.',
      },
      {
        id: 'lsit_3',
        exerciceId: 'l_sit',
        test: 'Tenir 15 secondes jambes tendues à l\'horizontale.',
        pratique: { secondes: 250 },
        pourquoi: 'L\'objectif. Épaules basses, jambes verrouillées, respiration continue.',
      },
    ],
  },
];

export const VOIES_PAR_ID: Record<string, Voie> = Object.fromEntries(
  VOIES.map((v) => [v.id, v]),
);

export function voieParId(id: string): Voie | undefined {
  return VOIES_PAR_ID[id];
}

/* ------------------------ Le volume réellement fait ------------------- */

export interface VolumeExercice {
  reps: number;
  secondes: number;
}

export type Volumes = Record<string, VolumeExercice>;

/**
 * Volume effectué pendant une séance, exercice par exercice.
 *
 * Compté sur le déroulé réel — tours compris — et pondéré par la part de
 * séance accomplie : ce qui n'a pas été fait ne compte pas.
 */
export function volumeRealise(seance: Seance, ratio = 1): Volumes {
  const volumes: Volumes = {};
  const part = Math.min(1, Math.max(0, ratio));

  for (const etape of construireEtapes(seance)) {
    if (etape.genre !== 'effort' || !etape.prescrit) continue;
    const { exercice, reps, secondes } = etape.prescrit;
    const actuel = volumes[exercice.id] ?? { reps: 0, secondes: 0 };
    volumes[exercice.id] = {
      reps: actuel.reps + Math.round((reps ?? 0) * part),
      secondes: actuel.secondes + Math.round((secondes ?? etape.secondes) * part),
    };
  }
  return volumes;
}

/** Fusionne le volume d'une séance dans le cumul déjà enregistré. */
export function cumulerVolumes(cumul: Volumes, ajout: Volumes): Volumes {
  const fusion: Volumes = { ...cumul };
  for (const [id, volume] of Object.entries(ajout)) {
    const actuel = fusion[id] ?? { reps: 0, secondes: 0 };
    fusion[id] = {
      reps: actuel.reps + volume.reps,
      secondes: actuel.secondes + volume.secondes,
    };
  }
  return fusion;
}

/* --------------------------- L'avancement ----------------------------- */

export interface EtatPalier {
  palier: Palier;
  exercice: Exercice | undefined;
  /** Déjà franchi. */
  valide: boolean;
  /** Palier en cours : le seul sur lequel on travaille. */
  courant: boolean;
  /** Part de la pratique requise déjà accomplie, de 0 à 1. */
  pratique: number;
  /** Le test peut être tenté : la pratique est suffisante. */
  testOuvert: boolean;
}

/** Part de pratique accomplie sur un palier, de 0 à 1. */
export function partPratique(palier: Palier, volumes: Volumes): number {
  const fait = volumes[palier.exerciceId] ?? { reps: 0, secondes: 0 };
  const cibles: number[] = [];

  if (palier.pratique.reps) cibles.push(Math.min(1, fait.reps / palier.pratique.reps));
  if (palier.pratique.secondes) {
    cibles.push(Math.min(1, fait.secondes / palier.pratique.secondes));
  }
  if (cibles.length === 0) return 1;

  // Quand plusieurs seuils existent, c'est le plus exigeant qui décide.
  return Math.min(...cibles);
}

/**
 * État complet d'une voie : quel palier est en cours, lesquels sont
 * franchis, et où en est la pratique.
 */
export function etatVoie(voie: Voie, valides: string[], volumes: Volumes): EtatPalier[] {
  let courantTrouve = false;

  return voie.paliers.map((palier) => {
    const valide = valides.includes(palier.id);
    const courant = !valide && !courantTrouve;
    if (courant) courantTrouve = true;

    const pratique = partPratique(palier, volumes);
    return {
      palier,
      exercice: exerciceParId(palier.exerciceId),
      valide,
      courant,
      pratique,
      testOuvert: courant && pratique >= 1,
    };
  });
}

/** Palier sur lequel on travaille actuellement, s'il en reste un. */
export function palierCourant(voie: Voie, valides: string[]): Palier | null {
  return voie.paliers.find((p) => !valides.includes(p.id)) ?? null;
}

export function voieAchevee(voie: Voie, valides: string[]): boolean {
  return voie.paliers.every((p) => valides.includes(p.id));
}

export function progressionVoie(voie: Voie, valides: string[]): number {
  const franchis = voie.paliers.filter((p) => valides.includes(p.id)).length;
  return voie.paliers.length === 0 ? 0 : franchis / voie.paliers.length;
}

export interface ProgrammeVoie {
  /** L'exercice du palier en cours : celui qu'il faut vraiment répéter. */
  principal: string | null;
  /** Exercices annexes, utiles mais secondaires. */
  soutiens: string[];
}

/**
 * Ce que le tirage doit programmer pour faire progresser la voie.
 *
 * C'est le cœur du mécanisme : sans cela, une voie ne serait qu'un
 * tableau de bord, et le hasard continuerait de proposer autre chose.
 *
 * Le palier et ses soutiens sont volontairement séparés : mis sur le même
 * plan, ils se partageaient la priorité et l'exercice réellement décisif
 * ne sortait qu'une séance sur deux.
 */
export function programmeVoie(voie: Voie, valides: string[]): ProgrammeVoie {
  const palier = palierCourant(voie, valides);
  if (!palier) return { principal: null, soutiens: [] };
  return { principal: palier.exerciceId, soutiens: voie.soutiens };
}
