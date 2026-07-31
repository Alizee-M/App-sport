/* ----------------------------------------------------------------------
 * Héros de Salon — vocabulaire du jeu.
 *
 * Tout le moteur est écrit en TypeScript pur : aucun import React Native
 * ici, pour que la logique reste testable sous `node --test`.
 * -------------------------------------------------------------------- */

/** Les quatre jauges du personnage, nourries par les exercices réalisés. */
export type Stat = 'force' | 'cardio' | 'souplesse' | 'gainage';

export const STATS: Stat[] = ['force', 'cardio', 'souplesse', 'gainage'];

export const LIBELLE_STAT: Record<Stat, string> = {
  force: 'Force',
  cardio: 'Cardio',
  souplesse: 'Souplesse',
  gainage: 'Gainage',
};

export const EMOJI_STAT: Record<Stat, string> = {
  force: '💪',
  cardio: '🫀',
  souplesse: '🤸',
  gainage: '🧱',
};

/** Groupe de mouvement : sert à garantir qu'un bloc reste varié. */
export type Famille = 'pousse' | 'tire' | 'jambes' | 'gainage' | 'cardio' | 'mobilite';

export const LIBELLE_FAMILLE: Record<Famille, string> = {
  pousse: 'Poussée',
  tire: 'Tirage',
  jambes: 'Jambes',
  gainage: 'Gainage',
  cardio: 'Cardio',
  mobilite: 'Mobilité',
};

/** Ce qu'on peut avoir sous la main dans un salon. */
export type Materiel = 'chaise' | 'mur' | 'tapis' | 'elastique' | 'halteres';

export const LIBELLE_MATERIEL: Record<Materiel, string> = {
  chaise: 'Chaise / canapé',
  mur: 'Un mur libre',
  tapis: 'Tapis',
  elastique: 'Élastique',
  halteres: 'Haltères',
};

/** Un exercice se prescrit soit en répétitions, soit en secondes. */
export type Mesure = 'reps' | 'temps';

/**
 * Niveau sonore. Déterminant quand on habite en appartement : le mode
 * « silencieux » retire purement et simplement les exercices sautés.
 */
export type Bruit = 'silencieux' | 'normal' | 'bruyant';

/** Moment de la séance où un exercice a sa place. */
export type Phase = 'echauffement' | 'bloc' | 'retour_calme';

/**
 * Zone du corps mobilisée. Sert à faire correspondre l'échauffement et
 * les étirements au corps de séance : s'échauffer les épaules avant une
 * séance de jambes n'a aucun intérêt.
 */
export type ZoneCorps = 'epaules' | 'poitrine' | 'dos' | 'tronc' | 'hanches' | 'jambes' | 'nuque';

export interface Exercice {
  id: string;
  nom: string;
  emoji: string;
  famille: Famille;
  phases: Phase[];
  /** Poids du gain par stat, de 0 à 1. La somme n'a pas besoin de faire 1. */
  stats: Partial<Record<Stat, number>>;
  /** 1 = accessible à tout le monde, 5 = costaud. */
  difficulte: number;
  mesure: Mesure;
  /** Répétitions de référence, ou secondes de référence selon `mesure`. */
  base: number;
  /** Matériel indispensable. Vide = rien du tout. */
  materiel: Materiel[];
  bruit: Bruit;
  /** Consigne d'exécution, affichée en gros pendant l'effort. */
  consigne: string;
  /** Détail qui évite de se faire mal ou de tricher. */
  astuce?: string;
  /**
   * Zones mobilisées. Renseigné sur les exercices de mobilité et
   * d'étirement, pour lesquels il faut choisir en fonction du reste de la
   * séance. Pour les exercices d'effort, la famille suffit à le déduire.
   */
  zones?: ZoneCorps[];
  /** Niveau du héros à partir duquel l'exercice entre dans le deck. */
  niveauRequis: number;
  /** Variante à proposer quand c'est trop dur. */
  plusFacile?: string;
  /** Variante à proposer quand c'est trop facile. */
  plusDur?: string;
}

/** Rareté d'une carte modificatrice : pilote sa fréquence de tirage. */
export type Rarete = 'commune' | 'rare' | 'epique';

/**
 * Carte « règle du jeu » tirée en début de séance. C'est le principal
 * antidote à la routine : les mêmes exercices ne se jouent pas pareil
 * selon le modificateur actif.
 */
export interface Modificateur {
  id: string;
  nom: string;
  emoji: string;
  description: string;
  /**
   * Vrai si l'app modifie elle-même la séance (les chiffres affichés en
   * tiennent déjà compte). Faux si la contrainte porte sur la façon de
   * bouger : aucun logiciel ne peut la vérifier, elle tient sur parole.
   */
  applique: boolean;
  rarete: Rarete;
  /** Multiplicateur d'XP accordé en échange de la contrainte. */
  bonusXp: number;
  niveauRequis: number;
}

/** Un exercice une fois prescrit (dosé) dans une séance concrète. */
export interface ExercicePrescrit {
  exercice: Exercice;
  /** Répétitions à faire, si `mesure === 'reps'`. */
  reps?: number;
  /** Secondes d'effort, si `mesure === 'temps'`. */
  secondes?: number;
}

export interface Bloc {
  /** Nom de saveur, pour que le bloc 2 ne soit pas juste « bloc 2 ». */
  nom: string;
  tours: number;
  travailSec: number;
  /** Repos entre deux exercices. Zéro = on enchaîne sans souffler. */
  reposSec: number;
  exercices: ExercicePrescrit[];
  /** Répétitions ajoutées à chaque tour (carte « Pyramide »). */
  progressionReps?: number;
  /** Secondes ajoutées à chaque tour, pour les exercices tenus au temps. */
  progressionSecondes?: number;
}

export type TypeSeance = 'libre' | 'aventure' | 'boss';

export interface Seance {
  /** Graine du tirage : rejouer la même graine redonne la même séance. */
  seed: number;
  type: TypeSeance;
  titre: string;
  echauffement: ExercicePrescrit[];
  blocs: Bloc[];
  retourCalme: ExercicePrescrit[];
  modificateurs: Modificateur[];
  /** Durée réelle du déroulé, cartes du jour comprises. */
  dureeEstimeeSec: number;
  /**
   * Temps demandé au tirage, avant application des cartes. C'est lui qui
   * fait foi pour les quêtes : accepter une carte qui raccourcit les repos
   * ne doit pas invalider l'étape qu'on était venu chercher.
   */
  dureeDemandeeMin: number;
  intensite: Intensite;
  focus: Focus;
  /** XP gagnée si la séance est menée jusqu'au bout. */
  xpPotentiel: number;
}

export type Intensite = 1 | 2 | 3;

export type Focus = Stat | 'complet';

export const LIBELLE_FOCUS: Record<Focus, string> = {
  complet: 'Corps complet',
  force: 'Force',
  cardio: 'Cardio',
  souplesse: 'Souplesse',
  gainage: 'Gainage',
};

export const LIBELLE_INTENSITE: Record<Intensite, string> = {
  1: 'Tranquille',
  2: 'Sérieux',
  3: 'Ça pique',
};

export interface OptionsTirage {
  dureeMin: number;
  intensite: Intensite;
  focus: Focus;
  materielDispo: Materiel[];
  silencieux: boolean;
  niveau: number;
  /** Ids des exercices récemment faits, du plus récent au plus ancien. */
  historiqueIds: string[];
  seed: number;
  type?: TypeSeance;
  titre?: string;
  /** Nombre de cartes modificatrices à tirer (par défaut : selon l'intensité). */
  nbModificateurs?: number;
  /** Cartes imposées plutôt que tirées. Sert aux tests et aux quêtes scénarisées. */
  modificateursImposes?: string[];
  /**
   * Exercice du palier de compétence en cours, à programmer presque à
   * chaque séance. Sans lui, une voie ne serait qu'un tableau de bord et
   * le hasard continuerait de proposer autre chose.
   */
  exercicePrincipal?: string;
  /** Exercices de soutien de la voie : favorisés, sans plus. */
  exercicesPrioritaires?: string[];
}
