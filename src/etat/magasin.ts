import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Exercice,
  Focus,
  Intensite,
  Materiel,
  Modificateur,
  Seance,
} from '../moteur/types';
import {
  statsVides,
  statsGagnees,
  niveauDepuisXp,
  majEnchainement,
  serieAffichee,
  jourLocal,
  bonusSerie,
  type StatsBrutes,
  type Enchainement,
} from '../moteur/progression';
import { exercicesDebloquesAuNiveau, exercicesDisponibles } from '../moteur/exercices';
import { modificateursDebloquesAuNiveau } from '../moteur/modificateurs';
import { idsExercices } from '../moteur/seance';
import {
  noeudCourant,
  seanceValideNoeud,
  zoneDuNoeud,
  type Noeud,
  type Zone,
} from '../moteur/aventure';
import { estRecord, resultatCredible, xpPourDefi, type Defi } from '../moteur/defis';
import { caloriesSeance, progressionQuete, type QueteRecompense } from '../moteur/calories';
import {
  volumeRealise,
  cumulerVolumes,
  voieParId,
  palierCourant,
  partPratique,
  type Volumes,
} from '../moteur/competences';
import {
  POINTS_PAR_NIVEAU,
  bonusPoints,
  pointsVides,
  calculerPenalite,
  appliquerPenalite,
  joursManquesEntre,
  queteJournaliere,
  type PointsStats,
  type Penalite,
} from '../moteur/systeme';
import { xpCumuleePourAtteindre } from '../moteur/progression';
import { STATS } from '../moteur/types';

/* ----------------------------------------------------------------------
 * L'état du jeu, entièrement local.
 *
 * Aucun compte, aucun serveur : tout vit sur le téléphone. Ce choix est
 * volontaire — une app de sport à la maison ne doit pas dépendre d'une
 * connexion ni d'une inscription pour démarrer.
 * -------------------------------------------------------------------- */

/** On garde une fenêtre d'historique : au-delà, un exercice redevient neuf. */
const TAILLE_HISTORIQUE = 45;
const TAILLE_JOURNAL = 100;

export interface Reglages {
  dureeMin: number;
  intensite: Intensite;
  focus: Focus;
  materielDispo: Materiel[];
  silencieux: boolean;
  /** Bips de décompte et de changement d'exercice pendant la séance. */
  sons: boolean;
  /**
   * Poids corporel, en kilogrammes. Nul tant qu'il n'est pas renseigné :
   * sans lui, aucune estimation calorique n'a de sens, et on préfère ne
   * rien afficher plutôt qu'un chiffre inventé.
   */
  poidsKg: number | null;
}

export interface EntreeJournal {
  id: string;
  date: string;
  titre: string;
  type: Seance['type'];
  dureeSec: number;
  xp: number;
  ratio: number;
  /** Nom du défi, quand l'entrée vient d'un défi éclair plutôt que d'une séance. */
  defi?: string;
  score?: string;
  record?: boolean;
}

export interface ResultatSeance {
  xpGagnee: number;
  partBonusSerie: number;
  gains: StatsBrutes;
  ratio: number;
  niveauAvant: number;
  niveauApres: number;
  exercicesDebloques: Exercice[];
  modificateursDebloques: Modificateur[];
  noeudValide: Noeud | null;
  zoneTerminee: Zone | null;
  serie: number;
  /** Taille du vivier d'exercices avant et après la montée de niveau. */
  exercicesPossiblesAvant: number;
  exercicesPossiblesApres: number;
  /** Dépense estimée, nulle tant que le poids n'est pas renseigné. */
  kcalDepensees: number;
  /** Points de stats gagnés en montant de niveau. */
  pointsGagnes: number;
  /** Vrai si cette séance vient d'achever la quête-récompense en cours. */
  recompenseDebloquee: boolean;
  /** Vrai si c'était la quête journalière et qu'elle a été menée au bout. */
  queteJournaliereValidee: boolean;
}

export interface ResultatDefi {
  /** Faux quand le résultat n'est pas crédible : rien n'a été enregistré. */
  compte: boolean;
  record: boolean;
  ancienRecord: number | null;
  xpGagnee: number;
  niveauAvant: number;
  niveauApres: number;
}

interface EtatJeu {
  xpTotal: number;
  stats: StatsBrutes;
  enchainement: Enchainement;
  historiqueIds: string[];
  noeudsTermines: string[];
  recordsDefis: Record<string, number>;
  journal: EntreeJournal[];
  reglages: Reglages;
  seancesTerminees: number;

  /* ----------------------------- Système ----------------------------- */
  /** Points de stats en attente de répartition. */
  pointsDisponibles: number;
  /** Points déjà investis, par stat. */
  pointsAlloues: PointsStats;
  /** Quête-récompense en cours, s'il y en a une. */
  queteRecompense: QueteRecompense | null;
  /** Récompenses déjà débloquées, du plus récent au plus ancien. */
  recompensesDebloquees: { recompenseId: string; date: string }[];
  /** Jours où la quête journalière a été honorée. */
  joursQueteFaite: string[];
  /** Dernier jour où l'app a été ouverte, pour calculer les manquements. */
  dernierJourVu: string | null;
  /** L'éveil a-t-il été joué ? Faux au tout premier lancement. */
  eveille: boolean;
  /** Voie de compétence suivie, qui pilote le tirage. */
  voieActive: string | null;
  /** Paliers déjà franchis, toutes voies confondues. */
  paliersValides: string[];
  /** Volume cumulé par exercice : c'est lui qui ouvre les tests. */
  volumes: Volumes;

  /** Séance tirée et en attente de validation : non persistée. */
  seancePreparee: Seance | null;
  /** Le nœud d'aventure visé par la séance préparée, s'il y en a un. */
  noeudVise: string | null;
  hydrate: boolean;

  preparerSeance: (seance: Seance, noeudVise?: string | null) => void;
  oublierSeancePreparee: () => void;
  majReglages: (partiel: Partial<Reglages>) => void;
  terminerSeance: (seance: Seance, ratio: number) => ResultatSeance;
  enregistrerDefi: (defi: Defi, score: number) => ResultatDefi;
  toutEffacer: () => void;

  /* ----------------------------- Système ----------------------------- */
  allouerPoint: (stat: keyof PointsStats) => void;
  choisirRecompense: (recompenseId: string) => void;
  abandonnerQuete: () => void;
  reclamerRecompense: () => void;
  validerQueteJournaliere: () => void;
  /** À appeler à l'ouverture : applique les manquements de la veille. */
  verifierPenalites: () => Penalite | null;
  marquerEveille: () => void;
  choisirVoie: (voieId: string | null) => void;
  validerPalier: (palierId: string) => void;
}

const REGLAGES_PAR_DEFAUT: Reglages = {
  dureeMin: 20,
  intensite: 2,
  focus: 'complet',
  materielDispo: ['chaise', 'mur'],
  silencieux: false,
  sons: true,
  poidsKg: null,
};

function identifiant(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useJeu = create<EtatJeu>()(
  persist(
    (set, get) => ({
      xpTotal: 0,
      stats: statsVides(),
      enchainement: { serie: 0, dernierJour: null },
      historiqueIds: [],
      noeudsTermines: [],
      recordsDefis: {},
      journal: [],
      reglages: REGLAGES_PAR_DEFAUT,
      seancesTerminees: 0,
      pointsDisponibles: 0,
      pointsAlloues: pointsVides(),
      queteRecompense: null,
      recompensesDebloquees: [],
      joursQueteFaite: [],
      dernierJourVu: null,
      eveille: false,
      voieActive: null,
      paliersValides: [],
      volumes: {},
      seancePreparee: null,
      noeudVise: null,
      hydrate: false,

      preparerSeance: (seance, noeudVise = null) => set({ seancePreparee: seance, noeudVise }),

      oublierSeancePreparee: () => set({ seancePreparee: null, noeudVise: null }),

      majReglages: (partiel) =>
        set((etat) => ({ reglages: { ...etat.reglages, ...partiel } })),

      /**
       * Clôture une séance et distribue les récompenses.
       *
       * `ratio` est la part réellement effectuée : abandonner en cours de
       * route rapporte moins, mais rapporte toujours quelque chose. Rien
       * n'est jamais retiré au joueur.
       */
      terminerSeance: (seance, ratio) => {
        const etat = get();
        const aujourdhui = jourLocal(new Date());

        const niveauAvant = niveauDepuisXp(etat.xpTotal).niveau;

        const enchainement = majEnchainement(etat.enchainement, aujourdhui);
        const serie = enchainement.serie;

        // Les points investis dans la stat travaillée paient : c'est ce
        // qui donne un sens à la répartition, au-delà de l'affichage.
        const xpBase = Math.round(
          seance.xpPotentiel * ratio * (1 + bonusPoints(etat.pointsAlloues, seance.focus)),
        );
        const partBonusSerie = Math.round(xpBase * bonusSerie(serie));
        const xpGagnee = xpBase + partBonusSerie;

        const gains = statsGagnees(seance, ratio);
        const stats = { ...etat.stats };
        for (const stat of STATS) {
          stats[stat] = Math.round((stats[stat] + gains[stat]) * 10) / 10;
        }

        const xpTotal = etat.xpTotal + xpGagnee;
        const niveauApres = niveauDepuisXp(xpTotal).niveau;

        // Déblocages : tout ce qui entre dans le deck entre les deux niveaux.
        const exercicesDebloques: Exercice[] = [];
        const modificateursDebloques: Modificateur[] = [];
        for (let n = niveauAvant + 1; n <= niveauApres; n++) {
          exercicesDebloques.push(...exercicesDebloquesAuNiveau(n));
          modificateursDebloques.push(...modificateursDebloquesAuNiveau(n));
        }

        // Validation du nœud d'aventure : seulement celui qui était visé,
        // et seulement si la séance honore vraiment son contrat.
        let noeudValide: Noeud | null = null;
        let zoneTerminee: Zone | null = null;
        const noeudsTermines = [...etat.noeudsTermines];

        const courant = noeudCourant(noeudsTermines);
        if (
          courant &&
          etat.noeudVise === courant.id &&
          ratio >= 0.8 &&
          seanceValideNoeud(seance, courant)
        ) {
          noeudsTermines.push(courant.id);
          noeudValide = courant;

          const zone = zoneDuNoeud(courant.id);
          if (zone && zone.noeuds.every((n) => noeudsTermines.includes(n.id))) {
            zoneTerminee = zone;
          }
        }

        const xpNoeud = noeudValide ? noeudValide.xpBonus : 0;
        const xpFinale = xpGagnee + xpNoeud;
        const xpTotalFinal = etat.xpTotal + xpFinale;
        const niveauFinal = niveauDepuisXp(xpTotalFinal).niveau;

        // Le bonus de nœud peut à lui seul faire monter d'un niveau.
        for (let n = niveauApres + 1; n <= niveauFinal; n++) {
          exercicesDebloques.push(...exercicesDebloquesAuNiveau(n));
          modificateursDebloques.push(...modificateursDebloquesAuNiveau(n));
        }

        // Le nombre d'exercices que le tirage peut désormais sortir : sans
        // ce chiffre, une montée de niveau n'affiche qu'une liste de noms
        // sans dire ce qu'elle change concrètement.
        const vivier = (niveau: number) =>
          exercicesDisponibles({
            phase: 'bloc',
            niveau,
            materielDispo: etat.reglages.materielDispo,
            silencieux: etat.reglages.silencieux,
          }).length;

        // Dépense estimée, versée à la quête-récompense en cours. Elle
        // reste nulle tant que le poids n'est pas renseigné : mieux vaut
        // ne rien afficher qu'un chiffre inventé.
        const kcalDepensees = etat.reglages.poidsKg
          ? caloriesSeance(seance, etat.reglages.poidsKg, ratio)
          : 0;

        let queteRecompense = etat.queteRecompense;
        let recompenseDebloquee = false;
        if (queteRecompense && kcalDepensees > 0) {
          const avant = progressionQuete(queteRecompense);
          queteRecompense = {
            ...queteRecompense,
            kcalAccumulees: queteRecompense.kcalAccumulees + kcalDepensees,
          };
          recompenseDebloquee = avant < 1 && progressionQuete(queteRecompense) >= 1;
        }

        const pointsGagnes = Math.max(0, niveauFinal - niveauAvant) * POINTS_PAR_NIVEAU;

        // La quête journalière jouée en séance se valide toute seule — mais
        // seulement si elle est menée au bout. Une quête, contrairement à
        // une séance libre, est un objectif chiffré : en faire la moitié,
        // c'est ne pas l'avoir faite.
        const queteJournaliereValidee =
          seance.type === 'quete' &&
          ratio >= 0.999 &&
          !etat.joursQueteFaite.includes(aujourdhui);
        const joursQueteFaite = queteJournaliereValidee
          ? [aujourdhui, ...etat.joursQueteFaite].slice(0, 90)
          : etat.joursQueteFaite;

        const entree: EntreeJournal = {
          id: identifiant(),
          date: new Date().toISOString(),
          titre: seance.titre,
          type: seance.type,
          dureeSec: Math.round(seance.dureeEstimeeSec * ratio),
          xp: xpFinale,
          ratio,
        };

        const historiqueIds = [...idsExercices(seance), ...etat.historiqueIds].slice(
          0,
          TAILLE_HISTORIQUE,
        );

        set({
          xpTotal: xpTotalFinal,
          stats,
          enchainement,
          historiqueIds,
          noeudsTermines,
          journal: [entree, ...etat.journal].slice(0, TAILLE_JOURNAL),
          seancesTerminees: etat.seancesTerminees + 1,
          // Le volume réellement effectué : c'est lui qui ouvre les tests
          // des voies de compétence.
          volumes: cumulerVolumes(etat.volumes, volumeRealise(seance, ratio)),
          queteRecompense,
          joursQueteFaite,
          pointsDisponibles: etat.pointsDisponibles + pointsGagnes,
          seancePreparee: null,
          noeudVise: null,
        });

        return {
          xpGagnee: xpFinale,
          partBonusSerie,
          gains,
          ratio,
          niveauAvant,
          niveauApres: niveauFinal,
          exercicesDebloques,
          modificateursDebloques,
          noeudValide,
          zoneTerminee,
          serie,
          exercicesPossiblesAvant: vivier(niveauAvant),
          exercicesPossiblesApres: vivier(niveauFinal),
          kcalDepensees,
          pointsGagnes,
          recompenseDebloquee,
          queteJournaliereValidee,
        };
      },

      enregistrerDefi: (defi, score) => {
        const etat = get();
        const ancienRecord = etat.recordsDefis[defi.id] ?? null;
        const niveauActuel = niveauDepuisXp(etat.xpTotal).niveau;

        // Un défi lancé puis validé aussitôt n'a rien coûté : il ne doit
        // rien rapporter, ne pas entretenir la série de jours, et ne pas
        // encombrer le journal d'une ligne à zéro.
        if (!resultatCredible(defi, score)) {
          return {
            compte: false,
            record: false,
            ancienRecord,
            xpGagnee: 0,
            niveauAvant: niveauActuel,
            niveauApres: niveauActuel,
          };
        }

        const record = estRecord(defi, score, ancienRecord);
        const xpGagnee = xpPourDefi(defi, score, record);

        const niveauAvant = niveauActuel;
        const xpTotal = etat.xpTotal + xpGagnee;
        const niveauApres = niveauDepuisXp(xpTotal).niveau;

        const aujourdhui = jourLocal(new Date());
        const enchainement = majEnchainement(etat.enchainement, aujourdhui);

        const entree: EntreeJournal = {
          id: identifiant(),
          date: new Date().toISOString(),
          titre: defi.nom,
          type: 'libre',
          dureeSec: defi.dureeSec ?? score,
          xp: xpGagnee,
          ratio: 1,
          defi: defi.id,
          score: `${score} ${defi.unite}`,
          record,
        };

        set({
          xpTotal,
          enchainement,
          recordsDefis: record ? { ...etat.recordsDefis, [defi.id]: score } : etat.recordsDefis,
          journal: [entree, ...etat.journal].slice(0, TAILLE_JOURNAL),
        });

        return { compte: true, record, ancienRecord, xpGagnee, niveauAvant, niveauApres };
      },


      /* --------------------------- Système --------------------------- */

      allouerPoint: (stat) =>
        set((etat) => {
          if (etat.pointsDisponibles <= 0) return etat;
          return {
            pointsDisponibles: etat.pointsDisponibles - 1,
            pointsAlloues: { ...etat.pointsAlloues, [stat]: etat.pointsAlloues[stat] + 1 },
          };
        }),

      choisirRecompense: (recompenseId) =>
        set({
          queteRecompense: {
            recompenseId,
            kcalAccumulees: 0,
            debutee: new Date().toISOString(),
          },
        }),

      // Changer d'avis est permis, mais reprendre la même récompense
      // repart de zéro : sans quoi on cumulerait sur toutes en parallèle.
      abandonnerQuete: () => set({ queteRecompense: null }),

      reclamerRecompense: () =>
        set((etat) => {
          if (!etat.queteRecompense || progressionQuete(etat.queteRecompense) < 1) return etat;
          return {
            queteRecompense: null,
            recompensesDebloquees: [
              { recompenseId: etat.queteRecompense.recompenseId, date: new Date().toISOString() },
              ...etat.recompensesDebloquees,
            ].slice(0, 50),
          };
        }),

      validerQueteJournaliere: () =>
        set((etat) => {
          const aujourdhui = jourLocal(new Date());
          if (etat.joursQueteFaite.includes(aujourdhui)) return etat;

          const quete = queteJournaliere(
            aujourdhui,
            niveauDepuisXp(etat.xpTotal).niveau,
            etat.reglages.materielDispo,
            etat.reglages.silencieux,
          );

          return {
            xpTotal: etat.xpTotal + quete.xpRecompense,
            joursQueteFaite: [aujourdhui, ...etat.joursQueteFaite].slice(0, 90),
            enchainement: majEnchainement(etat.enchainement, aujourdhui),
          };
        }),

      /**
       * Applique les quêtes journalières manquées depuis la dernière
       * visite. Appelé une fois à l'ouverture : la sanction doit se
       * sentir, jamais dissuader de revenir — d'où les plafonds du
       * moteur et l'impossibilité de perdre un rang.
       */
      verifierPenalites: () => {
        const etat = get();
        const aujourdhui = jourLocal(new Date());

        if (!etat.dernierJourVu) {
          set({ dernierJourVu: aujourdhui });
          return null;
        }
        if (etat.dernierJourVu === aujourdhui) return null;

        const manques = joursManquesEntre(etat.dernierJourVu, aujourdhui, etat.joursQueteFaite);
        const penalite = calculerPenalite(manques, etat.xpTotal);

        if (penalite.joursManques === 0) {
          set({ dernierJourVu: aujourdhui });
          return null;
        }

        const seuil = xpCumuleePourAtteindre(niveauDepuisXp(etat.xpTotal).niveau);
        set({
          xpTotal: appliquerPenalite(etat.xpTotal, penalite, seuil),
          enchainement: { serie: 0, dernierJour: etat.enchainement.dernierJour },
          dernierJourVu: aujourdhui,
        });
        return penalite;
      },

      marquerEveille: () => set({ eveille: true }),

      choisirVoie: (voieId) => set({ voieActive: voieId }),

      /**
       * Franchit un palier. Le test se valide sur parole — aucun téléphone
       * ne peut vérifier un équilibre — mais seulement après avoir accumulé
       * la pratique exigée, vérifiée ici et pas seulement dans l'écran.
       */
      validerPalier: (palierId) =>
        set((etat) => {
          if (etat.paliersValides.includes(palierId)) return etat;

          const voie = etat.voieActive ? voieParId(etat.voieActive) : undefined;
          const palier = voie?.paliers.find((p) => p.id === palierId);
          if (!palier || palierCourant(voie!, etat.paliersValides)?.id !== palierId) return etat;
          if (partPratique(palier, etat.volumes) < 1) return etat;

          return {
            paliersValides: [...etat.paliersValides, palierId],
            xpTotal: etat.xpTotal + 150,
          };
        }),

      toutEffacer: () =>
        set({
          xpTotal: 0,
          stats: statsVides(),
          enchainement: { serie: 0, dernierJour: null },
          historiqueIds: [],
          noeudsTermines: [],
          recordsDefis: {},
          journal: [],
          seancesTerminees: 0,
          pointsDisponibles: 0,
          pointsAlloues: pointsVides(),
          queteRecompense: null,
          recompensesDebloquees: [],
          joursQueteFaite: [],
          dernierJourVu: null,
          eveille: false,
          voieActive: null,
          paliersValides: [],
          volumes: {},
          seancePreparee: null,
          noeudVise: null,
          reglages: REGLAGES_PAR_DEFAUT,
        }),
    }),
    {
      name: 'heros-de-salon',
      storage: createJSONStorage(() => AsyncStorage),
      // La séance préparée est volontairement hors sauvegarde : au
      // redémarrage on repart d'un tirage neuf plutôt que d'une séance
      // fantôme dont on ne sait plus où on en était.
      partialize: (etat) => ({
        xpTotal: etat.xpTotal,
        stats: etat.stats,
        enchainement: etat.enchainement,
        historiqueIds: etat.historiqueIds,
        noeudsTermines: etat.noeudsTermines,
        recordsDefis: etat.recordsDefis,
        journal: etat.journal,
        reglages: etat.reglages,
        seancesTerminees: etat.seancesTerminees,
        pointsDisponibles: etat.pointsDisponibles,
        pointsAlloues: etat.pointsAlloues,
        queteRecompense: etat.queteRecompense,
        recompensesDebloquees: etat.recompensesDebloquees,
        joursQueteFaite: etat.joursQueteFaite,
        dernierJourVu: etat.dernierJourVu,
        eveille: etat.eveille,
        voieActive: etat.voieActive,
        paliersValides: etat.paliersValides,
        volumes: etat.volumes,
      }),
      // On lève le drapeau même si la relecture a échoué : mieux vaut
      // repartir d'une progression vide que rester bloqué sur l'écran de
      // chargement sans aucun recours.
      onRehydrateStorage: () => (_etat, erreur) => {
        if (erreur) console.warn('Progression illisible, redémarrage à zéro :', erreur);
        useJeu.setState({ hydrate: true });
      },
    },
  ),
);

/* --------------------------- Sélecteurs utiles ----------------------- */

export function useNiveau() {
  return useJeu((e) => niveauDepuisXp(e.xpTotal));
}

export function useSerie() {
  const enchainement = useJeu((e) => e.enchainement);
  return serieAffichee(enchainement, jourLocal(new Date()));
}

/** Nombre de jours depuis la dernière séance, `null` si aucune. */
export function joursDepuisDerniereSeance(enchainement: Enchainement): number | null {
  if (!enchainement.dernierJour) return null;
  const [a, m, j] = enchainement.dernierJour.split('-').map(Number);
  const dernier = Date.UTC(a, m - 1, j);
  const [aa, am, aj] = jourLocal(new Date()).split('-').map(Number);
  return Math.round((Date.UTC(aa, am - 1, aj) - dernier) / 86400000);
}
