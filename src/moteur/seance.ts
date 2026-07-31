import type {
  Bloc,
  Exercice,
  ExercicePrescrit,
  Famille,
  Intensite,
  OptionsTirage,
  Seance,
  Stat,
} from './types';
import { creerAlea, choisirUn, tirerPondere } from './alea';
import { exercicesDisponibles } from './exercices';
import { tirerModificateurs, nbModificateursPourIntensite, bonusXpCumule } from './modificateurs';
import { xpPotentielSeance } from './progression';

/* ----------------------------------------------------------------------
 * Le tirage d'une séance.
 *
 * Trois garde-fous, dans cet ordre de priorité :
 *   1. la séance doit être faisable (niveau, matériel, bruit) ;
 *   2. elle doit tenir dans le temps annoncé ;
 *   3. elle doit être différente de la précédente.
 *
 * Le point 3 est le but de l'app, mais il ne passe jamais devant les deux
 * autres : une séance surprenante mais infaisable ne sert à rien.
 * -------------------------------------------------------------------- */

const TEMPS_TRAVAIL: Record<Intensite, number> = { 1: 30, 2: 40, 3: 45 };
const TEMPS_REPOS: Record<Intensite, number> = { 1: 30, 2: 20, 3: 15 };
const REPOS_ENTRE_BLOCS = 60;

/** Familles qui constituent le corps de séance (hors mobilité). */
const FAMILLES_EFFORT: Famille[] = ['pousse', 'tire', 'jambes', 'gainage', 'cardio'];

/** Familles privilégiées selon le focus choisi. */
const FAMILLES_PAR_FOCUS: Record<Stat, Famille[]> = {
  force: ['pousse', 'tire', 'jambes'],
  cardio: ['cardio'],
  gainage: ['gainage'],
  souplesse: ['mobilite', 'gainage'],
};

const NOMS_BLOCS = [
  'L\'Escarmouche',
  'La Montée en Pression',
  'Le Cœur de la Mêlée',
  'La Dernière Ligne',
  'Le Second Souffle',
  'L\'Embuscade',
  'La Traversée',
  'Le Verrou',
];

const ADJECTIFS_SEANCE = [
  'du Guerrier',
  'de l\'Aube',
  'des Braves',
  'du Parquet',
  'sans Pitié',
  'du Salon Hanté',
  'de la Dernière Chance',
  'des Genoux qui Craquent',
  'du Réveil Difficile',
  'de la Moquette Sacrée',
];

const NOMS_SEANCE = [
  'Le Rituel',
  'La Tournée',
  'L\'Ascension',
  'Le Circuit',
  'La Marche',
  'L\'Épreuve',
  'Le Passage',
  'La Ronde',
];

function titreSeance(alea: () => number): string {
  return `${choisirUn(alea, NOMS_SEANCE)} ${choisirUn(alea, ADJECTIFS_SEANCE)}`;
}

/* --------------------------- Pondération ----------------------------- */

/**
 * Pénalité de fraîcheur : un exercice fait récemment devient peu probable,
 * un exercice jamais tiré reçoit un léger coup de pouce. C'est ce qui
 * empêche le tirage de retomber sur les mêmes valeurs sûres.
 */
function poidsFraicheur(exercice: Exercice, historiqueIds: string[]): number {
  const position = historiqueIds.indexOf(exercice.id);
  if (position === -1) return 1.25;
  const anciennete = position / Math.max(1, historiqueIds.length);
  return 0.1 + 0.9 * anciennete;
}

/** Difficulté visée : monte avec le niveau du héros et l'intensité choisie. */
function difficulteCible(niveau: number, intensite: Intensite): number {
  const cible = 1 + niveau / 6 + (intensite - 2);
  return Math.min(5, Math.max(1, cible));
}

function poidsDifficulte(exercice: Exercice, cible: number): number {
  return 1 / (1 + Math.abs(exercice.difficulte - cible));
}

function poidsFocus(exercice: Exercice, focus: OptionsTirage['focus']): number {
  if (focus === 'complet') return 1;
  const familles = FAMILLES_PAR_FOCUS[focus];
  const contribue = (exercice.stats[focus] ?? 0) > 0;
  const bonneFamille = familles.includes(exercice.famille);
  if (contribue && bonneFamille) return 2.6;
  if (contribue || bonneFamille) return 1.6;
  return 0.5;
}

/* ---------------------------- Prescription --------------------------- */

/**
 * Dose un exercice pour la fenêtre de travail du bloc.
 *
 * Les exercices au temps occupent toute la fenêtre ; ceux en répétitions
 * reçoivent un objectif calibré pour être atteignable dans cette même
 * fenêtre — sinon le circuit part en vrille dès le premier tour.
 */
function prescrire(
  exercice: Exercice,
  travailSec: number,
  intensite: Intensite,
  niveau: number,
): ExercicePrescrit {
  if (exercice.mesure === 'temps') {
    return { exercice, secondes: travailSec };
  }

  const facteurIntensite = 1 + (intensite - 2) * 0.15;
  const facteurNiveau = 1 + Math.min(niveau, 20) * 0.02;
  const facteurFenetre = travailSec / 35;
  const reps = Math.round(exercice.base * facteurIntensite * facteurNiveau * facteurFenetre);

  return { exercice, reps: Math.max(4, Math.min(40, reps)) };
}

/** Exercices de mobilité / d'étirement : ils gardent leur propre durée. */
function prescrireMobilite(exercice: Exercice): ExercicePrescrit {
  return { exercice, secondes: exercice.base };
}

/* ------------------------- Structure temporelle ---------------------- */

interface StructureBlocs {
  nbBlocs: number;
  exoParBloc: number;
  tours: number;
  travailSec: number;
  reposSec: number;
}

function dureeBlocs(structure: StructureBlocs): number {
  const dureeTour =
    structure.exoParBloc * (structure.travailSec + structure.reposSec);
  return (
    structure.nbBlocs * structure.tours * dureeTour +
    (structure.nbBlocs - 1) * REPOS_ENTRE_BLOCS
  );
}

/**
 * Choisit le découpage (nombre de blocs × tours) qui colle au mieux au
 * temps disponible. À écart de durée équivalent, on préfère plus de blocs :
 * plus de blocs = plus d'exercices distincts = moins de monotonie.
 */
function choisirStructure(budgetSec: number, intensite: Intensite, court: boolean): StructureBlocs {
  const travailSec = TEMPS_TRAVAIL[intensite];
  const reposSec = TEMPS_REPOS[intensite];
  const exoParBloc = court ? 3 : 4;

  let meilleure: StructureBlocs | null = null;
  let meilleurEcart = Infinity;

  for (let nbBlocs = 1; nbBlocs <= 4; nbBlocs++) {
    for (let tours = 2; tours <= 6; tours++) {
      const candidate: StructureBlocs = { nbBlocs, exoParBloc, tours, travailSec, reposSec };
      const ecart = Math.abs(dureeBlocs(candidate) - budgetSec);
      if (ecart < meilleurEcart - 1 || (ecart <= meilleurEcart + 1 && nbBlocs > (meilleure?.nbBlocs ?? 0))) {
        meilleure = candidate;
        meilleurEcart = Math.min(ecart, meilleurEcart);
      }
    }
  }

  return meilleure ?? { nbBlocs: 1, exoParBloc, tours: 3, travailSec, reposSec };
}

/* ------------------------------ Tirage ------------------------------- */

function tirerPourBloc(
  alea: () => number,
  pool: Exercice[],
  nombre: number,
  options: OptionsTirage,
  dejaDansSeance: Set<string>,
  cibleDifficulte: number,
): Exercice[] {
  return tirerPondere(alea, pool, nombre, (exercice, dejaTires) => {
    let poids = 1;
    poids *= poidsFraicheur(exercice, options.historiqueIds);
    poids *= poidsDifficulte(exercice, cibleDifficulte);
    poids *= poidsFocus(exercice, options.focus);

    // Déjà présent ailleurs dans la séance : très improbable, mais possible
    // si le deck disponible est trop petit pour remplir tous les blocs.
    if (dejaDansSeance.has(exercice.id)) poids *= 0.05;

    // Une famille pas encore représentée dans ce bloc passe devant.
    const famillesDuBloc = new Set(dejaTires.map((e) => e.famille));
    if (!famillesDuBloc.has(exercice.famille)) poids *= 1.9;

    return poids;
  });
}

/**
 * Construit une séance complète et jouable à partir d'une graine.
 *
 * Deux appels avec la même graine et les mêmes options rendent exactement
 * la même séance : c'est ce qui permet de re-tirer une carte isolée sans
 * que le reste bouge, et de rejouer une séance du journal à l'identique.
 */
export function genererSeance(options: OptionsTirage): Seance {
  const alea = creerAlea(options.seed);
  const type = options.type ?? 'libre';
  const court = options.dureeMin <= 15;

  const filtreBase = {
    niveau: options.niveau,
    materielDispo: options.materielDispo,
    silencieux: options.silencieux,
  };

  /* --- Échauffement : jamais négociable, même sur une séance de 10 min --- */
  const poolEchauffement = exercicesDisponibles({ ...filtreBase, phase: 'echauffement' });
  const echauffement = tirerPondere(
    alea,
    poolEchauffement,
    Math.min(court ? 3 : 4, poolEchauffement.length),
    (e) => poidsFraicheur(e, options.historiqueIds),
  ).map(prescrireMobilite);

  /* --- Retour au calme --- */
  const poolEtirements = exercicesDisponibles({ ...filtreBase, phase: 'retour_calme' });
  const retourCalme = tirerPondere(
    alea,
    poolEtirements,
    Math.min(court ? 2 : 3, poolEtirements.length),
    (e) => poidsFraicheur(e, options.historiqueIds),
  ).map(prescrireMobilite);

  const secondesEchauffement = echauffement.reduce((s, p) => s + (p.secondes ?? 0), 0);
  const secondesRetourCalme = retourCalme.reduce((s, p) => s + (p.secondes ?? 0), 0);

  /* --- Corps de séance --- */
  const budget = Math.max(
    120,
    options.dureeMin * 60 - secondesEchauffement - secondesRetourCalme,
  );
  const structure = choisirStructure(budget, options.intensite, court);

  const poolEffort = exercicesDisponibles({
    ...filtreBase,
    phase: 'bloc',
    familles: FAMILLES_EFFORT,
  });
  const cible = difficulteCible(options.niveau, options.intensite);
  const dejaDansSeance = new Set<string>();
  const blocs: Bloc[] = [];

  for (let i = 0; i < structure.nbBlocs; i++) {
    const choisis = tirerPourBloc(
      alea,
      poolEffort,
      Math.min(structure.exoParBloc, poolEffort.length),
      options,
      dejaDansSeance,
      cible,
    );
    for (const e of choisis) dejaDansSeance.add(e.id);

    blocs.push({
      nom: NOMS_BLOCS[i % NOMS_BLOCS.length],
      tours: structure.tours,
      travailSec: structure.travailSec,
      reposSec: structure.reposSec,
      exercices: choisis.map((e) =>
        prescrire(e, structure.travailSec, options.intensite, options.niveau),
      ),
    });
  }

  /* --- Cartes modificatrices --- */
  const nbCartes = options.nbModificateurs ?? nbModificateursPourIntensite(options.intensite);
  const modificateurs = tirerModificateurs(alea, options.niveau, nbCartes);

  const dureeEstimeeSec =
    secondesEchauffement + secondesRetourCalme + dureeBlocs(structure);

  return {
    seed: options.seed,
    type,
    titre: options.titre ?? titreSeance(alea),
    echauffement,
    blocs,
    retourCalme,
    modificateurs,
    dureeEstimeeSec,
    intensite: options.intensite,
    focus: options.focus,
    xpPotentiel: xpPotentielSeance(
      dureeEstimeeSec,
      options.intensite,
      type,
      bonusXpCumule(modificateurs),
    ),
  };
}

/**
 * Remplace un exercice précis par un autre, sans toucher au reste.
 *
 * C'est la soupape : quand une carte ne donne pas envie (blessure, exercice
 * détesté, voisin qui dort), on l'échange au lieu d'abandonner la séance.
 */
export function retirerExercice(
  seance: Seance,
  indexBloc: number,
  indexExercice: number,
  options: OptionsTirage,
  graineRetirage: number,
): Seance {
  const bloc = seance.blocs[indexBloc];
  if (!bloc) return seance;
  const actuel = bloc.exercices[indexExercice];
  if (!actuel) return seance;

  const utilises = new Set<string>();
  for (const b of seance.blocs) {
    for (const p of b.exercices) utilises.add(p.exercice.id);
  }

  const pool = exercicesDisponibles({
    phase: 'bloc',
    niveau: options.niveau,
    materielDispo: options.materielDispo,
    silencieux: options.silencieux,
    familles: FAMILLES_EFFORT,
  }).filter((e) => e.id !== actuel.exercice.id);

  if (pool.length === 0) return seance;

  const alea = creerAlea(graineRetirage);
  const cible = difficulteCible(options.niveau, options.intensite);
  const [remplacant] = tirerPondere(alea, pool, 1, (e) => {
    let poids = poidsDifficulte(e, cible) * poidsFocus(e, options.focus);
    poids *= poidsFraicheur(e, options.historiqueIds);
    if (utilises.has(e.id)) poids *= 0.05;
    // On garde la famille du slot quand c'est possible, pour ne pas
    // déséquilibrer un bloc soigneusement réparti.
    if (e.famille === actuel.exercice.famille) poids *= 2.2;
    return poids;
  });

  if (!remplacant) return seance;

  const blocs = seance.blocs.map((b, i) => {
    if (i !== indexBloc) return b;
    const exercices = b.exercices.map((p, j) =>
      j === indexExercice
        ? prescrire(remplacant, b.travailSec, seance.intensite, options.niveau)
        : p,
    );
    return { ...b, exercices };
  });

  return { ...seance, blocs };
}

/**
 * Remplace une carte modificatrice par une autre.
 *
 * Refuser une contrainte est permis, mais le tirage repart du même vivier :
 * on échange une règle contre une autre, on ne s'en débarrasse pas.
 */
export function retirerModificateur(
  seance: Seance,
  index: number,
  niveau: number,
  graineRetirage: number,
): Seance {
  const actuel = seance.modificateurs[index];
  if (!actuel) return seance;

  const alea = creerAlea(graineRetirage);
  const exclure = seance.modificateurs.map((m) => m.id);
  const [remplacant] = tirerModificateurs(alea, niveau, 1, exclure);
  if (!remplacant) return seance;

  const modificateurs = seance.modificateurs.map((m, i) => (i === index ? remplacant : m));

  return {
    ...seance,
    modificateurs,
    xpPotentiel: xpPotentielSeance(
      seance.dureeEstimeeSec,
      seance.intensite,
      seance.type,
      bonusXpCumule(modificateurs),
    ),
  };
}

/** Tous les identifiants d'exercices d'une séance, échauffement compris. */
export function idsExercices(seance: Seance): string[] {
  const ids: string[] = [];
  for (const p of seance.echauffement) ids.push(p.exercice.id);
  for (const b of seance.blocs) for (const p of b.exercices) ids.push(p.exercice.id);
  for (const p of seance.retourCalme) ids.push(p.exercice.id);
  return ids;
}

/** Nombre total de créneaux d'effort à enchaîner (pour la barre de progression). */
export function nombreEtapes(seance: Seance): number {
  const effort = seance.blocs.reduce(
    (total, b) => total + b.tours * b.exercices.length,
    0,
  );
  return seance.echauffement.length + effort + seance.retourCalme.length;
}
