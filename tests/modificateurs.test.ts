import test from 'node:test';
import assert from 'node:assert/strict';

import { genererSeance, retirerModificateur } from '../src/moteur/seance';
import { construireEtapes, dureeTotaleEtapes, estEffort } from '../src/moteur/deroulement';
import { MODIFICATEURS, MODIFICATEURS_PAR_ID } from '../src/moteur/modificateurs';
import { exerciceParId } from '../src/moteur/exercices';
import type { Materiel, OptionsTirage } from '../src/moteur/types';

/* ----------------------------------------------------------------------
 * Les cartes « règle du jour » qui se disent appliquées doivent l'être
 * réellement. Une carte annonçant un changement que l'écran contredit
 * n'est pas une règle du jeu, c'est un mensonge.
 * -------------------------------------------------------------------- */

const NIVEAU_TEST = 15;
const MATERIEL_TEST: Materiel[] = ['chaise', 'mur', 'tapis'];

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 30,
    intensite: 2,
    focus: 'complet',
    materielDispo: MATERIEL_TEST,
    silencieux: false,
    niveau: NIVEAU_TEST,
    historiqueIds: [],
    seed: 4242,
    ...surcharge,
  };
}

/** La même séance, avec et sans la carte étudiée. */
function comparer(idCarte: string, surcharge: Partial<OptionsTirage> = {}) {
  const base = genererSeance(options({ ...surcharge, modificateursImposes: [] }));
  const avec = genererSeance(options({ ...surcharge, modificateursImposes: [idCarte] }));
  return { base, avec };
}

test('la durée annoncée est toujours celle du déroulé réel', () => {
  // C'est l'invariant central : peu importe les cartes, ce qui est
  // affiché à l'utilisateur doit correspondre à ce qu'il va vivre.
  for (const carte of [...MODIFICATEURS.map((m) => m.id), '']) {
    for (const dureeMin of [10, 20, 45]) {
      for (let seed = 1; seed <= 3; seed++) {
        const seance = genererSeance(
          options({ dureeMin, seed, modificateursImposes: carte ? [carte] : [] }),
        );
        const reel = dureeTotaleEtapes(construireEtapes(seance));
        assert.equal(
          seance.dureeEstimeeSec,
          reel,
          `carte « ${carte || 'aucune'} », ${dureeMin} min : annoncé ${seance.dureeEstimeeSec} s, déroulé ${reel} s`,
        );
      }
    }
  }
});

test('Chrono serré raccourcit réellement les repos', () => {
  const { base, avec } = comparer('repos_court');
  for (let i = 0; i < base.blocs.length; i++) {
    assert.equal(avec.blocs[i].reposSec, Math.max(5, base.blocs[i].reposSec - 5));
  }
  assert.ok(avec.dureeEstimeeSec < base.dureeEstimeeSec, 'la séance devrait raccourcir');
});

test('Contre la montre supprime les repos du premier bloc, et seulement de celui-là', () => {
  const { base, avec } = comparer('contre_la_montre');
  assert.equal(avec.blocs[0].reposSec, 0);
  for (let i = 1; i < avec.blocs.length; i++) {
    assert.equal(avec.blocs[i].reposSec, base.blocs[i].reposSec, `le bloc ${i + 1} ne devait pas bouger`);
  }

  // Et le déroulé ne doit pas contenir d'étape de repos vide dans ce bloc.
  const etapes = construireEtapes(avec);
  const reposDuPremier = etapes.filter((e) => e.genre === 'repos' && e.blocIndex === 0);
  assert.equal(reposDuPremier.length, 0, 'aucun repos ne doit subsister dans le premier bloc');
  for (const etape of etapes) {
    assert.ok(etape.secondes > 0, `étape de durée nulle : ${etape.titre}`);
  }
});

test('Double peine ajoute un tour à chaque bloc', () => {
  const { base, avec } = comparer('dernier_tour_double');
  for (let i = 0; i < base.blocs.length; i++) {
    assert.equal(avec.blocs[i].tours, base.blocs[i].tours + 1);
  }
  assert.ok(avec.dureeEstimeeSec > base.dureeEstimeeSec);
});

test('Encore un n\'ajoute un tour qu\'au dernier bloc', () => {
  const { base, avec } = comparer('un_tour_de_plus');
  const dernier = base.blocs.length - 1;
  for (let i = 0; i < base.blocs.length; i++) {
    const attendu = i === dernier ? base.blocs[i].tours + 1 : base.blocs[i].tours;
    assert.equal(avec.blocs[i].tours, attendu, `bloc ${i + 1}`);
  }
});

test('Grand prêt joue l\'échauffement deux fois', () => {
  const { base, avec } = comparer('echauffement_double');
  assert.equal(avec.echauffement.length, base.echauffement.length * 2);
  assert.deepEqual(
    avec.echauffement.map((p) => p.exercice.id),
    [...base.echauffement, ...base.echauffement].map((p) => p.exercice.id),
  );
});

test('Le miroir inverse le dernier bloc, et lui seul', () => {
  const { base, avec } = comparer('miroir');
  const dernier = base.blocs.length - 1;

  assert.deepEqual(
    avec.blocs[dernier].exercices.map((p) => p.exercice.id),
    [...base.blocs[dernier].exercices].reverse().map((p) => p.exercice.id),
  );
  for (let i = 0; i < dernier; i++) {
    assert.deepEqual(
      avec.blocs[i].exercices.map((p) => p.exercice.id),
      base.blocs[i].exercices.map((p) => p.exercice.id),
      `le bloc ${i + 1} ne devait pas être réordonné`,
    );
  }
});

test('Pyramide fait monter la charge à chaque tour', () => {
  const { base, avec } = comparer('pyramide');
  assert.ok(avec.dureeEstimeeSec > base.dureeEstimeeSec, 'les positions tenues durent plus longtemps');

  const etapes = construireEtapes(avec).filter(estEffort);
  const parExercice = new Map<string, { tour: number; charge: number }[]>();

  for (const etape of etapes) {
    if (etape.blocIndex !== 0) continue;
    const prescrit = etape.prescrit!;
    const charge = prescrit.exercice.mesure === 'reps' ? prescrit.reps! : prescrit.secondes!;
    const liste = parExercice.get(prescrit.exercice.id) ?? [];
    liste.push({ tour: etape.tour!, charge });
    parExercice.set(prescrit.exercice.id, liste);
  }

  for (const [id, mesures] of parExercice) {
    mesures.sort((a, b) => a.tour - b.tour);
    for (let i = 1; i < mesures.length; i++) {
      assert.ok(
        mesures[i].charge > mesures[i - 1].charge,
        `${id} : tour ${mesures[i].tour} pas plus dur que le précédent (${mesures[i - 1].charge} → ${mesures[i].charge})`,
      );
    }
  }
});

test('Montée en gamme remplace les exercices par leur version plus dure', () => {
  const { base, avec } = comparer('variante_dure');

  let remplaces = 0;
  for (let b = 0; b < base.blocs.length; b++) {
    for (let e = 0; e < base.blocs[b].exercices.length; e++) {
      const avant = base.blocs[b].exercices[e].exercice;
      const apres = avec.blocs[b].exercices[e].exercice;

      if (apres.id === avant.id) continue; // aucune version plus dure disponible

      remplaces += 1;
      assert.ok(
        apres.difficulte > avant.difficulte,
        `${avant.id} (difficulté ${avant.difficulte}) remplacé par ${apres.id} (${apres.difficulte}), qui n'est pas plus dur`,
      );

      // La variante déclarée prime — mais seulement si elle est jouable :
      // certaines ne se débloquent qu'à un niveau plus élevé que celui du
      // héros, et c'est alors le repli par famille qui s'applique.
      const declaree = avant.plusDur ? exerciceParId(avant.plusDur) : undefined;
      const declareeJouable =
        declaree !== undefined &&
        declaree.niveauRequis <= NIVEAU_TEST &&
        declaree.materiel.every((m) => MATERIEL_TEST.includes(m));

      if (declareeJouable) {
        assert.equal(apres.id, avant.plusDur, `${avant.id} aurait dû devenir ${avant.plusDur}`);
      } else {
        assert.equal(apres.famille, avant.famille, `${apres.id} a changé de famille`);
      }
    }
  }
  assert.ok(remplaces > 0, 'aucun exercice remplacé : le test ne prouve rien');
});

test('une variante plus dure indisponible ne casse pas la séance', () => {
  // Au niveau 1 et sans matériel, la plupart des variantes dures sont
  // hors de portée : la carte doit alors ne rien faire, pas planter.
  const seance = genererSeance(
    options({ niveau: 1, materielDispo: [], silencieux: true, modificateursImposes: ['variante_dure'] }),
  );
  for (const bloc of seance.blocs) {
    for (const prescrit of bloc.exercices) {
      assert.ok(prescrit.exercice.niveauRequis <= 1, `${prescrit.exercice.id} dépasse le niveau 1`);
      assert.equal(prescrit.exercice.materiel.length, 0, `${prescrit.exercice.id} exige du matériel`);
      assert.notEqual(prescrit.exercice.bruit, 'bruyant', `${prescrit.exercice.id} est bruyant`);
    }
  }
});

test('les cartes de comportement ne touchent pas à la structure', () => {
  const base = genererSeance(options({ modificateursImposes: [] }));

  for (const carte of MODIFICATEURS.filter((m) => !m.applique)) {
    const avec = genererSeance(options({ modificateursImposes: [carte.id] }));
    assert.equal(avec.dureeEstimeeSec, base.dureeEstimeeSec, `${carte.nom} a changé la durée`);
    assert.deepEqual(
      avec.blocs.map((b) => b.exercices.map((p) => p.exercice.id)),
      base.blocs.map((b) => b.exercices.map((p) => p.exercice.id)),
      `${carte.nom} a changé les exercices`,
    );
  }
});

test('toute carte annoncée comme appliquée modifie effectivement la séance', () => {
  const base = genererSeance(options({ modificateursImposes: [] }));
  const empreinte = (s: ReturnType<typeof genererSeance>) =>
    JSON.stringify({
      duree: s.dureeEstimeeSec,
      echauffement: s.echauffement.map((p) => p.exercice.id),
      blocs: s.blocs.map((b) => ({
        tours: b.tours,
        repos: b.reposSec,
        pyramide: b.progressionReps ?? 0,
        exercices: b.exercices.map((p) => p.exercice.id),
      })),
    });

  for (const carte of MODIFICATEURS.filter((m) => m.applique)) {
    const avec = genererSeance(options({ modificateursImposes: [carte.id] }));
    assert.notEqual(
      empreinte(avec),
      empreinte(base),
      `${carte.nom} se dit appliquée mais ne change rien`,
    );
  }
});

test('échanger une carte remplace ses effets par ceux de la nouvelle', () => {
  const opts = options({ modificateursImposes: ['dernier_tour_double'] });
  const seance = genererSeance(opts);
  const toursAvant = seance.blocs.map((b) => b.tours);

  const apres = retirerModificateur(seance, 0, opts, 31337);
  assert.notEqual(apres.modificateurs[0].id, 'dernier_tour_double', 'la carte n\'a pas changé');

  // Les exercices ne bougent pas : seule la règle change.
  assert.deepEqual(
    apres.blocs.map((b) => b.exercices.map((p) => p.exercice.id)),
    seance.blocs.map((b) => b.exercices.map((p) => p.exercice.id)),
  );
  assert.equal(apres.titre, seance.titre);

  // Et l'effet de l'ancienne carte a bien disparu.
  if (apres.modificateurs[0].id !== 'un_tour_de_plus') {
    assert.notDeepEqual(apres.blocs.map((b) => b.tours), toursAvant);
  }
  assert.equal(apres.dureeEstimeeSec, dureeTotaleEtapes(construireEtapes(apres)));
});

test('chaque carte déclare honnêtement si elle est appliquée', () => {
  const appliquees = [
    'dernier_tour_double', 'repos_court', 'pyramide', 'miroir',
    'un_tour_de_plus', 'contre_la_montre', 'variante_dure', 'echauffement_double',
  ];

  for (const id of appliquees) {
    assert.ok(MODIFICATEURS_PAR_ID[id]?.applique, `${id} devrait être marquée comme appliquée`);
  }
  for (const carte of MODIFICATEURS) {
    assert.equal(
      carte.applique,
      appliquees.includes(carte.id),
      `${carte.nom} : le marqueur « appliquée » ne correspond pas à la réalité`,
    );
  }
});

test('aucune description ne promet un écran éteint', () => {
  // L'app est un écran : une carte qui l'interdit se contredit elle-même.
  for (const carte of MODIFICATEURS) {
    assert.ok(
      !/aucun écran|sans écran|éteins l'écran/i.test(carte.description),
      `${carte.nom} interdit l'écran alors que la séance se suit dessus`,
    );
  }
});
