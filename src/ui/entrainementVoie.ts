import { useMemo } from 'react';

import { useJeu } from '../etat/magasin';
import { niveauDepuisXp } from '../moteur/progression';
import { genererSeanceVoie, type TirageVoie } from '../moteur/seance';
import { programmeVoie, voieParId } from '../moteur/competences';
import { graineAleatoire } from '../moteur/alea';
import { LIBELLE_MATERIEL } from '../moteur/types';

/**
 * L'entraînement de la voie suivie, prêt à être lancé.
 *
 * Deux écrans le proposent — la fiche de statut et l'écran des voies —
 * d'où ce petit crochet partagé plutôt que la même douzaine de lignes
 * recopiée des deux côtés.
 *
 * Rend `null` quand aucune voie n'est suivie ou qu'elle est achevée : il
 * n'y a alors plus rien à travailler.
 */
export function useEntrainementVoie(): { tirage: TirageVoie; nom: string } | null {
  const voieActive = useJeu((e) => e.voieActive);
  const paliersValides = useJeu((e) => e.paliersValides);
  const reglages = useJeu((e) => e.reglages);
  const historiqueIds = useJeu((e) => e.historiqueIds);
  const xpTotal = useJeu((e) => e.xpTotal);

  const niveau = niveauDepuisXp(xpTotal).niveau;

  return useMemo(() => {
    const voie = voieActive ? voieParId(voieActive) : undefined;
    if (!voie) return null;

    const programme = programmeVoie(voie, paliersValides);
    if (!programme.principal) return null;

    return {
      nom: voie.nom,
      tirage: genererSeanceVoie(programme.principal, programme.soutiens, voie.nom, {
        dureeMin: reglages.dureeMin,
        intensite: reglages.intensite,
        focus: reglages.focus,
        materielDispo: reglages.materielDispo,
        silencieux: reglages.silencieux,
        niveau,
        historiqueIds,
        // Le hasard ne porte que sur l'échauffement et les étirements : le
        // corps de séance est imposé par l'étape en cours.
        seed: graineAleatoire(),
      }),
    };
  }, [voieActive, paliersValides, reglages, historiqueIds, niveau]);
}

/** « il te faut un mur » — le blocage se dit, il ne se contourne pas. */
export function phraseMaterielManquant(materiel: string[]): string {
  const noms = materiel.map((m) => LIBELLE_MATERIEL[m as keyof typeof LIBELLE_MATERIEL] ?? m);
  if (noms.length === 0) return 'Cet exercice n\'est pas praticable dans ton cadre actuel.';
  return `Cet exercice demande : ${noms.join(', ')}. Ajoute-le dans « ce que tu as sous la main » au moment de tirer une séance.`;
}
