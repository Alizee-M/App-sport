import test from 'node:test';
import assert from 'node:assert/strict';

import { genererSeanceVoie } from '../src/moteur/seance';
import { VOIES, voieParId, programmeVoie, volumeRealise } from '../src/moteur/competences';
import { construireEtapes, dureeTotaleEtapes } from '../src/moteur/deroulement';
import { exerciceParId } from '../src/moteur/exercices';
import type { OptionsTirage } from '../src/moteur/types';

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 20,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur', 'tapis'],
    silencieux: false,
    niveau: 10,
    historiqueIds: [],
    seed: 5,
    ...surcharge,
  };
}

/** L'entraînement de la première étape non franchie d'une voie. */
function entrainement(voieId: string, valides: string[] = [], surcharge: Partial<OptionsTirage> = {}) {
  const voie = voieParId(voieId)!;
  const programme = programmeVoie(voie, valides);
  return genererSeanceVoie(programme.principal!, programme.soutiens, voie.nom, options(surcharge));
}

test('l\'entraînement place le geste de l\'étape en premier', () => {
  // C'est tout l'objet d'une séance dédiée : le geste se travaille frais,
  // pas au troisième bloc quand les bras ne répondent plus.
  for (const voie of VOIES) {
    const programme = programmeVoie(voie, []);
    const tirage = genererSeanceVoie(programme.principal!, programme.soutiens, voie.nom, options({ niveau: 25 }));

    assert.ok(tirage.possible, `${voie.nom} : entraînement impossible avec tout le matériel`);
    if (!tirage.possible) continue;

    const premier = tirage.seance.blocs[0];
    assert.equal(premier.exercices.length, 1, `${voie.nom} : le premier bloc doit isoler le geste`);
    assert.equal(premier.exercices[0].exercice.id, programme.principal);
  }
});

test('le geste se repose plus longtemps que les appuis', () => {
  // Un équilibre s'apprend frais. Enchaîner à bout de souffle n'entraîne
  // plus la compétence, seulement la fatigue.
  const tirage = entrainement('equilibre', [], { niveau: 25 });
  assert.ok(tirage.possible);
  if (!tirage.possible) return;

  const [geste, appuis] = tirage.seance.blocs;
  assert.ok(appuis, 'le bloc d\'appuis manque');
  assert.ok(
    geste.reposSec > appuis.reposSec,
    `repos du geste ${geste.reposSec} s contre ${appuis.reposSec} s pour les appuis`,
  );
});

test('le niveau ne bloque pas une étape de voie, le matériel si', () => {
  // La voie *est* le chemin de déblocage : exiger d'avoir déjà le niveau
  // reviendrait à demander de savoir faire ce qu'on vient apprendre. Le
  // matériel, lui, est une contrainte physique.
  const tresHaut = voieParId('bras_unique')!;
  const dernier = tresHaut.paliers.at(-1)!;
  const bas = genererSeanceVoie(dernier.exerciceId, [], tresHaut.nom, options({ niveau: 1 }));
  assert.ok(bas.possible, 'une étape de voie doit rester praticable à bas niveau');

  // Le poirier tête au mur exige un mur : sans mur, on le dit.
  const sansMur = genererSeanceVoie('poirier_tete', [], 'L\'Équilibre', options({ materielDispo: [] }));
  assert.equal(sansMur.possible, false);
  if (!sansMur.possible) assert.deepEqual(sansMur.materielManquant, ['mur']);
});

test('les appuis retenus sont réellement praticables', () => {
  const tirage = entrainement('pistolet', [], { materielDispo: [], silencieux: true });
  assert.ok(tirage.possible);
  if (!tirage.possible) return;

  for (const bloc of tirage.seance.blocs) {
    for (const prescrit of bloc.exercices) {
      assert.equal(prescrit.exercice.materiel.length, 0, `${prescrit.exercice.nom} exige du matériel`);
      assert.notEqual(prescrit.exercice.bruit, 'bruyant');
    }
  }
});

test('l\'entraînement garde échauffement et retour au calme', () => {
  for (const voie of VOIES) {
    const programme = programmeVoie(voie, []);
    const tirage = genererSeanceVoie(programme.principal!, programme.soutiens, voie.nom, options({ niveau: 25 }));
    assert.ok(tirage.possible);
    if (!tirage.possible) continue;

    assert.ok(tirage.seance.echauffement.length >= 3, `${voie.nom} : pas d'échauffement`);
    assert.ok(tirage.seance.retourCalme.length >= 2, `${voie.nom} : pas de retour au calme`);

    const etapes = construireEtapes(tirage.seance);
    assert.equal(etapes[0].genre, 'echauffement');
    assert.equal(etapes.at(-1)!.genre, 'retour_calme');
  }
});

test('la durée annoncée est celle du déroulé, et colle au temps demandé', () => {
  for (const voie of VOIES) {
    for (const dureeMin of [10, 15, 20, 30]) {
      const tirage = entrainement(voie.id, [], { dureeMin, niveau: 25 });
      assert.ok(tirage.possible);
      if (!tirage.possible) continue;

      const { seance } = tirage;
      assert.equal(seance.dureeEstimeeSec, dureeTotaleEtapes(construireEtapes(seance)));

      const ecart = Math.abs(seance.dureeEstimeeSec / 60 - dureeMin) / dureeMin;
      assert.ok(
        ecart <= 0.15,
        `${voie.nom} : ${dureeMin} min demandées, ${Math.round(seance.dureeEstimeeSec / 60)} min obtenues`,
      );
    }
  }
});

test('une séance longue se complète au lieu de répéter le geste sans fin', () => {
  // Répéter un poirier pendant quarante-cinq minutes n'entraîne pas une
  // compétence, ça détruit des épaules. Le geste plafonne, et le temps
  // restant se remplit par du travail ordinaire — sans jamais dépasser le
  // temps demandé.
  for (const voie of VOIES) {
    const tirage = entrainement(voie.id, [], { dureeMin: 45, niveau: 25 });
    assert.ok(tirage.possible);
    if (!tirage.possible) continue;

    const { seance } = tirage;
    assert.equal(seance.blocs[0].tours, 6, `${voie.nom} : le geste devrait être au plafond`);
    assert.equal(seance.blocs.length, 3, `${voie.nom} : un bloc de complément manque`);
    assert.ok(
      seance.dureeEstimeeSec / 60 >= 30,
      `${voie.nom} : ${Math.round(seance.dureeEstimeeSec / 60)} min pour 45 demandées, trop court`,
    );
    assert.ok(seance.dureeEstimeeSec / 60 <= 45, `${voie.nom} : dépasse le temps demandé`);
  }
});

test('le temps disponible sert d\'abord au geste', () => {
  // À durée équivalente, une séance qui remplirait avec du travail
  // ordinaire plutôt que de répéter le geste ferait moins avancer la voie.
  for (const voie of VOIES) {
    const tirage = entrainement(voie.id, [], { dureeMin: 20, niveau: 25 });
    assert.ok(tirage.possible);
    if (!tirage.possible) continue;
    assert.ok(
      tirage.seance.blocs[0].tours >= 4,
      `${voie.nom} : seulement ${tirage.seance.blocs[0].tours} séries du geste en 20 minutes`,
    );
  }
});

test('l\'entraînement fait réellement avancer l\'étape', () => {
  // Une séance dédiée qui ferait moins avancer qu'un tirage au hasard
  // n'aurait aucune raison d'exister.
  for (const voie of VOIES) {
    const programme = programmeVoie(voie, []);
    const tirage = genererSeanceVoie(programme.principal!, programme.soutiens, voie.nom, options({ niveau: 25 }));
    assert.ok(tirage.possible);
    if (!tirage.possible) continue;

    const volumes = volumeRealise(tirage.seance, 1);
    const fait = volumes[programme.principal!];
    assert.ok(fait, `${voie.nom} : le geste n'apparaît pas dans le volume`);

    const exercice = exerciceParId(programme.principal!)!;
    const quantite = exercice.mesure === 'reps' ? fait.reps : fait.secondes;
    assert.ok(quantite > 0, `${voie.nom} : volume nul sur le geste`);
  }
});

test('aucune règle du jour ne vient s\'ajouter', () => {
  // Une carte « tempo escargot » par-dessus un poirier n'a pas de sens :
  // une séance de compétence se joue proprement ou pas du tout.
  const tirage = entrainement('equilibre', [], { niveau: 25, intensite: 3 });
  assert.ok(tirage.possible);
  if (!tirage.possible) return;
  assert.equal(tirage.seance.modificateurs.length, 0);
});

test('une voie achevée ne propose plus d\'entraînement', () => {
  const voie = voieParId('l_sit')!;
  const programme = programmeVoie(voie, voie.paliers.map((p) => p.id));
  assert.equal(programme.principal, null);
});
