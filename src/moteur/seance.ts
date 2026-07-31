import type {
  Bloc,
  Exercice,
  ExercicePrescrit,
  Famille,
  Intensite,
  Materiel,
  OptionsTirage,
  Seance,
  Stat,
  ZoneCorps,
} from './types';
import { creerAlea, choisirUn, tirerPondere } from './alea';
import { exercicesDisponibles, exerciceParId, zonesDe } from './exercices';
import {
  tirerModificateurs,
  nbModificateursPourIntensite,
  bonusXpCumule,
  MODIFICATEURS_PAR_ID,
} from './modificateurs';
import { xpPotentielSeance } from './progression';
import { construireEtapes, dureeTotaleEtapes } from './deroulement';
import type { LigneQuete } from './systeme';

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

/** Durée typique d'un exercice de mobilité, pour réserver son temps. */
const DUREE_MOBILITE_TYPE = 35;

/** Zones du corps que le corps de séance va réellement solliciter. */
function zonesSollicitees(blocs: Bloc[]): Set<ZoneCorps> {
  const zones = new Set<ZoneCorps>();
  for (const bloc of blocs) {
    for (const prescrit of bloc.exercices) {
      for (const zone of zonesDe(prescrit.exercice)) zones.add(zone);
    }
  }
  return zones;
}

/**
 * Favorise les exercices de mobilité qui préparent — ou relâchent — les
 * zones effectivement travaillées. Sans cela, on pouvait s'échauffer les
 * épaules avant une séance entièrement consacrée aux jambes.
 */
function poidsZones(exercice: Exercice, zonesVisees: Set<ZoneCorps>): number {
  const zones = zonesDe(exercice);
  if (zones.length === 0 || zonesVisees.size === 0) return 1;

  const communes = zones.filter((z) => zonesVisees.has(z)).length;
  return 1 + 2.2 * communes;
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

  let meilleure: StructureBlocs = { nbBlocs: 1, exoParBloc, tours: 3, travailSec, reposSec };
  let meilleurEcart = Math.abs(dureeBlocs(meilleure) - budgetSec);

  for (let nbBlocs = 1; nbBlocs <= 4; nbBlocs++) {
    for (let tours = 2; tours <= 6; tours++) {
      const candidate: StructureBlocs = { nbBlocs, exoParBloc, tours, travailSec, reposSec };
      const ecart = Math.abs(dureeBlocs(candidate) - budgetSec);

      // À une seconde près, deux découpages sont équivalents pour qui les
      // exécute : on tranche alors en faveur du plus varié.
      const nettementMieux = ecart < meilleurEcart - 1;
      const equivalent = Math.abs(ecart - meilleurEcart) <= 1;

      if (nettementMieux || (equivalent && nbBlocs > meilleure.nbBlocs)) {
        meilleure = candidate;
        meilleurEcart = ecart;
      }
    }
  }

  return meilleure;
}

/* --------------------- Effets des cartes du jour ---------------------- */

/**
 * Applique à la séance les cartes qui la transforment réellement.
 *
 * Sans cette étape, une carte annonçant « repos raccourcis » laisserait
 * le chrono afficher la même durée qu'avant : la règle serait un texte
 * décoratif que l'écran contredit. Les cartes qui portent sur la façon
 * de bouger (tempo, respiration) n'ont évidemment rien à faire ici.
 */
function appliquerModificateurs(
  seance: Seance,
  options: OptionsTirage,
): Seance {
  const actifs = new Set(seance.modificateurs.map((m) => m.id));
  if (actifs.size === 0) return seance;

  let echauffement = seance.echauffement;
  let blocs = seance.blocs.map((bloc) => ({ ...bloc }));

  if (actifs.has('echauffement_double')) {
    echauffement = [...echauffement, ...echauffement];
  }

  if (actifs.has('repos_court')) {
    blocs = blocs.map((bloc) => ({ ...bloc, reposSec: Math.max(5, bloc.reposSec - 5) }));
  }

  if (actifs.has('dernier_tour_double')) {
    blocs = blocs.map((bloc) => ({ ...bloc, tours: bloc.tours + 1 }));
  }

  if (actifs.has('pyramide')) {
    blocs = blocs.map((bloc) => ({ ...bloc, progressionReps: 2, progressionSecondes: 5 }));
  }

  if (actifs.has('variante_dure')) {
    blocs = blocs.map((bloc) => ({
      ...bloc,
      exercices: bloc.exercices.map((prescrit) => {
        const plusDur = versionPlusDure(prescrit.exercice, options);
        return plusDur
          ? prescrire(plusDur, bloc.travailSec, seance.intensite, options.niveau)
          : prescrit;
      }),
    }));
  }

  // Ces deux-là ne visent qu'un bloc précis : on les applique en dernier,
  // pour qu'elles portent sur les blocs déjà transformés.
  if (actifs.has('contre_la_montre') && blocs.length > 0) {
    blocs[0] = { ...blocs[0], reposSec: 0 };
  }

  if (actifs.has('un_tour_de_plus') && blocs.length > 0) {
    const dernier = blocs.length - 1;
    blocs[dernier] = { ...blocs[dernier], tours: blocs[dernier].tours + 1 };
  }

  if (actifs.has('miroir') && blocs.length > 0) {
    const dernier = blocs.length - 1;
    blocs[dernier] = { ...blocs[dernier], exercices: [...blocs[dernier].exercices].reverse() };
  }

  return { ...seance, echauffement, blocs };
}

function estJouable(exercice: Exercice, options: OptionsTirage): boolean {
  if (exercice.niveauRequis > options.niveau) return false;
  if (options.silencieux && exercice.bruit === 'bruyant') return false;
  return exercice.materiel.every((m) => options.materielDispo.includes(m));
}

/**
 * Version plus difficile d'un exercice, jouable ici et maintenant.
 *
 * On préfère la variante déclarée dans le catalogue, plus juste
 * techniquement. À défaut, on remonte d'un cran dans la même famille :
 * sans cette solution de repli, la carte ne mordait quasiment jamais à
 * haut niveau, puisque seuls les exercices faciles — ceux qui ne sortent
 * plus — déclarent une variante.
 */
function versionPlusDure(exercice: Exercice, options: OptionsTirage): Exercice | null {
  const declaree = exercice.plusDur ? exerciceParId(exercice.plusDur) : undefined;
  if (declaree && estJouable(declaree, options)) return declaree;

  const candidats = exercicesDisponibles({
    phase: 'bloc',
    niveau: options.niveau,
    materielDispo: options.materielDispo,
    silencieux: options.silencieux,
    familles: [exercice.famille],
  })
    .filter((e) => e.difficulte > exercice.difficulte)
    .sort((a, b) => a.difficulte - b.difficulte);

  return candidats[0] ?? null;
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
    const principal = options.exercicePrincipal === exercice.id;
    const soutien = options.exercicesPrioritaires?.includes(exercice.id) ?? false;

    let poids = 1;
    poids *= poidsFraicheur(exercice, options.historiqueIds);
    poids *= poidsFocus(exercice, options.focus);

    if (principal) {
      // L'exercice du palier de compétence doit sortir presque à chaque
      // séance, sinon la voie n'avance pas. Il échappe aussi au filtre de
      // difficulté : on travaille le geste que la voie impose, même s'il
      // est plus facile que le niveau atteint. Sans cette exemption, une
      // voie ne serait qu'un tableau de bord.
      poids *= 40;
    } else if (soutien) {
      poids *= 3 * poidsDifficulte(exercice, cibleDifficulte);
    } else {
      poids *= poidsDifficulte(exercice, cibleDifficulte);
    }

    // Déjà présent ailleurs dans la séance : très improbable, mais possible
    // si le deck disponible est trop petit pour remplir tous les blocs.
    // Un palier de compétence, lui, gagne à revenir sur plusieurs blocs.
    if (dejaDansSeance.has(exercice.id)) poids *= principal ? 0.5 : 0.05;

    // Une famille pas encore représentée dans ce bloc passe devant, pour
    // éviter quatre exercices de jambes d'affilée. Mais quand un focus est
    // demandé, cette recherche de variété doit s'effacer : choisir
    // « Cardio » et recevoir un panachage serait ne pas écouter la demande.
    const famillesDuBloc = new Set(dejaTires.map((e) => e.famille));
    if (!famillesDuBloc.has(exercice.famille)) {
      poids *= options.focus === 'complet' ? 1.9 : 1.15;
    }

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

  const nbEchauffement = court ? 3 : 4;
  const nbEtirements = court ? 2 : 3;

  /* --- Corps de séance ---
   * Il se tire en premier : l'échauffement et les étirements doivent
   * ensuite pouvoir cibler ce qui sera réellement sollicité. On réserve
   * leur temps sur une estimation (ces exercices durent 30 à 45 s) ; la
   * durée finalement annoncée est mesurée sur le déroulé, pas déduite
   * de cette approximation. */
  const budget = Math.max(
    120,
    options.dureeMin * 60 - nbEchauffement * DUREE_MOBILITE_TYPE - nbEtirements * DUREE_MOBILITE_TYPE,
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

  /* --- Échauffement et étirements, ciblés sur ce qui va travailler ---
   * Jamais négociables, même sur une séance de 10 minutes. */
  const zonesVisees = zonesSollicitees(blocs);

  const poolEchauffement = exercicesDisponibles({ ...filtreBase, phase: 'echauffement' });
  const echauffement = tirerPondere(
    alea,
    poolEchauffement,
    Math.min(nbEchauffement, poolEchauffement.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  const poolEtirements = exercicesDisponibles({ ...filtreBase, phase: 'retour_calme' });
  const retourCalme = tirerPondere(
    alea,
    poolEtirements,
    Math.min(nbEtirements, poolEtirements.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  /* --- Cartes modificatrices --- */
  const nbCartes = options.nbModificateurs ?? nbModificateursPourIntensite(options.intensite);
  const modificateurs = options.modificateursImposes
    ? options.modificateursImposes
        .map((id) => MODIFICATEURS_PAR_ID[id])
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
    : tirerModificateurs(alea, options.niveau, nbCartes);

  const provisoire: Seance = {
    seed: options.seed,
    type,
    titre: options.titre ?? titreSeance(alea),
    echauffement,
    blocs,
    retourCalme,
    modificateurs,
    dureeEstimeeSec: 0,
    dureeDemandeeMin: options.dureeMin,
    intensite: options.intensite,
    focus: options.focus,
    xpPotentiel: 0,
  };

  const transformee = appliquerModificateurs(provisoire, options);

  // La durée annoncée est mesurée sur le déroulé réel plutôt que
  // recalculée en parallèle : c'est la seule façon qu'elle ne puisse pas
  // mentir, y compris quand une carte ajoute un tour ou supprime les
  // repos.
  const dureeEstimeeSec = dureeTotaleEtapes(construireEtapes(transformee));

  return {
    ...transformee,
    dureeEstimeeSec,
    xpPotentiel: xpPotentielSeance(
      dureeEstimeeSec,
      options.intensite,
      type,
      bonusXpCumule(modificateurs),
    ),
  };
}

/* ------------------------ La quête journalière ------------------------ */

/**
 * Découpe un objectif de quête en séries faisables.
 *
 * On ne cherche que des découpages exacts : « 3 tours de 15 » doit faire
 * exactement les 45 répétitions demandées. Annoncer 45 et en faire faire
 * 48 parce que le compte tombe mal serait la même trahison qu'une durée
 * qui ne correspond pas au déroulé.
 */
export function decouperObjectif(
  objectif: number,
  mesure: 'reps' | 'temps',
): { tours: number; parTour: number } {
  const ideal = mesure === 'reps' ? 12 : 40;
  const minimum = mesure === 'reps' ? 5 : 15;

  let meilleure = { tours: 1, parTour: objectif };
  let meilleurEcart = Math.abs(objectif - ideal);

  for (let tours = 2; tours <= 6; tours++) {
    if (objectif % tours !== 0) continue;
    const parTour = objectif / tours;
    // En dessous, ce n'est plus une série, c'est un aller-retour.
    if (parTour < minimum) continue;

    const ecart = Math.abs(parTour - ideal);
    if (ecart < meilleurEcart) {
      meilleure = { tours, parTour };
      meilleurEcart = ecart;
    }
  }
  return meilleure;
}

/** Temps à laisser pour une série de répétitions, arrondi à 5 s. */
function fenetrePourReps(reps: number): number {
  return Math.max(20, Math.min(75, Math.round((reps * 3) / 5) * 5));
}

/**
 * Transforme la quête journalière en séance guidée.
 *
 * Une quête affichée sous forme de liste à cocher se fait « quand on y
 * pense », c'est-à-dire jamais. En faire une séance lui donne le même
 * accompagnement qu'au reste de l'app : échauffement adapté, minuteur,
 * repères sonores, retour au calme.
 *
 * Le contrat est strict : la somme des tours redonne exactement l'objectif
 * annoncé sur l'écran de statut.
 */
export function genererSeanceQuete(
  quete: { lignes: LigneQuete[]; xpRecompense: number },
  options: OptionsTirage,
): Seance {
  const alea = creerAlea(options.seed);

  const filtreBase = {
    niveau: options.niveau,
    materielDispo: options.materielDispo,
    silencieux: options.silencieux,
  };

  /* --- Un bloc par ligne de quête ---
   * Regrouper les trois exercices en circuit obligerait à un nombre de
   * tours commun, donc à trahir au moins un des trois objectifs. */
  const blocs: Bloc[] = [];
  for (const ligne of quete.lignes) {
    const exercice = exerciceParId(ligne.exerciceId);
    if (!exercice) continue;

    const mesure = ligne.unite === 'reps' ? 'reps' : 'temps';
    const { tours, parTour } = decouperObjectif(ligne.objectif, mesure);

    blocs.push({
      nom: exercice.nom,
      tours,
      travailSec: mesure === 'reps' ? fenetrePourReps(parTour) : parTour,
      reposSec: 30,
      exercices: [
        mesure === 'reps'
          ? { exercice, reps: parTour }
          : { exercice, secondes: parTour },
      ],
    });
  }

  const zonesVisees = zonesSollicitees(blocs);

  const poolEchauffement = exercicesDisponibles({ ...filtreBase, phase: 'echauffement' });
  const echauffement = tirerPondere(
    alea,
    poolEchauffement,
    Math.min(3, poolEchauffement.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  const poolEtirements = exercicesDisponibles({ ...filtreBase, phase: 'retour_calme' });
  const retourCalme = tirerPondere(
    alea,
    poolEtirements,
    Math.min(2, poolEtirements.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  const seance: Seance = {
    seed: options.seed,
    type: 'quete',
    titre: 'Quête journalière',
    echauffement,
    blocs,
    retourCalme,
    // Une quête est déjà une contrainte imposée : lui ajouter une règle du
    // jour tirée au sort en ferait une double peine.
    modificateurs: [],
    dureeEstimeeSec: 0,
    dureeDemandeeMin: 0,
    intensite: options.intensite,
    focus: 'complet',
    // La récompense est celle qu'annonce la quête, ni plus ni moins : le
    // barème habituel à la minute donnerait un autre chiffre que celui
    // affiché sur l'écran de statut.
    xpPotentiel: quete.xpRecompense,
  };

  const dureeEstimeeSec = dureeTotaleEtapes(construireEtapes(seance));
  return { ...seance, dureeEstimeeSec, dureeDemandeeMin: Math.round(dureeEstimeeSec / 60) };
}

/* ---------------------- L'entraînement d'une voie --------------------- */

/**
 * Repos entre deux séries du geste travaillé.
 *
 * Deux fois plus long que dans un circuit, et c'est voulu : un équilibre
 * ou une pompe sur un bras s'apprennent frais. Enchaîner à bout de souffle
 * n'entraîne plus la compétence, seulement la fatigue.
 */
const REPOS_GESTE = 45;

export type TirageVoie =
  | { possible: true; seance: Seance }
  | { possible: false; materielManquant: Materiel[] };

/**
 * La séance dédiée à une voie de compétence.
 *
 * Le tirage ordinaire glisse l'exercice de l'étape au milieu d'autre
 * chose ; ici toute la séance est construite autour de lui : le geste
 * d'abord, à froid et avec du repos, puis ses appuis en circuit.
 *
 * Le niveau requis est délibérément ignoré — la voie *est* le chemin de
 * déblocage, et ses étapes ne s'atteignent qu'après avoir passé les
 * précédentes. Le matériel et le bruit, eux, sont des contraintes
 * physiques : on ne les contourne pas, on le dit.
 */
export function genererSeanceVoie(
  palierExerciceId: string,
  soutiensIds: string[],
  nomVoie: string,
  options: OptionsTirage,
): TirageVoie {
  const geste = exerciceParId(palierExerciceId);
  if (!geste) return { possible: false, materielManquant: [] };

  const manquant = geste.materiel.filter((m) => !options.materielDispo.includes(m));
  if (manquant.length > 0 || (options.silencieux && geste.bruit === 'bruyant')) {
    return { possible: false, materielManquant: manquant };
  }

  const alea = creerAlea(options.seed);
  const filtreBase = {
    niveau: options.niveau,
    materielDispo: options.materielDispo,
    silencieux: options.silencieux,
  };

  const travailSec = TEMPS_TRAVAIL[options.intensite];

  const appuis = soutiensIds
    .map((id) => exerciceParId(id))
    .filter((e): e is Exercice => Boolean(e) && estJouable(e!, { ...options, niveau: 99 }))
    .filter((e) => e.id !== geste.id)
    .slice(0, 3);

  /* --- Échauffement et étirements, tirés une seule fois ---
   * Les zones sont connues d'avance : ce sont celles du geste et de ses
   * appuis. On les tire avant la boucle de calibrage pour que le hasard
   * ne dépende pas du nombre de tours retenu. */
  const zonesVisees = new Set<ZoneCorps>();
  for (const exercice of [geste, ...appuis]) {
    for (const zone of zonesDe(exercice)) zonesVisees.add(zone);
  }

  const court = options.dureeMin <= 15;

  const poolEchauffement = exercicesDisponibles({ ...filtreBase, phase: 'echauffement' });
  const echauffement = tirerPondere(
    alea,
    poolEchauffement,
    Math.min(court ? 3 : 4, poolEchauffement.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  const poolEtirements = exercicesDisponibles({ ...filtreBase, phase: 'retour_calme' });
  const retourCalme = tirerPondere(
    alea,
    poolEtirements,
    Math.min(court ? 2 : 3, poolEtirements.length),
    (e) => poidsFraicheur(e, options.historiqueIds) * poidsZones(e, zonesVisees),
  ).map(prescrireMobilite);

  /* --- De quoi remplir une séance longue ---
   * Répéter le geste pendant quarante-cinq minutes n'entraîne pas une
   * compétence, ça détruit des épaules. Au-delà de ce que le travail
   * technique supporte, on complète par un bloc ordinaire plutôt que de
   * rendre une séance deux fois plus courte que celle demandée. */
  const exclus = new Set([geste.id, ...appuis.map((e) => e.id)]);
  const poolComplement = exercicesDisponibles({
    ...filtreBase,
    phase: 'bloc',
    familles: FAMILLES_EFFORT,
  }).filter((e) => !exclus.has(e.id));

  const complement = tirerPourBloc(
    alea,
    poolComplement,
    Math.min(3, poolComplement.length),
    options,
    exclus,
    difficulteCible(options.niveau, options.intensite),
  ).map((e) => prescrire(e, travailSec, options.intensite, options.niveau));

  const construire = (toursGeste: number, toursAppuis: number, toursComplement: number): Seance => {
    const blocs: Bloc[] = [
      {
        nom: `Le geste · ${geste.nom}`,
        tours: toursGeste,
        travailSec,
        reposSec: REPOS_GESTE,
        exercices: [prescrire(geste, travailSec, options.intensite, options.niveau)],
      },
    ];

    if (appuis.length > 0 && toursAppuis > 0) {
      blocs.push({
        nom: 'Les appuis',
        tours: toursAppuis,
        travailSec,
        reposSec: TEMPS_REPOS[options.intensite],
        exercices: appuis.map((e) => prescrire(e, travailSec, options.intensite, options.niveau)),
      });
    }

    if (complement.length > 0 && toursComplement > 0) {
      blocs.push({
        nom: 'Le reste du corps',
        tours: toursComplement,
        travailSec,
        reposSec: TEMPS_REPOS[options.intensite],
        exercices: complement,
      });
    }

    return {
      seed: options.seed,
      type: 'voie',
      titre: `Entraînement · ${nomVoie}`,
      echauffement,
      blocs,
      retourCalme,
      // Une séance de compétence se joue proprement ou pas du tout : une
      // carte « tempo escargot » par-dessus un poirier n'a pas de sens.
      modificateurs: [],
      dureeEstimeeSec: 0,
      dureeDemandeeMin: options.dureeMin,
      intensite: options.intensite,
      focus: options.focus,
      xpPotentiel: 0,
    };
  };

  /* --- Calibrage sur le temps demandé ---
   * On mesure chaque candidate sur son déroulé réel plutôt que d'estimer :
   * c'est l'invariant de l'app, la durée annoncée est la vraie. */
  const budget = options.dureeMin * 60;
  const maxAppuis = appuis.length > 0 ? 4 : 0;
  const maxComplement = complement.length > 0 ? 4 : 0;

  let meilleure = construire(3, Math.min(2, maxAppuis), 0);
  let meilleurEcart = Infinity;
  let meilleurGeste = 0;

  // Le geste plafonne à six séries : au-delà, la qualité technique tombe
  // et on ne répète plus qu'une mauvaise version du mouvement. En dessous
  // de deux, ce n'est plus un entraînement.
  for (let toursGeste = 2; toursGeste <= 6; toursGeste++) {
    for (let toursAppuis = 0; toursAppuis <= maxAppuis; toursAppuis++) {
      for (let toursComplement = 0; toursComplement <= maxComplement; toursComplement++) {
        const candidate = construire(toursGeste, toursAppuis, toursComplement);
        const ecart = Math.abs(dureeTotaleEtapes(construireEtapes(candidate)) - budget);

        // À vingt secondes près, deux découpages sont équivalents pour qui
        // les exécute : on tranche alors en faveur de celui qui travaille
        // le plus le geste. C'est lui qu'on est venu faire progresser, le
        // reste ne sert qu'à remplir le temps demandé.
        const nettementMieux = ecart < meilleurEcart - 20;
        const equivalent = Math.abs(ecart - meilleurEcart) <= 20;

        if (nettementMieux || (equivalent && toursGeste > meilleurGeste)) {
          meilleure = candidate;
          meilleurEcart = ecart;
          meilleurGeste = toursGeste;
        }
      }
    }
  }

  const dureeEstimeeSec = dureeTotaleEtapes(construireEtapes(meilleure));

  return {
    possible: true,
    seance: {
      ...meilleure,
      dureeEstimeeSec,
      xpPotentiel: xpPotentielSeance(dureeEstimeeSec, options.intensite, 'voie', 1),
    },
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

  // Échanger un exercice compté en répétitions contre un exercice tenu au
  // temps peut déplacer la durée sous la carte « Pyramide » : on remesure
  // plutôt que de conserver un chiffre devenu faux.
  const remaniee = { ...seance, blocs };
  const dureeEstimeeSec = dureeTotaleEtapes(construireEtapes(remaniee));

  return {
    ...remaniee,
    dureeEstimeeSec,
    xpPotentiel: xpPotentielSeance(
      dureeEstimeeSec,
      seance.intensite,
      seance.type,
      bonusXpCumule(seance.modificateurs),
    ),
  };
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
  options: OptionsTirage,
  graineRetirage: number,
): Seance {
  const actuel = seance.modificateurs[index];
  if (!actuel) return seance;

  const alea = creerAlea(graineRetirage);
  const exclure = seance.modificateurs.map((m) => m.id);
  const [remplacant] = tirerModificateurs(alea, options.niveau, 1, exclure);
  if (!remplacant) return seance;

  const modificateurs = seance.modificateurs.map((m, i) => (i === index ? remplacant : m));

  // On régénère depuis la même graine plutôt que de rapiécer la séance :
  // une carte transforme sa structure, et les effets de l'ancienne ne
  // s'annulent pas après coup. Graine et titre identiques garantissent
  // que seuls les effets de la nouvelle carte changent.
  return genererSeance({
    ...options,
    seed: seance.seed,
    type: seance.type,
    titre: seance.titre,
    modificateursImposes: modificateurs.map((m) => m.id),
  });
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
