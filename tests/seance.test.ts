import test from 'node:test';
import assert from 'node:assert/strict';

import { genererSeance, retirerExercice, retirerModificateur, idsExercices, nombreEtapes } from '../src/moteur/seance';
import { CATALOGUE, exerciceParId } from '../src/moteur/exercices';
import type { Intensite, Materiel, OptionsTirage } from '../src/moteur/types';

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 20,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur', 'tapis'],
    silencieux: false,
    niveau: 5,
    historiqueIds: [],
    seed: 1234,
    ...surcharge,
  };
}

test('la séance tient dans le temps demandé (±20 %)', () => {
  const durees = [10, 15, 20, 30, 45];
  const intensites: Intensite[] = [1, 2, 3];

  for (const dureeMin of durees) {
    for (const intensite of intensites) {
      for (let seed = 1; seed <= 8; seed++) {
        const seance = genererSeance(options({ dureeMin, intensite, seed }));
        const minutes = seance.dureeEstimeeSec / 60;
        const ecart = Math.abs(minutes - dureeMin) / dureeMin;
        assert.ok(
          ecart <= 0.2,
          `${dureeMin} min / intensité ${intensite} / graine ${seed} → ${minutes.toFixed(1)} min (écart ${(ecart * 100).toFixed(0)} %)`,
        );
      }
    }
  }
});

test('aucun exercice ne demande du matériel indisponible', () => {
  const materielDispo: Materiel[] = [];
  for (let seed = 1; seed <= 30; seed++) {
    const seance = genererSeance(options({ seed, materielDispo }));
    for (const id of idsExercices(seance)) {
      const exercice = exerciceParId(id)!;
      assert.equal(
        exercice.materiel.length,
        0,
        `${exercice.nom} exige ${exercice.materiel.join(', ')} alors qu'on n'a rien`,
      );
    }
  }
});

test('le mode silencieux écarte tous les exercices bruyants', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const seance = genererSeance(options({ seed, silencieux: true }));
    for (const id of idsExercices(seance)) {
      assert.notEqual(exerciceParId(id)!.bruit, 'bruyant', `${id} est bruyant`);
    }
  }
});

test('aucun exercice au-dessus du niveau du héros', () => {
  for (const niveau of [1, 3, 8, 15]) {
    for (let seed = 1; seed <= 15; seed++) {
      const seance = genererSeance(options({ seed, niveau }));
      for (const id of idsExercices(seance)) {
        assert.ok(
          exerciceParId(id)!.niveauRequis <= niveau,
          `${id} (niveau ${exerciceParId(id)!.niveauRequis}) tiré au niveau ${niveau}`,
        );
      }
    }
  }
});

test('une même graine redonne exactement la même séance', () => {
  const a = genererSeance(options({ seed: 999 }));
  const b = genererSeance(options({ seed: 999 }));
  assert.deepEqual(idsExercices(a), idsExercices(b));
  assert.deepEqual(
    a.modificateurs.map((m) => m.id),
    b.modificateurs.map((m) => m.id),
  );
  assert.equal(a.titre, b.titre);
});

test('deux graines différentes donnent des séances différentes', () => {
  const vues = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    vues.add(idsExercices(genererSeance(options({ seed }))).join('|'));
  }
  assert.ok(vues.size >= 18, `seulement ${vues.size} séances distinctes sur 20 graines`);
});

test('un exercice n\'apparaît jamais deux fois dans le même bloc', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const seance = genererSeance(options({ seed, dureeMin: 45 }));
    for (const bloc of seance.blocs) {
      const ids = bloc.exercices.map((p) => p.exercice.id);
      assert.equal(new Set(ids).size, ids.length, `doublon dans ${bloc.nom} : ${ids.join(', ')}`);
    }
  }
});

test('l\'historique récent fait fortement reculer les exercices déjà faits', () => {
  const reference = genererSeance(options({ seed: 77 }));
  const idsReference = new Set(
    reference.blocs.flatMap((b) => b.exercices.map((p) => p.exercice.id)),
  );

  // On rejoue les mêmes graines, mais en déclarant la séance de référence
  // comme « tout juste faite ».
  let recyclesAvec = 0;
  let recyclesSans = 0;
  for (let seed = 100; seed < 130; seed++) {
    const avec = genererSeance(options({ seed, historiqueIds: [...idsReference] }));
    const sans = genererSeance(options({ seed, historiqueIds: [] }));
    recyclesAvec += avec.blocs
      .flatMap((b) => b.exercices)
      .filter((p) => idsReference.has(p.exercice.id)).length;
    recyclesSans += sans.blocs
      .flatMap((b) => b.exercices)
      .filter((p) => idsReference.has(p.exercice.id)).length;
  }

  assert.ok(
    recyclesAvec < recyclesSans * 0.6,
    `historique peu efficace : ${recyclesAvec} répétitions avec historique contre ${recyclesSans} sans`,
  );
});

test('un focus cardio remplit surtout la séance de cardio', () => {
  let cardio = 0;
  let total = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const seance = genererSeance(options({ seed, focus: 'cardio' }));
    for (const bloc of seance.blocs) {
      for (const p of bloc.exercices) {
        total += 1;
        if (p.exercice.famille === 'cardio') cardio += 1;
      }
    }
  }
  assert.ok(cardio / total > 0.5, `seulement ${((cardio / total) * 100).toFixed(0)} % de cardio`);
});

test('chaque exercice reçoit une prescription exploitable', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const seance = genererSeance(options({ seed }));
    for (const bloc of seance.blocs) {
      for (const p of bloc.exercices) {
        if (p.exercice.mesure === 'reps') {
          assert.ok(p.reps && p.reps >= 4 && p.reps <= 40, `reps invalides pour ${p.exercice.id}: ${p.reps}`);
        } else {
          assert.ok(p.secondes && p.secondes > 0, `durée invalide pour ${p.exercice.id}`);
        }
      }
    }
  }
});

test('la séance comporte toujours un échauffement et un retour au calme', () => {
  for (const dureeMin of [10, 20, 45]) {
    const seance = genererSeance(options({ dureeMin }));
    assert.ok(seance.echauffement.length >= 2, 'échauffement trop court');
    assert.ok(seance.retourCalme.length >= 2, 'retour au calme trop court');
  }
});

test('re-tirer une carte ne change que cette carte', () => {
  const opts = options({ seed: 42 });
  const seance = genererSeance(opts);
  const avant = seance.blocs[0].exercices[1].exercice.id;
  const apres = retirerExercice(seance, 0, 1, opts, 777);

  assert.notEqual(apres.blocs[0].exercices[1].exercice.id, avant, 'la carte n\'a pas changé');

  // Tout le reste doit être identique.
  for (let b = 0; b < seance.blocs.length; b++) {
    for (let e = 0; e < seance.blocs[b].exercices.length; e++) {
      if (b === 0 && e === 1) continue;
      assert.equal(
        apres.blocs[b].exercices[e].exercice.id,
        seance.blocs[b].exercices[e].exercice.id,
        `le slot ${b}/${e} a bougé alors qu'il ne devait pas`,
      );
    }
  }
  assert.deepEqual(apres.echauffement, seance.echauffement);
});

test('re-tirer une carte modificatrice recalcule l\'XP promise', () => {
  const opts = options({ seed: 5, intensite: 3 });
  const seance = genererSeance(opts);
  assert.ok(seance.modificateurs.length > 0, 'aucun modificateur tiré');

  const apres = retirerModificateur(seance, 0, opts.niveau, 4242);
  assert.notEqual(apres.modificateurs[0].id, seance.modificateurs[0].id);

  const attendu = Math.round(
    (seance.dureeEstimeeSec / 60) *
      8 *
      1.2 *
      apres.modificateurs.reduce((p, m) => p * m.bonusXp, 1),
  );
  assert.equal(apres.xpPotentiel, attendu);
});

test('le nombre d\'étapes correspond à ce qui sera réellement enchaîné', () => {
  const seance = genererSeance(options({ dureeMin: 30 }));
  const effort = seance.blocs.reduce((t, b) => t + b.tours * b.exercices.length, 0);
  assert.equal(
    nombreEtapes(seance),
    seance.echauffement.length + effort + seance.retourCalme.length,
  );
});

test('même au niveau 1 sans matériel, le deck suffit à remplir une longue séance', () => {
  const seance = genererSeance(
    options({ niveau: 1, materielDispo: [], silencieux: true, dureeMin: 45, seed: 3 }),
  );
  for (const bloc of seance.blocs) {
    assert.ok(bloc.exercices.length >= 3, `bloc incomplet : ${bloc.exercices.length} exercices`);
  }
});

test('le catalogue est cohérent (identifiants uniques, variantes existantes)', () => {
  const ids = CATALOGUE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués dans le catalogue');

  for (const exercice of CATALOGUE) {
    for (const variante of [exercice.plusFacile, exercice.plusDur]) {
      if (variante) {
        assert.ok(exerciceParId(variante), `${exercice.id} renvoie vers ${variante}, qui n'existe pas`);
      }
    }
    assert.ok(exercice.phases.length > 0, `${exercice.id} n'a aucune phase`);
    assert.ok(Object.keys(exercice.stats).length > 0, `${exercice.id} ne rapporte aucune stat`);
  }
});
