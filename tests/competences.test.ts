import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VOIES,
  voieParId,
  volumeRealise,
  cumulerVolumes,
  partPratique,
  avancementPratique,
  etatVoie,
  palierCourant,
  voieAchevee,
  progressionVoie,
  programmeVoie,
  type Volumes,
} from '../src/moteur/competences';
import { genererSeance } from '../src/moteur/seance';
import { exerciceParId } from '../src/moteur/exercices';
import type { OptionsTirage } from '../src/moteur/types';

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 30,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur', 'tapis'],
    silencieux: false,
    niveau: 25,
    historiqueIds: [],
    seed: 11,
    nbModificateurs: 0,
    ...surcharge,
  };
}

/* -------------------------- Le catalogue ----------------------------- */

test('chaque voie est cohérente et mène quelque part', () => {
  const ids = VOIES.map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length, 'voies dupliquées');

  for (const voie of VOIES) {
    assert.ok(voie.paliers.length >= 3, `${voie.nom} : trop peu de paliers pour être une voie`);
    assert.ok(voie.objectif.length > 0);

    const idsPaliers = voie.paliers.map((p) => p.id);
    assert.equal(new Set(idsPaliers).size, idsPaliers.length, `${voie.nom} : paliers dupliqués`);

    for (const palier of voie.paliers) {
      const exercice = exerciceParId(palier.exerciceId);
      assert.ok(exercice, `${voie.nom} : exercice inconnu « ${palier.exerciceId} »`);
      assert.ok(palier.test.length > 0, `${palier.id} : pas de test`);
      assert.ok(palier.pourquoi.length > 0, `${palier.id} : pas de justification`);

      const seuil = palier.pratique.reps ?? palier.pratique.secondes;
      assert.ok(seuil && seuil > 0, `${palier.id} : aucune pratique exigée`);
    }

    for (const soutien of voie.soutiens) {
      assert.ok(exerciceParId(soutien), `${voie.nom} : soutien inconnu « ${soutien} »`);
    }
  }
});

test('les paliers d\'une voie vont du plus facile au plus difficile', () => {
  // C'est tout l'objet d'une voie : on ne passe pas de la planche à
  // l'équilibre libre sans les marches intermédiaires.
  for (const voie of VOIES) {
    let precedente = 0;
    for (const palier of voie.paliers) {
      const exercice = exerciceParId(palier.exerciceId)!;
      assert.ok(
        exercice.difficulte >= precedente,
        `${voie.nom} : ${exercice.nom} (${exercice.difficulte}) arrive après une difficulté ${precedente}`,
      );
      precedente = exercice.difficulte;
    }
  }
});

test('le dernier palier d\'une voie est bien son objectif', () => {
  assert.equal(voieParId('equilibre')!.paliers.at(-1)!.exerciceId, 'poirier_libre');
  assert.equal(voieParId('bras_unique')!.paliers.at(-1)!.exerciceId, 'pompes_une_main');
  assert.equal(voieParId('pistolet')!.paliers.at(-1)!.exerciceId, 'pistolet');
  assert.equal(voieParId('l_sit')!.paliers.at(-1)!.exerciceId, 'l_sit');
});

/* --------------------------- Le volume ------------------------------- */

test('le volume compte ce qui a été réellement effectué, tours compris', () => {
  const seance = genererSeance(options());
  const volumes = volumeRealise(seance, 1);

  for (const bloc of seance.blocs) {
    for (const prescrit of bloc.exercices) {
      const fait = volumes[prescrit.exercice.id];
      assert.ok(fait, `${prescrit.exercice.nom} absent du volume`);

      if (prescrit.exercice.mesure === 'reps') {
        // Chaque tour ajoute ses répétitions.
        assert.ok(
          fait.reps >= (prescrit.reps ?? 0) * bloc.tours,
          `${prescrit.exercice.nom} : ${fait.reps} reps pour ${bloc.tours} tours`,
        );
      } else {
        assert.ok(fait.secondes > 0);
      }
    }
  }

  // L'échauffement n'est pas de l'entraînement de compétence.
  for (const prescrit of seance.echauffement) {
    if (seance.blocs.some((b) => b.exercices.some((p) => p.exercice.id === prescrit.exercice.id))) {
      continue;
    }
    assert.equal(volumes[prescrit.exercice.id], undefined);
  }
});

test('une séance abandonnée ne compte que la part faite', () => {
  const seance = genererSeance(options());
  const complet = volumeRealise(seance, 1);
  const moitie = volumeRealise(seance, 0.5);

  for (const id of Object.keys(complet)) {
    assert.ok(moitie[id].reps <= complet[id].reps);
    assert.ok(moitie[id].secondes <= complet[id].secondes);
  }

  const rien = volumeRealise(seance, 0);
  for (const id of Object.keys(rien)) {
    assert.equal(rien[id].reps, 0);
    assert.equal(rien[id].secondes, 0);
  }
});

test('les volumes s\'additionnent d\'une séance à l\'autre', () => {
  const a: Volumes = { pompes: { reps: 30, secondes: 0 } };
  const b: Volumes = { pompes: { reps: 20, secondes: 0 }, squats: { reps: 40, secondes: 0 } };

  const total = cumulerVolumes(a, b);
  assert.equal(total.pompes.reps, 50);
  assert.equal(total.squats.reps, 40);

  // La fusion ne modifie pas les objets d'origine.
  assert.equal(a.pompes.reps, 30);
});

/* ------------------------- L'avancement ------------------------------ */

test('un palier ne s\'ouvre qu\'après avoir réellement pratiqué', () => {
  const voie = voieParId('equilibre')!;
  const premier = voie.paliers[0];

  assert.equal(partPratique(premier, {}), 0, 'sans rien faire, aucune pratique');

  const moitie: Volumes = {
    [premier.exerciceId]: { reps: Math.round((premier.pratique.reps ?? 0) / 2), secondes: 0 },
  };
  assert.ok(Math.abs(partPratique(premier, moitie) - 0.5) < 0.05);

  const assez: Volumes = {
    [premier.exerciceId]: { reps: premier.pratique.reps ?? 0, secondes: 0 },
  };
  assert.equal(partPratique(premier, assez), 1);

  // En faire davantage ne dépasse pas 100 %.
  const beaucoup: Volumes = {
    [premier.exerciceId]: { reps: (premier.pratique.reps ?? 0) * 10, secondes: 0 },
  };
  assert.equal(partPratique(premier, beaucoup), 1);
});

test('l\'avancement dit ce qui reste à faire, pas seulement un pourcentage', () => {
  // Un pourcentage ne dit pas quoi faire ce soir. « Il te reste 60
  // répétitions de pompes pike », si.
  const voie = voieParId('equilibre')!;
  const premier = voie.paliers[0];
  const cible = premier.pratique.reps!;

  const vide = avancementPratique(premier, {});
  assert.equal(vide.fait, 0);
  assert.equal(vide.cible, cible);
  assert.equal(vide.reste, cible);
  assert.equal(vide.unite, 'reps');

  const entame = avancementPratique(premier, {
    [premier.exerciceId]: { reps: cible - 60, secondes: 0 },
  });
  assert.equal(entame.reste, 60);

  // En faire plus que demandé n'affiche jamais un reste négatif.
  const depasse = avancementPratique(premier, {
    [premier.exerciceId]: { reps: cible * 3, secondes: 0 },
  });
  assert.equal(depasse.reste, 0);
  assert.equal(depasse.fait, cible);

  // Les paliers tenus au temps se comptent en secondes.
  assert.equal(avancementPratique(voie.paliers[1], {}).unite, 'secondes');
});

test('le test reste fermé tant que la pratique est insuffisante', () => {
  const voie = voieParId('equilibre')!;
  const etats = etatVoie(voie, [], {});

  assert.equal(etats[0].courant, true, 'le premier palier doit être le courant');
  assert.equal(etats[0].testOuvert, false, 'sans pratique, le test doit rester fermé');
  assert.equal(etats[1].courant, false, 'un seul palier courant à la fois');

  const premier = voie.paliers[0];
  const assez: Volumes = {
    [premier.exerciceId]: { reps: premier.pratique.reps ?? 0, secondes: 0 },
  };
  assert.equal(etatVoie(voie, [], assez)[0].testOuvert, true);
});

test('valider un palier fait avancer au suivant', () => {
  const voie = voieParId('pistolet')!;

  assert.equal(palierCourant(voie, [])!.id, voie.paliers[0].id);
  assert.equal(palierCourant(voie, [voie.paliers[0].id])!.id, voie.paliers[1].id);

  const etats = etatVoie(voie, [voie.paliers[0].id], {});
  assert.equal(etats[0].valide, true);
  assert.equal(etats[0].courant, false);
  assert.equal(etats[1].courant, true);
});

test('une voie entièrement validée est achevée', () => {
  const voie = voieParId('l_sit')!;
  const tous = voie.paliers.map((p) => p.id);

  assert.ok(!voieAchevee(voie, []));
  assert.ok(voieAchevee(voie, tous));

  assert.equal(progressionVoie(voie, []), 0);
  assert.equal(progressionVoie(voie, tous), 1);
  assert.ok(Math.abs(progressionVoie(voie, [tous[0]]) - 1 / tous.length) < 1e-9);

  assert.equal(palierCourant(voie, tous), null);
  assert.equal(programmeVoie(voie, tous).principal, null, 'une voie finie ne pilote plus le tirage');
});

/* ---------------- Le tirage programme réellement la voie -------------- */

test('le tirage fait sortir l\'exercice du palier en cours', () => {
  // Sans cela, une voie ne serait qu'un tableau de bord et le hasard
  // continuerait de proposer autre chose.
  const voie = voieParId('equilibre')!;
  const programme = programmeVoie(voie, []);
  const cible = voie.paliers[0].exerciceId;

  let apparitions = 0;
  const tirages = 25;
  for (let seed = 1; seed <= tirages; seed++) {
    const seance = genererSeance(
      options({
        seed,
        exercicePrincipal: programme.principal ?? undefined,
        exercicesPrioritaires: programme.soutiens,
      }),
    );
    if (seance.blocs.some((b) => b.exercices.some((p) => p.exercice.id === cible))) {
      apparitions += 1;
    }
  }

  assert.ok(
    apparitions >= tirages * 0.85,
    `l'exercice du palier n'est sorti que ${apparitions} fois sur ${tirages}`,
  );
});

test('sans voie active, le tirage ne privilégie rien', () => {
  const cible = 'poirier_tete';
  let avec = 0;
  let sans = 0;

  for (let seed = 1; seed <= 25; seed++) {
    const contient = (o: OptionsTirage) =>
      genererSeance(o).blocs.some((b) => b.exercices.some((p) => p.exercice.id === cible));

    if (contient(options({ seed, exercicePrincipal: cible }))) avec += 1;
    if (contient(options({ seed }))) sans += 1;
  }

  assert.ok(avec > sans, `la priorité ne change rien : ${avec} contre ${sans}`);
});

test('la priorité ne casse aucune contrainte de faisabilité', () => {
  // Un exercice prioritaire hors de portée ne doit pas forcer son entrée.
  for (let seed = 1; seed <= 15; seed++) {
    const seance = genererSeance(
      options({
        seed,
        niveau: 1,
        materielDispo: [],
        silencieux: true,
        exercicePrincipal: 'poirier_libre',
        exercicesPrioritaires: ['pompes_une_main', 'bulgare_saute'],
      }),
    );

    for (const bloc of seance.blocs) {
      for (const prescrit of bloc.exercices) {
        const exercice = prescrit.exercice;
        assert.ok(exercice.niveauRequis <= 1, `${exercice.nom} dépasse le niveau 1`);
        assert.equal(exercice.materiel.length, 0, `${exercice.nom} exige du matériel`);
        assert.notEqual(exercice.bruit, 'bruyant', `${exercice.nom} est bruyant`);
      }
    }
  }
});

test('une voie se boucle en pratiquant, palier après palier', () => {
  // Simulation : on enchaîne des séances pilotées par la voie et on
  // vérifie que la pratique s'accumule bien sur le bon exercice.
  const voie = voieParId('pistolet')!;
  const valides: string[] = [];
  let volumes: Volumes = {};

  for (let tour = 0; tour < 40; tour++) {
    const courant = palierCourant(voie, valides);
    if (!courant) break;

    const programme = programmeVoie(voie, valides);
    const seance = genererSeance(
      options({
        seed: 100 + tour,
        exercicePrincipal: programme.principal ?? undefined,
        exercicesPrioritaires: programme.soutiens,
      }),
    );
    volumes = cumulerVolumes(volumes, volumeRealise(seance, 1));

    if (partPratique(courant, volumes) >= 1) valides.push(courant.id);
  }

  assert.ok(
    valides.length >= 2,
    `après 40 séances pilotées, seuls ${valides.length} palier(s) ouverts : la voie n'avance pas`,
  );
});
