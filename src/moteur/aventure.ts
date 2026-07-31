import type { Focus, Intensite, OptionsTirage, Seance } from './types';

/* ----------------------------------------------------------------------
 * La carte d'aventure.
 *
 * Elle donne une raison de faire *la séance de ce soir* plutôt qu'une
 * séance un jour prochain : il y a une étape juste devant, et un boss au
 * bout de la zone. Chaque nœud impose des exigences minimales — durée,
 * intensité, parfois un focus — mais laisse le tirage faire le reste.
 * -------------------------------------------------------------------- */

export type TypeNoeud = 'normal' | 'elite' | 'boss';

export interface ExigenceNoeud {
  dureeMin: number;
  intensiteMin: Intensite;
  focus?: Focus;
}

export interface Noeud {
  id: string;
  nom: string;
  emoji: string;
  type: TypeNoeud;
  recit: string;
  exigence: ExigenceNoeud;
  /** XP offerte en plus de celle de la séance elle-même. */
  xpBonus: number;
}

export interface Zone {
  id: string;
  nom: string;
  emoji: string;
  couleur: string;
  intro: string;
  niveauConseille: number;
  noeuds: Noeud[];
}

export const ZONES: Zone[] = [
  {
    id: 'tapis',
    nom: 'Le Tapis du Débutant',
    emoji: '🟩',
    couleur: '#4ade80',
    intro: 'Tout commence par un mètre carré de sol dégagé. C\'est déjà un exploit.',
    niveauConseille: 1,
    noeuds: [
      {
        id: 'tapis_1',
        nom: 'Le Premier Pas',
        emoji: '👣',
        type: 'normal',
        recit: 'Dix minutes. Juste pour prouver que le canapé n\'a pas gagné.',
        exigence: { dureeMin: 10, intensiteMin: 1 },
        xpBonus: 30,
      },
      {
        id: 'tapis_2',
        nom: 'La Chaussette Perdue',
        emoji: '🧦',
        type: 'normal',
        recit: 'Elle est sous le meuble. Tu ne la retrouveras pas. Entraîne-toi quand même.',
        exigence: { dureeMin: 12, intensiteMin: 1 },
        xpBonus: 35,
      },
      {
        id: 'tapis_3',
        nom: 'Les Jambes de Coton',
        emoji: '🦵',
        type: 'normal',
        recit: 'Aujourd\'hui, on s\'occupe du bas. Demain, les escaliers seront une aventure.',
        exigence: { dureeMin: 12, intensiteMin: 1, focus: 'force' },
        xpBonus: 40,
      },
      {
        id: 'tapis_4',
        nom: 'Le Souffle Court',
        emoji: '🫁',
        type: 'elite',
        recit: 'Un peu de cardio. Tu vas découvrir des poumons que tu croyais décoratifs.',
        exigence: { dureeMin: 15, intensiteMin: 2, focus: 'cardio' },
        xpBonus: 60,
      },
      {
        id: 'tapis_boss',
        nom: 'LE COUSSIN ANCESTRAL',
        emoji: '🛑',
        type: 'boss',
        recit: 'Il t\'a englouti tous les dimanches depuis des années. Aujourd\'hui, tu te lèves.',
        exigence: { dureeMin: 20, intensiteMin: 2 },
        xpBonus: 150,
      },
    ],
  },
  {
    id: 'plaines',
    nom: 'Les Plaines du Canapé',
    emoji: '🛋️',
    couleur: '#60a5fa',
    intro: 'Un territoire vaste et mou, où beaucoup se sont perdus pour toujours.',
    niveauConseille: 3,
    noeuds: [
      {
        id: 'plaines_1',
        nom: 'La Traversée',
        emoji: '🚶',
        type: 'normal',
        recit: 'Vingt minutes d\'un pas régulier. Rien d\'héroïque, juste tenu.',
        exigence: { dureeMin: 20, intensiteMin: 2 },
        xpBonus: 60,
      },
      {
        id: 'plaines_2',
        nom: 'Le Mur de Gainage',
        emoji: '🧱',
        type: 'normal',
        recit: 'Ton ventre a une opinion sur ce projet. Ignore-la.',
        exigence: { dureeMin: 18, intensiteMin: 2, focus: 'gainage' },
        xpBonus: 65,
      },
      {
        id: 'plaines_3',
        nom: 'Les Bras Ballants',
        emoji: '💪',
        type: 'normal',
        recit: 'Le haut du corps réclame son dû. Il a attendu longtemps.',
        exigence: { dureeMin: 20, intensiteMin: 2, focus: 'force' },
        xpBonus: 70,
      },
      {
        id: 'plaines_4',
        nom: 'La Longue Marche',
        emoji: '🥾',
        type: 'elite',
        recit: 'Trente minutes. Le moment où tu découvres si tu tiens la distance.',
        exigence: { dureeMin: 30, intensiteMin: 2 },
        xpBonus: 110,
      },
      {
        id: 'plaines_boss',
        nom: 'LA TÉLÉCOMMANDE PERDUE',
        emoji: '📺',
        type: 'boss',
        recit: 'Elle est tombée entre deux coussins. Tu ne la retrouveras qu\'en sueur.',
        exigence: { dureeMin: 25, intensiteMin: 3 },
        xpBonus: 200,
      },
    ],
  },
  {
    id: 'foret',
    nom: 'La Forêt des Courbatures',
    emoji: '🌲',
    couleur: '#34d399',
    intro: 'Ici, chaque marche d\'escalier rappelle ce que tu as fait la veille.',
    niveauConseille: 6,
    noeuds: [
      {
        id: 'foret_1',
        nom: 'Le Sentier Raide',
        emoji: '⛰️',
        type: 'normal',
        recit: 'Ça monte. C\'est le principe.',
        exigence: { dureeMin: 25, intensiteMin: 2, focus: 'force' },
        xpBonus: 90,
      },
      {
        id: 'foret_2',
        nom: 'La Clairière',
        emoji: '🍃',
        type: 'normal',
        recit: 'Une pause dans la difficulté : aujourd\'hui, on s\'occupe de la souplesse.',
        exigence: { dureeMin: 20, intensiteMin: 1, focus: 'souplesse' },
        xpBonus: 80,
      },
      {
        id: 'foret_3',
        nom: 'La Meute',
        emoji: '🐺',
        type: 'normal',
        recit: 'Du cardio, encore. Ils courent plus vite que toi, mais moins longtemps.',
        exigence: { dureeMin: 25, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 95,
      },
      {
        id: 'foret_4',
        nom: 'La Nuit Sans Lune',
        emoji: '🌑',
        type: 'elite',
        recit: 'Séance longue et sérieuse. Personne ne saura que tu l\'as faite. Sauf toi.',
        exigence: { dureeMin: 35, intensiteMin: 3 },
        xpBonus: 150,
      },
      {
        id: 'foret_boss',
        nom: 'LE RÉVEIL DE 6H30',
        emoji: '⏰',
        type: 'boss',
        recit: 'Ton ennemi juré, celui que tu repousses cinq fois par matin. Affronte-le.',
        exigence: { dureeMin: 30, intensiteMin: 3 },
        xpBonus: 280,
      },
    ],
  },
  {
    id: 'cimes',
    nom: 'Les Cimes du Souffle',
    emoji: '🏔️',
    couleur: '#a78bfa',
    intro: 'L\'air se raréfie. Les excuses aussi.',
    niveauConseille: 10,
    noeuds: [
      {
        id: 'cimes_1',
        nom: 'L\'Arête',
        emoji: '🪨',
        type: 'normal',
        recit: 'Étroit, exposé, pas le droit à l\'erreur sur la technique.',
        exigence: { dureeMin: 30, intensiteMin: 3, focus: 'gainage' },
        xpBonus: 130,
      },
      {
        id: 'cimes_2',
        nom: 'Le Vent Contraire',
        emoji: '💨',
        type: 'normal',
        recit: 'Tout te pousse à redescendre. Continue.',
        exigence: { dureeMin: 30, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 140,
      },
      {
        id: 'cimes_3',
        nom: 'Le Camp de Base',
        emoji: '⛺',
        type: 'normal',
        recit: 'Récupération active. Ça compte autant que le reste, même si c\'est moins glorieux.',
        exigence: { dureeMin: 20, intensiteMin: 1, focus: 'souplesse' },
        xpBonus: 100,
      },
      {
        id: 'cimes_4',
        nom: 'L\'Ascension Finale',
        emoji: '🧗',
        type: 'elite',
        recit: 'Quarante minutes, tout en haut de ce que tu sais faire.',
        exigence: { dureeMin: 40, intensiteMin: 3 },
        xpBonus: 200,
      },
      {
        id: 'cimes_boss',
        nom: 'LE MIROIR DE LA SALLE DE BAIN',
        emoji: '🪞',
        type: 'boss',
        recit: 'Le seul adversaire qui te connaisse vraiment. Il a beaucoup à dire. Réponds-lui.',
        exigence: { dureeMin: 35, intensiteMin: 3 },
        xpBonus: 380,
      },
    ],
  },
  {
    id: 'donjon',
    nom: 'Le Donjon du Parquet',
    emoji: '🏰',
    couleur: '#f59e0b',
    intro: 'La dernière zone. Celle où l\'habitude a définitivement remplacé la motivation.',
    niveauConseille: 14,
    noeuds: [
      {
        id: 'donjon_1',
        nom: 'La Herse',
        emoji: '⚔️',
        type: 'normal',
        recit: 'Force pure. Rien à négocier.',
        exigence: { dureeMin: 35, intensiteMin: 3, focus: 'force' },
        xpBonus: 180,
      },
      {
        id: 'donjon_2',
        nom: 'Les Douves',
        emoji: '🌊',
        type: 'normal',
        recit: 'Cardio long. On traverse ou on coule.',
        exigence: { dureeMin: 35, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 190,
      },
      {
        id: 'donjon_3',
        nom: 'La Salle des Gardes',
        emoji: '🛡️',
        type: 'elite',
        recit: 'Ils sont nombreux et ils ne se fatiguent pas. Toi si. C\'est tout le problème.',
        exigence: { dureeMin: 40, intensiteMin: 3, focus: 'gainage' },
        xpBonus: 260,
      },
      {
        id: 'donjon_boss',
        nom: 'LE DOUTE DE NOVEMBRE',
        emoji: '👑',
        type: 'boss',
        recit: 'Il n\'a pas de muscles. Il chuchote juste « à quoi bon ». C\'est le boss final.',
        exigence: { dureeMin: 45, intensiteMin: 3 },
        xpBonus: 600,
      },
    ],
  },
];

/** Tous les nœuds, à plat, dans l'ordre où on les rencontre. */
export function parcours(): Noeud[] {
  return ZONES.flatMap((z) => z.noeuds);
}

export function zoneDuNoeud(idNoeud: string): Zone | undefined {
  return ZONES.find((z) => z.noeuds.some((n) => n.id === idNoeud));
}

export function noeudParId(idNoeud: string): Noeud | undefined {
  return parcours().find((n) => n.id === idNoeud);
}

/**
 * Prochain nœud à affronter : le premier de la liste qui n'est pas encore
 * validé. On ne débloque pas dans le désordre, pour que l'histoire garde
 * un sens et que la difficulté monte doucement.
 */
export function noeudCourant(termines: string[]): Noeud | null {
  return parcours().find((n) => !termines.includes(n.id)) ?? null;
}

export interface AvancementAventure {
  total: number;
  faits: number;
  progression: number;
  zoneCourante: Zone | null;
  noeudCourant: Noeud | null;
}

export function avancement(termines: string[]): AvancementAventure {
  const tous = parcours();
  const courant = noeudCourant(termines);
  return {
    total: tous.length,
    faits: tous.filter((n) => termines.includes(n.id)).length,
    progression: tous.length === 0 ? 0 : termines.length / tous.length,
    zoneCourante: courant ? zoneDuNoeud(courant.id) ?? null : null,
    noeudCourant: courant,
  };
}

/** Une zone est ouverte dès que tous ses nœuds précédents sont validés. */
export function zoneDebloquee(zone: Zone, termines: string[]): boolean {
  const index = ZONES.findIndex((z) => z.id === zone.id);
  if (index <= 0) return true;
  return ZONES.slice(0, index).every((z) => z.noeuds.every((n) => termines.includes(n.id)));
}

/**
 * La séance jouée honore-t-elle le contrat du nœud ?
 *
 * On vérifie ce qui a été *demandé au tirage*, pas ce qui a été ressenti :
 * une séance plus longue ou plus intense que l'exigence passe toujours.
 */
export function seanceValideNoeud(seance: Seance, noeud: Noeud): boolean {
  // On juge sur le temps demandé au tirage, pas sur la durée finale : une
  // carte du jour qui raccourcit les repos rend la séance plus dure, elle
  // ne doit pas faire perdre l'étape.
  if (seance.dureeDemandeeMin < noeud.exigence.dureeMin) return false;
  if (seance.intensite < noeud.exigence.intensiteMin) return false;
  if (noeud.exigence.focus && seance.focus !== noeud.exigence.focus) return false;
  return true;
}

/**
 * Options de tirage préremplies pour affronter un nœud : le joueur n'a
 * plus qu'à lancer, sans se demander s'il a coché les bonnes cases.
 */
export function optionsPourNoeud(
  noeud: Noeud,
  base: Pick<OptionsTirage, 'materielDispo' | 'silencieux' | 'niveau' | 'historiqueIds' | 'seed'>,
): OptionsTirage {
  return {
    ...base,
    dureeMin: noeud.exigence.dureeMin,
    intensite: noeud.exigence.intensiteMin,
    focus: noeud.exigence.focus ?? 'complet',
    type: noeud.type === 'boss' ? 'boss' : 'aventure',
    titre: noeud.nom,
    // Un boss impose ses règles : deux contraintes, et on fait avec.
    nbModificateurs: noeud.type === 'boss' ? 2 : undefined,
  };
}
