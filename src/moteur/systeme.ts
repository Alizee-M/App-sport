import type { Stat } from './types';
import { STATS } from './types';
import { creerAlea, melanger } from './alea';
import { exercicesDisponibles } from './exercices';
import type { Materiel } from './types';

/* ----------------------------------------------------------------------
 * Le Système.
 *
 * Une couche de jeu par-dessus la progression : des rangs plutôt que des
 * niveaux nus, des points à répartir soi-même, et une quête imposée
 * chaque jour.
 *
 * Hommage au genre « montée en puissance par un Système », pas copie :
 * aucun nom, personnage ni visuel d'une œuvre existante n'est repris.
 *
 * La pénalité de quête journalière est volontairement douce et plafonnée.
 * Une app de sport qui punit durement fabrique de l'évitement : on
 * n'ouvre plus l'app pour ne pas voir la sanction, et on arrête. Le coût
 * doit se sentir sans jamais dissuader de revenir.
 * -------------------------------------------------------------------- */

export type Rang = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export const RANGS: Rang[] = ['E', 'D', 'C', 'B', 'A', 'S'];

interface PalierRang {
  rang: Rang;
  niveauMin: number;
  titre: string;
  couleur: string;
}

const PALIERS: PalierRang[] = [
  { rang: 'E', niveauMin: 1, titre: 'Éveillé de rang E', couleur: '#8b95ad' },
  { rang: 'D', niveauMin: 5, titre: 'Chasseur de rang D', couleur: '#4cc9f0' },
  { rang: 'C', niveauMin: 10, titre: 'Chasseur de rang C', couleur: '#3ddc97' },
  { rang: 'B', niveauMin: 15, titre: 'Chasseur de rang B', couleur: '#ffc857' },
  { rang: 'A', niveauMin: 20, titre: 'Chasseur de rang A', couleur: '#ff6b35' },
  { rang: 'S', niveauMin: 25, titre: 'Souverain de rang S', couleur: '#b388ff' },
];

export function palierPourNiveau(niveau: number): PalierRang {
  let trouve = PALIERS[0];
  for (const palier of PALIERS) {
    if (niveau >= palier.niveauMin) trouve = palier;
  }
  return trouve;
}

export function rangPourNiveau(niveau: number): Rang {
  return palierPourNiveau(niveau).rang;
}

/** Palier suivant, pour annoncer ce qui se joue au prochain niveau. */
export function prochainPalier(niveau: number): PalierRang | null {
  return PALIERS.find((p) => p.niveauMin > niveau) ?? null;
}

/* --------------------------- Points de stats -------------------------- */

/** Points offerts à chaque montée de niveau, à répartir librement. */
export const POINTS_PAR_NIVEAU = 3;

export type PointsStats = Record<Stat, number>;

export function pointsVides(): PointsStats {
  return { force: 0, cardio: 0, souplesse: 0, gainage: 0 };
}

export function totalPoints(points: PointsStats): number {
  return STATS.reduce((somme, stat) => somme + points[stat], 0);
}

/**
 * Bonus d'XP accordé par les points investis dans la stat travaillée.
 *
 * Plafonné à +30 % : au-delà, tout investir dans une seule stat rendrait
 * les autres inutiles, et le jeu se jouerait tout seul.
 */
export function bonusPoints(points: PointsStats, focus: Stat | 'complet'): number {
  if (focus === 'complet') {
    // Une séance complète profite de la moyenne : se spécialiser ne doit
    // pas pénaliser celui qui travaille tout.
    return Math.min(0.3, (totalPoints(points) / STATS.length) * 0.02);
  }
  return Math.min(0.3, points[focus] * 0.02);
}

/* ------------------------- Quête journalière -------------------------- */

export interface LigneQuete {
  exerciceId: string;
  nom: string;
  emoji: string;
  objectif: number;
  /** `reps` ou `secondes`, selon la mesure de l'exercice. */
  unite: 'reps' | 'secondes';
}

export interface QueteJournaliere {
  /** Jour calendaire AAAA-MM-JJ auquel la quête appartient. */
  jour: string;
  lignes: LigneQuete[];
  xpRecompense: number;
}

/**
 * La quête du jour, tirée à partir de la date : tout le monde la découvre
 * le matin et ne peut pas la relancer jusqu'au lendemain. C'est ce qui en
 * fait une contrainte plutôt qu'un menu.
 */
export function queteJournaliere(
  jour: string,
  niveau: number,
  materielDispo: Materiel[],
  silencieux: boolean,
): QueteJournaliere {
  const graine = grainePourJour(jour);
  const alea = creerAlea(graine);

  const pool = exercicesDisponibles({
    phase: 'bloc',
    niveau,
    materielDispo,
    silencieux,
  });

  // Trois exercices de familles différentes : une quête journalière doit
  // toucher tout le corps, pas répéter trois fois la même chose.
  const melange = melanger(alea, pool);
  const retenus: typeof pool = [];
  const familles = new Set<string>();
  for (const exercice of melange) {
    if (familles.has(exercice.famille)) continue;
    familles.add(exercice.famille);
    retenus.push(exercice);
    if (retenus.length === 3) break;
  }
  while (retenus.length < 3 && melange.length > retenus.length) {
    retenus.push(melange[retenus.length]);
  }

  // L'objectif monte avec le niveau, sans jamais devenir une punition.
  const facteur = 1 + Math.min(niveau, 25) * 0.06;

  const lignes: LigneQuete[] = retenus.map((exercice) => {
    const brut = exercice.base * facteur * (exercice.mesure === 'temps' ? 2 : 2.5);
    const objectif =
      exercice.mesure === 'temps'
        ? Math.round(brut / 15) * 15 // multiples de 15 s, lisibles
        : Math.round(brut / 5) * 5;
    return {
      exerciceId: exercice.id,
      nom: exercice.nom,
      emoji: exercice.emoji,
      objectif: Math.max(exercice.mesure === 'temps' ? 30 : 10, objectif),
      unite: exercice.mesure === 'temps' ? 'secondes' : 'reps',
    };
  });

  return {
    jour,
    lignes,
    xpRecompense: Math.round(60 + niveau * 12),
  };
}

/** Graine stable dérivée d'une date : la quête ne change pas dans la journée. */
export function grainePourJour(jour: string): number {
  let somme = 0;
  for (let i = 0; i < jour.length; i++) {
    somme = (somme * 31 + jour.charCodeAt(i)) >>> 0;
  }
  return somme;
}

/* ---------------------------- La pénalité ----------------------------- */

/** Au-delà, on ne compte plus : revenir après un mois ne doit pas coûter un mois. */
export const PENALITES_MAX = 3;

/** Part d'XP retirée par jour manqué. */
const PART_XP_PAR_JOUR_MANQUE = 0.03;

export interface Penalite {
  joursManques: number;
  xpPerdue: number;
  serieBrisee: boolean;
}

/**
 * Sanction pour les quêtes journalières non honorées depuis la dernière
 * visite.
 *
 * Trois plafonds, tous délibérés : au plus trois jours comptés, au plus
 * 9 % de l'XP totale, et jamais de descente de niveau. On veut que
 * l'oubli se sente, pas qu'il démolisse des semaines de travail — sinon
 * la seule stratégie gagnante devient de ne plus ouvrir l'app.
 */
export function calculerPenalite(joursManques: number, xpTotal: number): Penalite {
  const comptes = Math.min(PENALITES_MAX, Math.max(0, joursManques));
  if (comptes === 0) {
    return { joursManques: 0, xpPerdue: 0, serieBrisee: false };
  }
  return {
    joursManques: comptes,
    xpPerdue: Math.round(xpTotal * PART_XP_PAR_JOUR_MANQUE * comptes),
    serieBrisee: true,
  };
}

/** Jour calendaire suivant, au format AAAA-MM-JJ. */
function jourSuivant(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  const date = new Date(Date.UTC(a, m - 1, j + 1));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Journées écoulées sans quête honorée, depuis la dernière visite et
 * jusqu'à hier inclus.
 *
 * La journée en cours n'est jamais comptée : on ne sanctionne pas
 * quelqu'un qui ouvre l'app le matin avant d'avoir eu l'occasion de
 * s'entraîner.
 */
export function joursManquesEntre(
  dernierJourVu: string,
  aujourdhui: string,
  joursFaits: string[],
): number {
  const faits = new Set(joursFaits);
  let manques = 0;
  let jour = dernierJourVu;

  // Borne de sécurité : au-delà, le plafond de pénalité s'applique de
  // toute façon, inutile de parcourir des années.
  for (let i = 0; i < 90 && jour < aujourdhui; i++) {
    if (!faits.has(jour)) manques += 1;
    jour = jourSuivant(jour);
  }
  return manques;
}

/**
 * L'XP après pénalité ne redescend jamais sous le seuil du niveau
 * atteint : un rang obtenu est acquis pour de bon.
 */
export function appliquerPenalite(
  xpTotal: number,
  penalite: Penalite,
  seuilDuNiveau: number,
): number {
  return Math.max(seuilDuNiveau, xpTotal - penalite.xpPerdue);
}
