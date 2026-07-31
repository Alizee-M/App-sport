import test from 'node:test';
import assert from 'node:assert/strict';

import {
  construireEtapes,
  dureeTotaleEtapes,
  ratioAccompli,
  secondesRestantes,
  formaterChrono,
  estEffort,
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
