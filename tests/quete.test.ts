import test from 'node:test';
import assert from 'node:assert/strict';

import { genererSeanceQuete, decouperObjectif } from '../src/moteur/seance';
import { queteJournaliere } from '../src/moteur/systeme';
import { construireEtapes, dureeTotaleEtapes } from '../src/moteur/deroulement';
import { exerciceParId } from '../src/moteur/exercices';
import type { OptionsTirage } from '../src/moteur/types';

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 0,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur', 'tapis'],
    silencieux: false,
    niveau: 8,
    historiqueIds: [],
    seed: 7,
    ...surcharge,
  };
}

const JOURS = [
  '2026-01-05',
  '2026-03-17',
  '2026-06-30',
  '2026-08-02',
  '2026-11-24',
  '2026-12-31',
];

/* --------------------------- Le découpage ----------------------------- */

test('un objectif se découpe toujours en séries exactes', () => {
  // Annoncer 45 répétitions et en faire faire 48 parce que le compte
  // tombe mal serait la même trahison qu'une durée qui ne correspond pas
  // au déroulé.
  for (let objectif = 10; objectif <= 120; objectif += 5) {
    const { tours, parTour } = decouperObjectif(objectif, 'reps');
    assert.equal(tours * parTour, objectif, `${objectif} reps mal découpées`);
    assert.ok(tours >= 1 && tours <= 6);
  }

  for (let objectif = 30; objectif <= 300; objectif += 15) {
    const { tours, parTour } = decouperObjectif(objectif, 'temps');
    assert.equal(tours * parTour, objectif, `${objectif} s mal découpées`);
    assert.ok(parTour >= 15, `séries de ${parTour} s : trop courtes pour être un effort`);
  }
});

/* ------------------------ La séance de quête -------------------------- */

test('la séance de quête fait exactement ce que la quête annonce', () => {
  for (const jour of JOURS) {
    for (const niveau of [1, 8, 17, 25]) {
      const quete = queteJournaliere(jour, niveau, ['chaise', 'mur'], false);
      const seance = genererSeanceQuete(quete, options({ niveau, materielDispo: ['chaise', 'mur'] }));

      for (const ligne of quete.lignes) {
        const bloc = seance.blocs.find((b) => b.exercices[0]?.exercice.id === ligne.exerciceId);
        assert.ok(bloc, `${ligne.nom} absent de la séance de quête du ${jour}`);

        const prescrit = bloc.exercices[0];
        const parTour = ligne.unite === 'reps' ? (prescrit.reps ?? 0) : (prescrit.secondes ?? 0);
        assert.equal(
          bloc.tours * parTour,
          ligne.objectif,
          `${ligne.nom} : ${bloc.tours} × ${parTour} ne fait pas ${ligne.objectif}`,
        );
      }
    }
  }
});

test('la séance de quête garde échauffement et retour au calme', () => {
  // C'était tout l'objet de la demande : la quête doit être accompagnée
  // comme une vraie séance, pas jetée brute.
  for (const jour of JOURS) {
    const quete = queteJournaliere(jour, 10, ['chaise', 'mur', 'tapis'], false);
    const seance = genererSeanceQuete(quete, options({ niveau: 10 }));

    assert.ok(seance.echauffement.length >= 2, `${jour} : pas d'échauffement`);
    assert.ok(seance.retourCalme.length >= 2, `${jour} : pas de retour au calme`);

    const etapes = construireEtapes(seance);
    assert.equal(etapes[0].genre, 'echauffement');
    assert.equal(etapes.at(-1)!.genre, 'retour_calme');
  }
});

test('la durée annoncée est celle du déroulé réel', () => {
  // L'invariant de toute l'app : l'écran ne ment jamais sur le temps.
  for (const jour of JOURS) {
    const quete = queteJournaliere(jour, 14, ['chaise', 'mur'], false);
    const seance = genererSeanceQuete(quete, options({ niveau: 14 }));
    assert.equal(seance.dureeEstimeeSec, dureeTotaleEtapes(construireEtapes(seance)));
    assert.ok(seance.dureeEstimeeSec > 0);
  }
});

test('la quête reste jouable dans les contraintes du jour', () => {
  // Un exercice bruyant en mode appartement, ou qui exige un matériel
  // absent, rendrait la quête infaisable — donc démoralisante.
  for (const jour of JOURS) {
    const quete = queteJournaliere(jour, 3, [], true);
    const seance = genererSeanceQuete(quete, options({ niveau: 3, materielDispo: [], silencieux: true }));

    for (const bloc of seance.blocs) {
      for (const prescrit of bloc.exercices) {
        const { exercice } = prescrit;
        assert.ok(exercice.niveauRequis <= 3, `${exercice.nom} dépasse le niveau 3`);
        assert.equal(exercice.materiel.length, 0, `${exercice.nom} exige du matériel`);
        assert.notEqual(exercice.bruit, 'bruyant', `${exercice.nom} est bruyant`);
      }
    }
    for (const prescrit of [...seance.echauffement, ...seance.retourCalme]) {
      assert.notEqual(prescrit.exercice.bruit, 'bruyant');
    }
  }
});

test('la quête ne tire aucune règle du jour', () => {
  // Une quête est déjà une contrainte imposée : une carte tirée au sort
  // par-dessus en ferait une double peine.
  const quete = queteJournaliere('2026-05-04', 20, ['chaise', 'mur'], false);
  const seance = genererSeanceQuete(quete, options({ niveau: 20 }));
  assert.equal(seance.modificateurs.length, 0);
});

test('l\'XP promise est celle de la quête, pas le barème à la minute', () => {
  for (const jour of JOURS) {
    const quete = queteJournaliere(jour, 12, ['chaise', 'mur'], false);
    const seance = genererSeanceQuete(quete, options({ niveau: 12 }));
    assert.equal(seance.xpPotentiel, quete.xpRecompense);
  }
});

test('chaque bloc de quête ne contient que son exercice', () => {
  // Regrouper les trois exercices en circuit obligerait à un nombre de
  // tours commun, donc à trahir au moins un des trois objectifs.
  const quete = queteJournaliere('2026-09-09', 16, ['chaise', 'mur'], false);
  const seance = genererSeanceQuete(quete, options({ niveau: 16 }));

  assert.equal(seance.blocs.length, quete.lignes.length);
  for (const bloc of seance.blocs) {
    assert.equal(bloc.exercices.length, 1);
    assert.equal(bloc.nom, exerciceParId(bloc.exercices[0].exercice.id)!.nom);
  }
});

test('une quête tient dans un temps raisonnable', () => {
  // Une quête journalière qui prendrait une heure ne serait plus une
  // quête journalière : personne ne l'honorerait un mardi soir.
  for (const jour of JOURS) {
    for (const niveau of [1, 10, 25]) {
      const quete = queteJournaliere(jour, niveau, ['chaise', 'mur'], false);
      const seance = genererSeanceQuete(quete, options({ niveau }));
      const minutes = seance.dureeEstimeeSec / 60;
      assert.ok(minutes <= 30, `${jour} niveau ${niveau} : ${Math.round(minutes)} min, trop long`);
      assert.ok(minutes >= 3, `${jour} niveau ${niveau} : ${Math.round(minutes)} min, trop court`);
    }
  }
});
