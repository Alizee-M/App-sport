import { choisirUn } from './alea';

/* ----------------------------------------------------------------------
 * Le coach.
 *
 * Il a du répondant, mais il ne tape jamais sur le physique de personne et
 * ne culpabilise jamais une absence. Sa cible, c'est toujours la situation
 * ou lui-même — pas toi. Quand tu reviens après trois semaines, il est
 * content, point.
 * -------------------------------------------------------------------- */

export type ContexteCoach =
  | 'accueil'
  | 'accueil_serie'
  | 'retour_apres_pause'
  | 'debut_seance'
  | 'echauffement'
  | 'debut_exo'
  | 'mi_effort'
  | 'fin_exo'
  | 'repos'
  | 'dernier_tour'
  | 'derniere_seconde'
  | 'retour_calme'
  | 'fin_seance'
  | 'record'
  | 'niveau_gagne'
  | 'boss_vaincu'
  | 'abandon'
  | 'exercice_retire';

const REPLIQUES: Record<ContexteCoach, string[]> = {
  accueil: [
    'Alors, on fait quoi aujourd\'hui ?',
    'Le tapis est encore là. Il attend.',
    'Tirage au sort, et on verra bien ce que le destin propose.',
    'Je te préviens : je n\'ai aucune idée de ce qui va sortir. C\'est ça qui est bien.',
    'Dix minutes. Tu as dix minutes. Tout le monde a dix minutes.',
    'On ne va pas refaire la même chose qu\'hier, rassure-toi.',
    'Prêt à découvrir quel exercice absurde je vais te tirer ?',
  ],
  accueil_serie: [
    'Série de {serie} jours. Ne me fais pas ça aujourd\'hui.',
    '{serie} jours d\'affilée. C\'est devenu une habitude, là.',
    '{serie} jours. Je commence à te trouver inquiétant.',
    'Ça fait {serie} jours. On continue ?',
  ],
  retour_apres_pause: [
    'Te revoilà. Je n\'ai rien dit, je ne dirai rien.',
    'Bon retour. On reprend doucement, pas de bêtise.',
    'La série est repartie de zéro, mais pas tes muscles. Ils se souviennent.',
    'L\'important c\'est le retour, pas la pause. On y va ?',
  ],
  debut_seance: [
    'C\'est parti. Trois, deux, un…',
    'On commence. Range le téléphone après ça.',
    'Allez. Le plus dur, c\'était de te lever.',
    'Séance lancée. Plus de retour en arrière.',
  ],
  echauffement: [
    'On chauffe. Ne saute pas cette partie, ton dos a une mémoire d\'éléphant.',
    'Doucement. C\'est l\'échauffement, pas la séance.',
    'Prends ton temps ici. C\'est ce qui évite les mauvaises surprises.',
  ],
  debut_exo: [
    '{exercice}. Allez, on y va.',
    'Au programme : {exercice}.',
    '{exercice}. Tu connais la chanson.',
    'Et maintenant… {exercice}. Courage.',
    '{exercice}. Position. Respire.',
  ],
  mi_effort: [
    'Moitié. La partie facile est derrière.',
    'Tiens la forme, pas la vitesse.',
    'Respire. C\'est gratuit et ça aide.',
    'Encore la moitié. Tu es exactement là où il faut.',
    'C\'est là que ça compte.',
  ],
  fin_exo: [
    'Fini. Bien joué.',
    'Voilà. Un de plus.',
    'Terminé. Souffle.',
    'C\'est dans la poche.',
  ],
  repos: [
    'Repos. Vraie respiration, pas de scroll.',
    'Souffle. Le prochain arrive vite.',
    'Récupère. Tu en auras besoin.',
    'Repos mérité. Bois un coup.',
  ],
  dernier_tour: [
    'DERNIER TOUR. Tout ce qu\'il te reste, c\'est maintenant.',
    'Dernier tour. Après, tu as le droit de t\'écrouler.',
    'C\'est le dernier. Ne le bâcle pas, il compte double dans ta tête.',
    'Dernier tour ! Le canapé est en vue.',
  ],
  derniere_seconde: [
    'Encore trois secondes. Trois.',
    'Ne lâche pas maintenant.',
    'La fin est là. Tiens.',
  ],
  retour_calme: [
    'On redescend. C\'est la partie que tout le monde saute et que tout le monde regrette.',
    'Étirements. Ton toi de demain t\'observe.',
    'Respire lentement. La séance est gagnée, on range juste le matériel.',
  ],
  fin_seance: [
    'Terminé. Tu l\'as fait alors que tu avais mille raisons de ne pas le faire.',
    'Séance bouclée. C\'est exactement comme ça que ça marche.',
    'Fini. Et personne ne peut te l\'enlever.',
    'Voilà. Demain tu seras content de l\'avoir fait aujourd\'hui.',
    'C\'est plié. Va boire de l\'eau.',
  ],
  record: [
    'RECORD BATTU. Je note, tu ne pourras plus dire le contraire.',
    'Nouveau record. Ton toi d\'avant vient de se faire dépasser.',
    'Record explosé. Ça, c\'est du progrès mesurable.',
  ],
  niveau_gagne: [
    'NIVEAU {niveau}. De nouveaux exercices viennent de se débloquer.',
    'Niveau {niveau} atteint. Le tirage vient de s\'enrichir.',
    'Niveau {niveau} ! De nouvelles cartes viennent d\'arriver.',
  ],
  boss_vaincu: [
    'BOSS VAINCU. La zone suivante est ouverte.',
    'Tu l\'as eu. Il ne t\'embêtera plus.',
    'Boss à terre. Franchement, c\'était pas gagné.',
  ],
  abandon: [
    'Arrêté en route. Ça arrive, et ça compte quand même : tu as fait la partie que tu as faite.',
    'On s\'arrête là. Ce qui est fait est fait, et c\'est plus que rien.',
    'Séance écourtée. Aucun jugement. À la prochaine.',
  ],
  exercice_retire: [
    'Carte échangée. On ne va pas se forcer sur un truc qui ne le sent pas.',
    'Remplacé. Il y a de quoi faire.',
    'Nouvelle carte. Celle-là devrait mieux passer.',
  ],
};

export interface VariablesCoach {
  exercice?: string;
  serie?: number;
  niveau?: number;
}

/**
 * Une réplique adaptée au moment.
 *
 * `alea` est passé explicitement pour que l'affichage reste reproductible
 * dans les tests et ne change pas à chaque re-rendu de l'écran.
 */
export function repliqueCoach(
  contexte: ContexteCoach,
  alea: () => number,
  variables: VariablesCoach = {},
): string {
  const modele = choisirUn(alea, REPLIQUES[contexte]);
  return modele
    .replace('{exercice}', variables.exercice ?? '')
    .replace('{serie}', String(variables.serie ?? 0))
    .replace('{niveau}', String(variables.niveau ?? 0));
}

/**
 * Réplique d'accueil choisie selon l'état du joueur : c'est le premier
 * texte vu en ouvrant l'app, il doit coller à la situation réelle.
 */
export function accueilCoach(
  alea: () => number,
  serie: number,
  joursDepuisDerniereSeance: number | null,
): string {
  if (joursDepuisDerniereSeance !== null && joursDepuisDerniereSeance >= 4) {
    return repliqueCoach('retour_apres_pause', alea);
  }
  if (serie >= 2) {
    return repliqueCoach('accueil_serie', alea, { serie });
  }
  return repliqueCoach('accueil', alea);
}
