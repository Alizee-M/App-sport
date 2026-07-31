import type { Modificateur, Intensite } from './types';
import { tirerPondere } from './alea';

/* ----------------------------------------------------------------------
 * Les cartes « règle du jour ».
 *
 * Un catalogue d'exercices, même large, finit par tourner. Les cartes
 * modificatrices changent la *façon* de jouer les mêmes mouvements : un
 * squat en tempo lent n'a rien à voir avec un squat en pyramide. Chaque
 * carte impose une contrainte et paie en XP — accepter la contrainte est
 * toujours un choix, jamais une punition.
 *
 * Deux natures de cartes, distinguées par `applique` :
 *
 *   - `applique: true`  — l'app modifie réellement la séance (repos plus
 *     courts, tour supplémentaire, ordre inversé…). Rien à faire, c'est
 *     déjà dans les chiffres affichés.
 *   - `applique: false` — la contrainte porte sur ta façon de bouger
 *     (tempo, respiration, position des mains). Aucun logiciel ne peut
 *     la vérifier : elle tient sur ta parole.
 *
 * Cette distinction est affichée dans l'app. Sans elle, une carte qui
 * annonce « repos raccourcis » alors que le chrono affiche toujours la
 * même durée n'est pas une règle, c'est un bug.
 * -------------------------------------------------------------------- */

export const MODIFICATEURS: Modificateur[] = [
  {
    id: 'tempo_escargot',
    nom: 'Tempo escargot',
    emoji: '🐌',
    description: '3 secondes pour descendre sur chaque répétition. Le muscle déteste, il progresse.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 1,
  },
  {
    id: 'dernier_tour_double',
    nom: 'Double peine',
    emoji: '✖️',
    description: 'Un tour de plus sur chaque bloc. Tu croyais avoir fini.',
    applique: true,
    rarete: 'rare',
    bonusXp: 1.35,
    niveauRequis: 3,
  },
  {
    id: 'repos_court',
    nom: 'Chrono serré',
    emoji: '⏱️',
    description: 'Les repos sont raccourcis de 5 secondes. Ça change tout.',
    applique: true,
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 2,
  },
  {
    id: 'sol_en_lave',
    nom: 'Le sol est en lave',
    emoji: '🌋',
    description: 'Interdit de s\'asseoir ou de s\'allonger pendant les repos. Tu restes debout.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 1,
  },
  {
    id: 'peage',
    nom: 'Péage',
    emoji: '🚧',
    description: '5 squats à chaque changement d\'exercice. Personne ne passe gratuitement.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 2,
  },
  {
    id: 'isometrie_finale',
    nom: 'La statue',
    emoji: '🗿',
    description: 'Tiens 5 secondes en position basse sur la dernière répétition de chaque série.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 3,
  },
  {
    id: 'silence_total',
    nom: 'Silence radio',
    emoji: '🔇',
    description: 'Aucune musique, aucun podcast. Juste toi et ta respiration. Étonnamment dur.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'pyramide',
    nom: 'Pyramide',
    emoji: '🔺',
    description: 'Chaque tour ajoute 2 répétitions, ou 5 secondes pour les positions tenues. Le dernier fait mal.',
    applique: true,
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 4,
  },
  {
    id: 'miroir',
    nom: 'Le miroir',
    emoji: '🪞',
    description: 'Le dernier bloc se joue à l\'envers, du dernier exercice au premier.',
    applique: true,
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 2,
  },
  {
    id: 'apnee',
    nom: 'Souffle maîtrisé',
    emoji: '🌬️',
    description: 'Respire uniquement par le nez pendant tout l\'effort. Ça calme le rythme, ça durcit la tâche.',
    applique: false,
    rarete: 'rare',
    bonusXp: 1.25,
    niveauRequis: 5,
  },
  {
    id: 'sans_les_yeux',
    nom: 'À l\'aveugle',
    emoji: '🙈',
    description: 'Ferme les yeux sur les exercices au sol. L\'équilibre devient un sport.',
    applique: false,
    rarete: 'rare',
    bonusXp: 1.25,
    niveauRequis: 6,
  },
  {
    id: 'bonus_final',
    nom: 'Le boss caché',
    emoji: '👹',
    description: 'À la fin de la séance : 30 secondes de planche. Non négociable.',
    applique: false,
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 3,
  },
  {
    id: 'demi_amplitude',
    nom: 'Pulsations',
    emoji: '〰️',
    description: 'Les 3 dernières répétitions se font en demi-amplitude, sans jamais verrouiller.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 4,
  },
  {
    id: 'un_tour_de_plus',
    nom: 'Encore un',
    emoji: '➕',
    description: 'Un tour supplémentaire sur le dernier bloc, celui où tu n\'en avais déjà plus envie.',
    applique: true,
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 5,
  },
  {
    id: 'contre_la_montre',
    nom: 'Contre la montre',
    emoji: '🏁',
    description: 'Premier bloc sans aucun repos : tu enchaînes d\'un exercice à l\'autre.',
    applique: true,
    rarete: 'epique',
    bonusXp: 1.45,
    niveauRequis: 7,
  },
  {
    id: 'sans_les_mains',
    nom: 'Mains liées',
    emoji: '🤲',
    description: 'Sur les exercices de jambes : mains croisées derrière la tête, jamais sur les cuisses.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 2,
  },
  {
    id: 'variante_dure',
    nom: 'Montée en gamme',
    emoji: '⬆️',
    description: 'Chaque exercice est remplacé par sa version plus difficile, quand elle existe.',
    applique: true,
    rarete: 'epique',
    bonusXp: 1.5,
    niveauRequis: 8,
  },
  {
    id: 'compte_a_rebours',
    nom: 'Compte à rebours',
    emoji: '🔟',
    description: 'Compte tes répétitions à voix haute, à l\'envers. Oui, à voix haute.',
    applique: false,
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'echauffement_double',
    nom: 'Grand prêt',
    emoji: '🔥',
    description: 'Échauffement joué deux fois. Ton corps te remerciera demain.',
    applique: true,
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'finisher_gainage',
    nom: 'La cerise',
    emoji: '🍒',
    description: 'Après le dernier bloc : gainage maximum, jusqu\'à ce que ça lâche.',
    applique: false,
    rarete: 'epique',
    bonusXp: 1.4,
    niveauRequis: 6,
  },
];

export const MODIFICATEURS_PAR_ID: Record<string, Modificateur> = Object.fromEntries(
  MODIFICATEURS.map((m) => [m.id, m]),
);

const POIDS_RARETE: Record<Modificateur['rarete'], number> = {
  commune: 1,
  rare: 0.45,
  epique: 0.18,
};

export const LIBELLE_RARETE: Record<Modificateur['rarete'], string> = {
  commune: 'Commune',
  rare: 'Rare',
  epique: 'Épique',
};

/** Nombre de cartes tirées par défaut : plus on pousse fort, plus c'est épicé. */
export function nbModificateursPourIntensite(intensite: Intensite): number {
  return intensite === 1 ? 1 : intensite === 2 ? 1 : 2;
}

/**
 * Tire des cartes modificatrices jouables au niveau donné.
 *
 * `exclure` sert au re-tirage : on ne veut pas retomber sur la carte qu'on
 * vient justement de refuser.
 */
export function tirerModificateurs(
  alea: () => number,
  niveau: number,
  nombre: number,
  exclure: string[] = [],
): Modificateur[] {
  const candidats = MODIFICATEURS.filter(
    (m) => m.niveauRequis <= niveau && !exclure.includes(m.id),
  );
  if (candidats.length === 0) return [];

  return tirerPondere(alea, candidats, Math.min(nombre, candidats.length), (m) =>
    POIDS_RARETE[m.rarete],
  );
}

/** Multiplicateur d'XP cumulé des cartes actives. */
export function bonusXpCumule(modificateurs: Modificateur[]): number {
  return modificateurs.reduce((produit, m) => produit * m.bonusXp, 1);
}

/** Cartes qui entrent dans le jeu en atteignant ce niveau. */
export function modificateursDebloquesAuNiveau(niveau: number): Modificateur[] {
  return MODIFICATEURS.filter((m) => m.niveauRequis === niveau);
}
