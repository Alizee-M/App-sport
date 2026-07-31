import type { Modificateur, Intensite } from './types';
import { tirerPondere } from './alea';

/* ----------------------------------------------------------------------
 * Les cartes « règle du jeu ».
 *
 * Un catalogue d'exercices, même large, finit par tourner. Les cartes
 * modificatrices changent la *façon* de jouer les mêmes mouvements : un
 * squat en tempo lent n'a rien à voir avec un squat en pyramide. Chaque
 * carte impose une contrainte et paie en XP — accepter la contrainte est
 * toujours un choix, jamais une punition.
 * -------------------------------------------------------------------- */

export const MODIFICATEURS: Modificateur[] = [
  {
    id: 'tempo_escargot',
    nom: 'Tempo escargot',
    emoji: '🐌',
    description: '3 secondes pour descendre sur chaque répétition. Le muscle déteste, il progresse.',
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 1,
  },
  {
    id: 'dernier_tour_double',
    nom: 'Double peine',
    emoji: '✖️',
    description: 'Le dernier tour compte double : tu refais le bloc en entier avant de souffler.',
    rarete: 'rare',
    bonusXp: 1.35,
    niveauRequis: 3,
  },
  {
    id: 'repos_court',
    nom: 'Chrono serré',
    emoji: '⏱️',
    description: 'Les repos sont raccourcis de 5 secondes. Ça change tout.',
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 2,
  },
  {
    id: 'sol_en_lave',
    nom: 'Le sol est en lave',
    emoji: '🌋',
    description: 'Interdit de s\'asseoir ou de s\'allonger pendant les repos. Tu restes debout.',
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 1,
  },
  {
    id: 'peage',
    nom: 'Péage',
    emoji: '🚧',
    description: '5 squats à chaque changement d\'exercice. Personne ne passe gratuitement.',
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 2,
  },
  {
    id: 'isometrie_finale',
    nom: 'La statue',
    emoji: '🗿',
    description: 'Tiens 5 secondes en position basse sur la dernière répétition de chaque série.',
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 3,
  },
  {
    id: 'silence_total',
    nom: 'Silence radio',
    emoji: '🔇',
    description: 'Aucune musique, aucun écran. Juste toi et ta respiration. Étonnamment dur.',
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'pyramide',
    nom: 'Pyramide',
    emoji: '🔺',
    description: 'Chaque tour ajoute 2 répétitions au précédent. Le dernier fait mal.',
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 4,
  },
  {
    id: 'miroir',
    nom: 'Le miroir',
    emoji: '🪞',
    description: 'Le dernier bloc se joue à l\'envers, du dernier exercice au premier.',
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 2,
  },
  {
    id: 'apnee',
    nom: 'Souffle maîtrisé',
    emoji: '🌬️',
    description: 'Respire uniquement par le nez pendant tout l\'effort. Ça calme le rythme, ça durcit la tâche.',
    rarete: 'rare',
    bonusXp: 1.25,
    niveauRequis: 5,
  },
  {
    id: 'sans_les_yeux',
    nom: 'À l\'aveugle',
    emoji: '🙈',
    description: 'Ferme les yeux sur les exercices au sol. L\'équilibre devient un sport.',
    rarete: 'rare',
    bonusXp: 1.25,
    niveauRequis: 6,
  },
  {
    id: 'bonus_final',
    nom: 'Le boss caché',
    emoji: '👹',
    description: 'À la fin de la séance : 30 secondes de planche. Non négociable.',
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 3,
  },
  {
    id: 'demi_amplitude',
    nom: 'Pulsations',
    emoji: '〰️',
    description: 'Les 3 dernières répétitions se font en demi-amplitude, sans jamais verrouiller.',
    rarete: 'commune',
    bonusXp: 1.2,
    niveauRequis: 4,
  },
  {
    id: 'un_tour_de_plus',
    nom: 'Encore un',
    emoji: '➕',
    description: 'Un tour supplémentaire sur le bloc de ton choix. À toi de voir lequel.',
    rarete: 'rare',
    bonusXp: 1.3,
    niveauRequis: 5,
  },
  {
    id: 'contre_la_montre',
    nom: 'Contre la montre',
    emoji: '🏁',
    description: 'Enchaîne le premier bloc sans aucun repos, le plus vite possible.',
    rarete: 'epique',
    bonusXp: 1.45,
    niveauRequis: 7,
  },
  {
    id: 'sans_les_mains',
    nom: 'Mains liées',
    emoji: '🤲',
    description: 'Sur les exercices de jambes : mains croisées derrière la tête, jamais sur les cuisses.',
    rarete: 'commune',
    bonusXp: 1.15,
    niveauRequis: 2,
  },
  {
    id: 'variante_dure',
    nom: 'Montée en gamme',
    emoji: '⬆️',
    description: 'Prends systématiquement la variante plus difficile quand elle est proposée.',
    rarete: 'epique',
    bonusXp: 1.5,
    niveauRequis: 8,
  },
  {
    id: 'compte_a_rebours',
    nom: 'Compte à rebours',
    emoji: '🔟',
    description: 'Compte tes répétitions à voix haute, à l\'envers. Oui, à voix haute.',
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'echauffement_double',
    nom: 'Grand prêt',
    emoji: '🔥',
    description: 'Échauffement joué deux fois. Ton corps de 40 ans te remerciera.',
    rarete: 'commune',
    bonusXp: 1.1,
    niveauRequis: 1,
  },
  {
    id: 'finisher_gainage',
    nom: 'La cerise',
    emoji: '🍒',
    description: 'Après le dernier bloc : gainage maximum, jusqu\'à ce que ça lâche.',
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
