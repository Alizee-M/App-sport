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
import { exercicesDebloquesAuNiveau } from '../moteur/exercices';
import { modificateursDebloquesAuNiveau } from '../moteur/modificateurs';
import { idsExercices } from '../moteur/seance';
import {
  noeudCourant,
  seanceValideNoeud,
  zoneDuNoeud,
  type Noeud,
  type Zone,
} from '../moteur/aventure';
import { estRecord, xpPourDefi, type Defi } from '../moteur/defis';
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
}

export interface ResultatDefi {
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
}

const REGLAGES_PAR_DEFAUT: Reglages = {
  dureeMin: 20,
  intensite: 2,
  focus: 'complet',
  materielDispo: ['chaise', 'mur'],
  silencieux: false,
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

        const xpBase = Math.round(seance.xpPotentiel * ratio);
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
        };
      },

      enregistrerDefi: (defi, score) => {
        const etat = get();
        const ancienRecord = etat.recordsDefis[defi.id] ?? null;
        const record = estRecord(defi, score, ancienRecord);
        const xpGagnee = xpPourDefi(defi, record);

        const niveauAvant = niveauDepuisXp(etat.xpTotal).niveau;
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

        return { record, ancienRecord, xpGagnee, niveauAvant, niveauApres };
      },

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
