import test from 'node:test';
import assert from 'node:assert/strict';

import {
  construireEtapes,
  dureeTotaleEtapes,
  ratioAccompli,
  secondesRestantes,
  formaterChrono,
  estEffort,
  reposApres,
  plageRepos,
} from '../src/moteur/deroulement';
import { genererSeance } from '../src/moteur/seance';
import type { OptionsTirage } from '../src/moteur/types';

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 25,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur'],
    silencieux: false,
    niveau: 6,
    historiqueIds: [],
    seed: 21,
    ...surcharge,
  };
}

test('le déroulé enchaîne échauffement, blocs puis retour au calme', () => {
  const seance = genererSeance(options());
  const etapes = construireEtapes(seance);

  const genres = etapes.map((e) => e.genre);
  const premierEffort = genres.indexOf('effort');
  const dernierEffort = genres.lastIndexOf('effort');
  const premierRetour = genres.indexOf('retour_calme');

  assert.equal(genres[0], 'echauffement', 'la séance doit commencer par l\'échauffement');
  assert.ok(premierEffort > 0);
  assert.ok(premierRetour > dernierEffort, 'les étirements doivent venir après tous les efforts');
  assert.equal(genres[genres.length - 1], 'retour_calme');
});

test('chaque exercice de chaque bloc est joué à tous les tours', () => {
  const seance = genererSeance(options({ dureeMin: 30 }));
  const etapes = construireEtapes(seance);

  const attendu = seance.blocs.reduce((total, b) => total + b.tours * b.exercices.length, 0);
  assert.equal(etapes.filter(estEffort).length, attendu);

  seance.blocs.forEach((bloc, blocIndex) => {
    for (const prescrit of bloc.exercices) {
      const occurrences = etapes.filter(
        (e) => estEffort(e) && e.blocIndex === blocIndex && e.prescrit?.exercice.id === prescrit.exercice.id,
      );
      assert.equal(occurrences.length, bloc.tours, `${prescrit.exercice.nom} devrait revenir ${bloc.tours} fois`);
    }
  });
});

test('aucun repos ne traîne à la fin d\'un bloc ni à la fin de la séance', () => {
  const seance = genererSeance(options({ dureeMin: 40 }));
  const etapes = construireEtapes(seance);

  for (let i = 0; i < etapes.length; i++) {
    if (etapes[i].genre !== 'repos') continue;
    const suivante = etapes[i + 1];
    assert.ok(suivante, 'un repos ne peut pas terminer la séance');
    assert.equal(suivante.genre, 'effort', 'un repos doit toujours précéder un effort');
  }

  // Deux repos ne se suivent jamais.
  for (let i = 1; i < etapes.length; i++) {
    const estRepos = (g: string) => g === 'repos' || g === 'repos_bloc';
    assert.ok(
      !(estRepos(etapes[i].genre) && estRepos(etapes[i - 1].genre)),
      `deux repos consécutifs en position ${i}`,
    );
  }
});

test('une pause de bloc sépare chaque bloc, et seulement entre eux', () => {
  const seance = genererSeance(options({ dureeMin: 40 }));
  const etapes = construireEtapes(seance);
  const pauses = etapes.filter((e) => e.genre === 'repos_bloc');
  assert.equal(pauses.length, seance.blocs.length - 1);
});

test('le dernier tour est signalé pour que le coach puisse réagir', () => {
  const seance = genererSeance(options());
  const etapes = construireEtapes(seance);

  for (const bloc of seance.blocs.keys()) {
    const effortsDuBloc = etapes.filter((e) => estEffort(e) && e.blocIndex === bloc);
    const derniers = effortsDuBloc.filter((e) => e.dernierTour);
    assert.equal(derniers.length, seance.blocs[bloc].exercices.length);
    for (const etape of derniers) {
      assert.equal(etape.tour, seance.blocs[bloc].tours);
    }
  }
});

test('le repos annonce toujours ce qui arrive ensuite', () => {
  const seance = genererSeance(options());
  const etapes = construireEtapes(seance);
  for (let i = 0; i < etapes.length; i++) {
    const etape = etapes[i];
    if (etape.genre !== 'repos' && etape.genre !== 'repos_bloc') continue;
    assert.ok(etape.suivant, `repos sans annonce en position ${i}`);
    assert.equal(etape.suivant, etapes[i + 1].titre, 'l\'annonce ne correspond pas à l\'étape suivante');
  }
});

test('la durée du déroulé colle à la durée annoncée de la séance', () => {
  for (const dureeMin of [10, 20, 30, 45]) {
    for (let seed = 1; seed <= 5; seed++) {
      const seance = genererSeance(options({ dureeMin, seed }));
      const total = dureeTotaleEtapes(construireEtapes(seance));
      const ecart = Math.abs(total - seance.dureeEstimeeSec) / seance.dureeEstimeeSec;
      assert.ok(
        ecart < 0.06,
        `${dureeMin} min : déroulé de ${total} s contre ${seance.dureeEstimeeSec} s annoncées`,
      );
    }
  }
});

test('toutes les étapes durent un temps strictement positif', () => {
  const seance = genererSeance(options());
  for (const etape of construireEtapes(seance)) {
    assert.ok(etape.secondes > 0, `${etape.titre} dure ${etape.secondes} s`);
    assert.ok(etape.titre.length > 0);
    assert.ok(etape.contexte.length > 0);
  }
});

test('le ratio accompli ne compte que l\'effort réel', () => {
  const seance = genererSeance(options());
  const etapes = construireEtapes(seance);

  assert.equal(ratioAccompli(etapes, 0), 0);
  assert.equal(ratioAccompli(etapes, etapes.length), 1);

  // S'arrêter après le seul échauffement ne vaut aucun effort.
  const finEchauffement = seance.echauffement.length;
  assert.equal(ratioAccompli(etapes, finEchauffement), 0);

  // Le ratio ne redescend jamais.
  let precedent = 0;
  for (let i = 0; i <= etapes.length; i++) {
    const ratio = ratioAccompli(etapes, i);
    assert.ok(ratio >= precedent, `le ratio a reculé en position ${i}`);
    assert.ok(ratio >= 0 && ratio <= 1);
    precedent = ratio;
  }
});

test('le temps restant décroît jusqu\'à zéro', () => {
  const seance = genererSeance(options());
  const etapes = construireEtapes(seance);

  assert.equal(secondesRestantes(etapes, 0), dureeTotaleEtapes(etapes));
  assert.equal(secondesRestantes(etapes, etapes.length), 0);

  let precedent = Infinity;
  for (let i = 0; i <= etapes.length; i++) {
    const restant = secondesRestantes(etapes, i);
    assert.ok(restant <= precedent);
    precedent = restant;
  }
});

test('le chrono s\'affiche en minutes et secondes', () => {
  assert.equal(formaterChrono(0), '0:00');
  assert.equal(formaterChrono(9), '0:09');
  assert.equal(formaterChrono(60), '1:00');
  assert.equal(formaterChrono(125), '2:05');
  assert.equal(formaterChrono(-5), '0:00', 'un temps négatif s\'affiche à zéro');
});

/* ------------------- Le repos s'adapte à l'exercice ------------------- */

test('on souffle plus longtemps après un exercice difficile qu\'après un facile', () => {
  const seance = genererSeance(options({ dureeMin: 30, niveau: 12, seed: 5 }));

  let compare = 0;
  for (const bloc of seance.blocs) {
    const durees = bloc.exercices.map((p) => ({
      difficulte: p.exercice.difficulte,
      repos: reposApres(bloc, p),
      nom: p.exercice.nom,
    }));

    for (const a of durees) {
      for (const b of durees) {
        if (a.difficulte <= b.difficulte) continue;
        compare += 1;
        assert.ok(
          a.repos >= b.repos,
          `${a.nom} (difficulté ${a.difficulte}) donne ${a.repos} s de repos, ` +
            `moins que ${b.nom} (difficulté ${b.difficulte}, ${b.repos} s)`,
        );
      }
    }
  }
  assert.ok(compare > 0, 'aucun bloc ne mélangeait des difficultés différentes : le test ne prouve rien');
});

test('le repos reste dans des bornes raisonnables', () => {
  for (const intensite of [1, 2, 3] as const) {
    for (let seed = 1; seed <= 20; seed++) {
      const seance = genererSeance(options({ intensite, seed, niveau: 15 }));
      for (const bloc of seance.blocs) {
        // Une carte du jour peut légitimement supprimer les repos d'un
        // bloc : c'est alors zéro, et non un repos trop court.
        if (bloc.reposSec === 0) continue;

        for (const prescrit of bloc.exercices) {
          const repos = reposApres(bloc, prescrit);
          assert.ok(repos >= 10, `repos de ${repos} s : trop court pour souffler`);
          assert.ok(repos <= 60, `repos de ${repos} s : ce n'est plus une séance`);
          assert.equal(repos % 5, 0, `repos de ${repos} s : devrait être arrondi à 5 s près`);
        }
      }
    }
  }
});

test('adapter le repos ne fait pas dériver la durée de la séance', () => {
  // Le repos est redistribué dans le bloc, pas ajouté : le temps demandé
  // doit rester tenu.
  for (const dureeMin of [10, 20, 30, 45]) {
    for (let seed = 1; seed <= 10; seed++) {
      const seance = genererSeance(options({ dureeMin, seed, nbModificateurs: 0 }));
      const ecart = Math.abs(seance.dureeEstimeeSec / 60 - dureeMin) / dureeMin;
      assert.ok(
        ecart <= 0.2,
        `${dureeMin} min demandées, ${(seance.dureeEstimeeSec / 60).toFixed(1)} min obtenues`,
      );
    }
  }
});

test('une carte qui supprime les repos les supprime vraiment', () => {
  const seance = genererSeance(options({ modificateursImposes: ['contre_la_montre'] }));
  for (const prescrit of seance.blocs[0].exercices) {
    assert.equal(reposApres(seance.blocs[0], prescrit), 0);
  }
  const { min, max } = plageRepos(seance.blocs[0]);
  assert.equal(min, 0);
  assert.equal(max, 0);
});

test('la plage annoncée correspond aux repos réellement joués', () => {
  const seance = genererSeance(options({ dureeMin: 30, niveau: 12, seed: 9 }));
  const etapes = construireEtapes(seance);

  seance.blocs.forEach((bloc, index) => {
    const { min, max } = plageRepos(bloc);
    const joues = etapes
      .filter((e) => e.genre === 'repos' && e.blocIndex === index)
      .map((e) => e.secondes);
    if (joues.length === 0) return;
    assert.equal(Math.min(...joues), min, `bloc ${index + 1} : minimum annoncé faux`);
    assert.equal(Math.max(...joues), max, `bloc ${index + 1} : maximum annoncé faux`);
  });
});
