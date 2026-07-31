import type { ExercicePrescrit, Seance } from './types';

/* ----------------------------------------------------------------------
 * Le déroulé minute par minute d'une séance.
 *
 * L'écran d'exécution ne doit jamais avoir à raisonner : il avance dans
 * une liste d'étapes déjà calculée. Toute la logique d'enchaînement
 * (tours, repos, transitions entre blocs) vit ici, où elle est testable.
 * -------------------------------------------------------------------- */

export type GenreEtape = 'echauffement' | 'effort' | 'repos' | 'repos_bloc' | 'retour_calme';

export interface Etape {
  genre: GenreEtape;
  /** Durée de l'étape en secondes. */
  secondes: number;
  /** Titre principal affiché en grand. */
  titre: string;
  /** Ligne de contexte : « Bloc 1 · Tour 2/3 ». */
  contexte: string;
  prescrit?: ExercicePrescrit;
  /** Nom de ce qui arrive juste après, à afficher pendant les repos. */
  suivant?: string;
  blocIndex?: number;
  tour?: number;
  /** Vrai sur le dernier tour d'un bloc : le coach a des choses à dire. */
  dernierTour?: boolean;
}

const CHIFFRES_ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Déplie la séance en une suite d'étapes chronologiques.
 *
 * Les repos ne sont pas insérés après le tout dernier effort d'un bloc :
 * l'enchaînement passe directement au repos de bloc, ou au retour au
 * calme. Sinon on ferait souffler les gens dans le vide.
 */
export function construireEtapes(seance: Seance): Etape[] {
  const etapes: Etape[] = [];

  for (const prescrit of seance.echauffement) {
    etapes.push({
      genre: 'echauffement',
      secondes: prescrit.secondes ?? 30,
      titre: prescrit.exercice.nom,
      contexte: 'Échauffement',
      prescrit,
    });
  }

  seance.blocs.forEach((bloc, blocIndex) => {
    const nomBloc = `Bloc ${CHIFFRES_ROMAINS[blocIndex] ?? blocIndex + 1} · ${bloc.nom}`;

    for (let tour = 1; tour <= bloc.tours; tour++) {
      const dernierTour = tour === bloc.tours;

      bloc.exercices.forEach((prescrit, exoIndex) => {
        const dernierExercice = exoIndex === bloc.exercices.length - 1;

        etapes.push({
          genre: 'effort',
          secondes: bloc.travailSec,
          titre: prescrit.exercice.nom,
          contexte: `${nomBloc} · Tour ${tour}/${bloc.tours}`,
          prescrit,
          blocIndex,
          tour,
          dernierTour,
          suivant: dernierExercice ? undefined : bloc.exercices[exoIndex + 1].exercice.nom,
        });

        // Pas de repos après le dernier exercice du dernier tour : le
        // repos de bloc (ou la fin de séance) prend le relais.
        if (!(dernierExercice && dernierTour)) {
          const suivant = dernierExercice
            ? bloc.exercices[0].exercice.nom
            : bloc.exercices[exoIndex + 1].exercice.nom;
          etapes.push({
            genre: 'repos',
            secondes: bloc.reposSec,
            titre: 'Repos',
            contexte: `${nomBloc} · Tour ${tour}/${bloc.tours}`,
            suivant,
            blocIndex,
            tour,
            dernierTour,
          });
        }
      });
    }

    const blocSuivant = seance.blocs[blocIndex + 1];
    if (blocSuivant) {
      etapes.push({
        genre: 'repos_bloc',
        secondes: 60,
        titre: 'Pause entre blocs',
        contexte: 'Récupération',
        suivant: blocSuivant.exercices[0].exercice.nom,
        blocIndex,
      });
    }
  });

  for (const prescrit of seance.retourCalme) {
    etapes.push({
      genre: 'retour_calme',
      secondes: prescrit.secondes ?? 30,
      titre: prescrit.exercice.nom,
      contexte: 'Retour au calme',
      prescrit,
    });
  }

  return etapes;
}

export function dureeTotaleEtapes(etapes: Etape[]): number {
  return etapes.reduce((total, e) => total + e.secondes, 0);
}

/** Une étape où l'on transpire : sert à mesurer l'avancement réel. */
export function estEffort(etape: Etape): boolean {
  return etape.genre === 'effort';
}

/**
 * Part de la séance réellement accomplie si l'on s'arrête à `index`.
 *
 * On ne compte que les étapes d'effort : quitter pendant les étirements
 * ne doit pas être puni comme quitter au premier tour.
 */
export function ratioAccompli(etapes: Etape[], index: number): number {
  const efforts = etapes.filter(estEffort).length;
  if (efforts === 0) return index > 0 ? 1 : 0;
  const faits = etapes.slice(0, index).filter(estEffort).length;
  return Math.min(1, faits / efforts);
}

/** Temps restant à partir d'une étape, pour l'afficher pendant l'effort. */
export function secondesRestantes(etapes: Etape[], index: number): number {
  return dureeTotaleEtapes(etapes.slice(index));
}

/** Formate des secondes en `mm:ss`. */
export function formaterChrono(secondes: number): string {
  const sûres = Math.max(0, Math.round(secondes));
  const minutes = Math.floor(sûres / 60);
  return `${minutes}:${String(sûres % 60).padStart(2, '0')}`;
}
