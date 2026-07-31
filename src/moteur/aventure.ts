import type { Focus, Intensite, OptionsTirage, Seance } from './types';
import type { Rang } from './systeme';

/* ----------------------------------------------------------------------
 * Les portails.
 *
 * Ils donnent une raison de faire *la séance de ce soir* plutôt qu'une
 * séance un jour prochain : il y a une salle juste devant, et un boss au
 * fond du donjon. Chaque salle impose des exigences minimales — durée,
 * intensité, parfois un focus — mais laisse le tirage faire le reste.
 *
 * Les donjons sont classés du rang E au rang S, exactement comme le
 * chasseur : au niveau 10 on obtient le rang C et on entre dans les
 * donjons de rang C. Sans cette correspondance, les deux échelles se
 * contrediraient et le classement ne voudrait plus rien dire.
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
  /** Rang du donjon, sur la même échelle que celui du chasseur. */
  rang: Rang;
  couleur: string;
  intro: string;
  niveauConseille: number;
  noeuds: Noeud[];
}

export const ZONES: Zone[] = [
  {
    id: 'portail_e',
    nom: 'Portail de rang E',
    emoji: '🚪',
    rang: 'E',
    couleur: '#8b95ad',
    intro:
      'Une fissure basse, dans un salon. Aucun danger réel : c\'est là qu\'on apprend à franchir un portail, pas à en revenir.',
    niveauConseille: 1,
    noeuds: [
      {
        id: 'e_1',
        nom: 'L\'Ouverture',
        emoji: '🌀',
        type: 'normal',
        recit: 'Dix minutes de l\'autre côté. Juste pour prouver que le portail s\'ouvre.',
        exigence: { dureeMin: 10, intensiteMin: 1 },
        xpBonus: 30,
      },
      {
        id: 'e_2',
        nom: 'Les Rôdeurs',
        emoji: '🐀',
        type: 'normal',
        recit: 'Petits, nombreux, inoffensifs un par un. C\'est le « par un » qui pose problème.',
        exigence: { dureeMin: 12, intensiteMin: 1 },
        xpBonus: 35,
      },
      {
        id: 'e_3',
        nom: 'La Salle Basse',
        emoji: '🦵',
        type: 'normal',
        recit: 'Plafond bas, couloir long. On avance sur les jambes et on ne se relève pas.',
        exigence: { dureeMin: 12, intensiteMin: 1, focus: 'force' },
        xpBonus: 40,
      },
      {
        id: 'e_4',
        nom: 'L\'Alarme',
        emoji: '🔔',
        type: 'elite',
        recit: 'Le donjon t\'a repéré. Il faut tenir le rythme jusqu\'à la salle suivante.',
        exigence: { dureeMin: 15, intensiteMin: 2, focus: 'cardio' },
        xpBonus: 60,
      },
      {
        id: 'e_boss',
        nom: 'LE GARDIEN DE SEUIL',
        emoji: '🗿',
        type: 'boss',
        recit:
          'Il garde la première porte depuis toujours et n\'a jamais eu à se battre. Personne n\'était venu.',
        exigence: { dureeMin: 20, intensiteMin: 2 },
        xpBonus: 150,
      },
    ],
  },
  {
    id: 'faille_d',
    nom: 'Faille de rang D',
    emoji: '🕳️',
    rang: 'D',
    couleur: '#4cc9f0',
    intro: 'La faille reste ouverte bien plus longtemps qu\'elle ne devrait. Quelque chose la tient.',
    niveauConseille: 5,
    noeuds: [
      {
        id: 'd_1',
        nom: 'La Descente',
        emoji: '🪜',
        type: 'normal',
        recit: 'Vingt minutes vers le bas, à rythme constant. Rien d\'héroïque, juste tenu.',
        exigence: { dureeMin: 20, intensiteMin: 2 },
        xpBonus: 60,
      },
      {
        id: 'd_2',
        nom: 'Le Couloir Étroit',
        emoji: '🧱',
        type: 'normal',
        recit: 'Les murs se resserrent. Le ventre a une opinion sur ce projet : ignore-la.',
        exigence: { dureeMin: 18, intensiteMin: 2, focus: 'gainage' },
        xpBonus: 65,
      },
      {
        id: 'd_3',
        nom: 'La Herse Rouillée',
        emoji: '⛓️',
        type: 'normal',
        recit: 'Elle ne s\'ouvre pas toute seule. Le haut du corps réclame son dû.',
        exigence: { dureeMin: 20, intensiteMin: 2, focus: 'force' },
        xpBonus: 70,
      },
      {
        id: 'd_4',
        nom: 'La Longue Galerie',
        emoji: '🔦',
        type: 'elite',
        recit: 'Trente minutes sans embranchement. Le moment où l\'on découvre si l\'on tient la distance.',
        exigence: { dureeMin: 30, intensiteMin: 2 },
        xpBonus: 110,
      },
      {
        id: 'd_boss',
        nom: 'LA SENTINELLE DE PIERRE',
        emoji: '🪨',
        type: 'boss',
        recit: 'Elle ne frappe pas vite. Elle frappe longtemps, et elle n\'est jamais essoufflée.',
        exigence: { dureeMin: 25, intensiteMin: 3 },
        xpBonus: 200,
      },
    ],
  },
  {
    id: 'donjon_c',
    nom: 'Donjon de rang C',
    emoji: '🏚️',
    rang: 'C',
    couleur: '#3ddc97',
    intro:
      'Premier vrai donjon : plusieurs salles, un noyau au fond, et pas de sortie avant de l\'avoir éteint.',
    niveauConseille: 10,
    noeuds: [
      {
        id: 'c_1',
        nom: 'L\'Escalier Sans Fin',
        emoji: '⛰️',
        type: 'normal',
        recit: 'Ça monte. C\'est le principe des donjons : ils descendent, et pourtant ça monte.',
        exigence: { dureeMin: 25, intensiteMin: 2, focus: 'force' },
        xpBonus: 90,
      },
      {
        id: 'c_2',
        nom: 'La Salle d\'Eau',
        emoji: '🍃',
        type: 'normal',
        recit:
          'Une salle calme, sans monstre. Les chasseurs qui la traversent sans s\'arrêter le regrettent plus bas.',
        exigence: { dureeMin: 20, intensiteMin: 1, focus: 'souplesse' },
        xpBonus: 80,
      },
      {
        id: 'c_3',
        nom: 'L\'Essaim',
        emoji: '🐺',
        type: 'normal',
        recit: 'Ils courent plus vite que toi. Moins longtemps, en revanche.',
        exigence: { dureeMin: 25, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 95,
      },
      {
        id: 'c_4',
        nom: 'L\'Extinction des Torches',
        emoji: '🌑',
        type: 'elite',
        recit: 'Séance longue, dans le noir. Personne ne saura que tu l\'as faite. Sauf toi.',
        exigence: { dureeMin: 35, intensiteMin: 3 },
        xpBonus: 150,
      },
      {
        id: 'c_boss',
        nom: 'LE NOYAU DU DONJON',
        emoji: '🔴',
        type: 'boss',
        recit: 'Il bat au fond de la dernière salle. Tant qu\'il bat, le portail reste ouvert.',
        exigence: { dureeMin: 30, intensiteMin: 3 },
        xpBonus: 280,
      },
    ],
  },
  {
    id: 'donjon_b',
    nom: 'Donjon de rang B',
    emoji: '🏯',
    rang: 'B',
    couleur: '#ffc857',
    intro: 'L\'air y est plus lourd. Les chasseurs qui en reviennent en parlent peu.',
    niveauConseille: 15,
    noeuds: [
      {
        id: 'b_1',
        nom: 'L\'Arête de Pierre',
        emoji: '🪚',
        type: 'normal',
        recit: 'Étroite, exposée. Aucune place pour une technique approximative.',
        exigence: { dureeMin: 30, intensiteMin: 3, focus: 'gainage' },
        xpBonus: 130,
      },
      {
        id: 'b_2',
        nom: 'Le Vent des Profondeurs',
        emoji: '💨',
        type: 'normal',
        recit: 'Tout te pousse vers la sortie. Continue dans l\'autre sens.',
        exigence: { dureeMin: 30, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 140,
      },
      {
        id: 'b_3',
        nom: 'Le Répit',
        emoji: '⛺',
        type: 'normal',
        recit: 'Récupération active. Ça compte autant que le reste, même si c\'est moins glorieux.',
        exigence: { dureeMin: 20, intensiteMin: 1, focus: 'souplesse' },
        xpBonus: 100,
      },
      {
        id: 'b_4',
        nom: 'La Remontée du Puits',
        emoji: '🧗',
        type: 'elite',
        recit: 'Quarante minutes, tout en haut de ce que tu sais faire aujourd\'hui.',
        exigence: { dureeMin: 40, intensiteMin: 3 },
        xpBonus: 200,
      },
      {
        id: 'b_boss',
        nom: 'LE REFLET ARMÉ',
        emoji: '🪞',
        type: 'boss',
        recit:
          'Il a ton visage, ta fatigue et tes excuses. C\'est le seul adversaire qui les connaisse toutes.',
        exigence: { dureeMin: 35, intensiteMin: 3 },
        xpBonus: 380,
      },
    ],
  },
  {
    id: 'donjon_a',
    nom: 'Donjon de rang A',
    emoji: '🏛️',
    rang: 'A',
    couleur: '#ff6b35',
    intro: 'À partir d\'ici, on n\'entre plus par curiosité.',
    niveauConseille: 20,
    noeuds: [
      {
        id: 'a_1',
        nom: 'La Grande Herse',
        emoji: '⚔️',
        type: 'normal',
        recit: 'Force pure. Rien à négocier avec un mécanisme.',
        exigence: { dureeMin: 35, intensiteMin: 3, focus: 'force' },
        xpBonus: 180,
      },
      {
        id: 'a_2',
        nom: 'Les Eaux Noires',
        emoji: '🌊',
        type: 'normal',
        recit: 'Cardio long. On traverse ou on coule, et le donjon s\'en moque.',
        exigence: { dureeMin: 35, intensiteMin: 3, focus: 'cardio' },
        xpBonus: 190,
      },
      {
        id: 'a_3',
        nom: 'La Garde Rapprochée',
        emoji: '🛡️',
        type: 'elite',
        recit: 'Ils sont nombreux et ne se fatiguent pas. Toi si : c\'est tout le problème.',
        exigence: { dureeMin: 40, intensiteMin: 3, focus: 'gainage' },
        xpBonus: 260,
      },
      {
        id: 'a_boss',
        nom: 'LE CHEVALIER DE FER',
        emoji: '👑',
        type: 'boss',
        recit: 'Il attend au bout de la salle du trône. Il attend depuis que tu as commencé.',
        exigence: { dureeMin: 45, intensiteMin: 3 },
        xpBonus: 450,
      },
    ],
  },
  {
    id: 'portail_s',
    nom: 'Portail de rang S',
    emoji: '👁️',
    rang: 'S',
    couleur: '#b388ff',
    intro: 'Un portail qui ne se referme pas. Il n\'y en a qu\'un, et il t\'attend depuis le début.',
    niveauConseille: 25,
    noeuds: [
      {
        id: 's_1',
        nom: 'Le Silence d\'Avant',
        emoji: '🕯️',
        type: 'normal',
        recit: 'Rien ne bouge, rien n\'attaque. C\'est le pire moment : c\'est là qu\'on renonce.',
        exigence: { dureeMin: 30, intensiteMin: 2 },
        xpBonus: 200,
      },
      {
        id: 's_2',
        nom: 'La Marche des Ombres',
        emoji: '🌑',
        type: 'elite',
        recit: 'Quarante-cinq minutes sans repère. Tu sais déjà que tu peux : c\'est écrit dans ton journal.',
        exigence: { dureeMin: 45, intensiteMin: 3 },
        xpBonus: 320,
      },
      {
        id: 's_boss',
        nom: 'LE SOUVERAIN DU SEUIL',
        emoji: '🕯️',
        type: 'boss',
        recit:
          'Il n\'a pas de muscles. Il chuchote juste « à quoi bon », depuis le premier jour. Tout le reste n\'était que l\'approche.',
        exigence: { dureeMin: 45, intensiteMin: 3 },
        xpBonus: 800,
      },
    ],
  },
];

/**
 * Correspondance entre l'ancienne carte et les portails.
 *
 * La première carte filait une métaphore domestique (le Coussin
 * Ancestral, la Télécommande Perdue) qui n'avait plus rien à voir avec le
 * Système une fois celui-ci en place. Les salles ont été renommées et
 * reclassées par rang, mais leur ordre et leur nombre n'ont pas bougé sur
 * les cinq premières zones : une progression déjà acquise se reporte donc
 * exactement, au lieu d'être effacée par un simple changement de nom.
 */
export const NOEUDS_RENOMMES: Record<string, string> = {
  tapis_1: 'e_1',
  tapis_2: 'e_2',
  tapis_3: 'e_3',
  tapis_4: 'e_4',
  tapis_boss: 'e_boss',
  plaines_1: 'd_1',
  plaines_2: 'd_2',
  plaines_3: 'd_3',
  plaines_4: 'd_4',
  plaines_boss: 'd_boss',
  foret_1: 'c_1',
  foret_2: 'c_2',
  foret_3: 'c_3',
  foret_4: 'c_4',
  foret_boss: 'c_boss',
  cimes_1: 'b_1',
  cimes_2: 'b_2',
  cimes_3: 'b_3',
  cimes_4: 'b_4',
  cimes_boss: 'b_boss',
  donjon_1: 'a_1',
  donjon_2: 'a_2',
  donjon_3: 'a_3',
  donjon_boss: 'a_boss',
};

/** Reporte une progression enregistrée sous les anciens identifiants. */
export function convertirNoeudsTermines(termines: string[]): string[] {
  const connus = new Set(parcours().map((n) => n.id));
  const convertis = termines.map((id) => NOEUDS_RENOMMES[id] ?? id).filter((id) => connus.has(id));
  return [...new Set(convertis)];
}

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

  // On compte les salles réellement présentes sur la carte, pas les
  // identifiants enregistrés : une carte remaniée laisse des identifiants
  // orphelins dans la sauvegarde, et les compter afficherait une
  // progression supérieure à 100 %.
  const faits = tous.filter((n) => termines.includes(n.id)).length;

  return {
    total: tous.length,
    faits,
    progression: tous.length === 0 ? 0 : faits / tous.length,
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
