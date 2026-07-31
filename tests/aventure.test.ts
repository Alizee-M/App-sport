import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ZONES,
  parcours,
  noeudCourant,
  noeudParId,
  zoneDuNoeud,
  zoneDebloquee,
  avancement,
  seanceValideNoeud,
  optionsPourNoeud,
} from '../src/moteur/aventure';
import { genererSeance } from '../src/moteur/seance';
import { DEFIS, defisDisponibles, estRecord, formaterScore, plusGrandEstMeilleur, xpPourDefi } from '../src/moteur/defis';
import { exerciceParId } from '../src/moteur/exercices';
import { creerAlea } from '../src/moteur/alea';
import { accueilCoach, repliqueCoach } from '../src/moteur/coach';

test('la carte est cohérente (identifiants uniques, un boss par zone)', () => {
  const ids = parcours().map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'nœuds dupliqués');

  for (const zone of ZONES) {
    const boss = zone.noeuds.filter((n) => n.type === 'boss');
    assert.equal(boss.length, 1, `${zone.nom} devrait avoir exactement un boss`);
    assert.equal(zone.noeuds[zone.noeuds.length - 1].type, 'boss', `le boss de ${zone.nom} doit clore la zone`);
  }
});

test('la difficulté des nœuds ne redescend pas d\'une zone à l\'autre', () => {
  for (let i = 1; i < ZONES.length; i++) {
    assert.ok(
      ZONES[i].niveauConseille > ZONES[i - 1].niveauConseille,
      `${ZONES[i].nom} devrait être conseillée plus tard que ${ZONES[i - 1].nom}`,
    );
  }
});

test('le nœud courant est le premier non terminé', () => {
  const tous = parcours();
  assert.equal(noeudCourant([])?.id, tous[0].id);
  assert.equal(noeudCourant([tous[0].id])?.id, tous[1].id);
  assert.equal(noeudCourant(tous.map((n) => n.id)), null);
});

test('les zones se débloquent dans l\'ordre', () => {
  assert.ok(zoneDebloquee(ZONES[0], []), 'la première zone est toujours ouverte');
  assert.ok(!zoneDebloquee(ZONES[1], []), 'la deuxième zone ne doit pas être ouverte au départ');

  const premiereFinie = ZONES[0].noeuds.map((n) => n.id);
  assert.ok(zoneDebloquee(ZONES[1], premiereFinie), 'la deuxième zone doit s\'ouvrir après la première');
});

test('l\'avancement compte correctement les nœuds validés', () => {
  const tous = parcours();
  const debut = avancement([]);
  assert.equal(debut.faits, 0);
  assert.equal(debut.total, tous.length);
  assert.equal(debut.noeudCourant?.id, tous[0].id);
  assert.ok(debut.zoneCourante);

  const fin = avancement(tous.map((n) => n.id));
  assert.equal(fin.faits, tous.length);
  assert.equal(fin.noeudCourant, null);
  assert.equal(fin.progression, 1);
});

test('zoneDuNoeud retrouve la bonne zone', () => {
  for (const zone of ZONES) {
    for (const noeud of zone.noeuds) {
      assert.equal(zoneDuNoeud(noeud.id)?.id, zone.id);
      assert.equal(noeudParId(noeud.id)?.nom, noeud.nom);
    }
  }
});

test('une séance tirée pour un nœud valide toujours ce nœud', () => {
  for (const noeud of parcours()) {
    for (let seed = 1; seed <= 5; seed++) {
      const opts = optionsPourNoeud(noeud, {
        materielDispo: ['chaise', 'mur', 'tapis'],
        silencieux: false,
        niveau: 20,
        historiqueIds: [],
        seed,
      });
      const seance = genererSeance(opts);
      assert.ok(
        seanceValideNoeud(seance, noeud),
        `${noeud.nom} : séance de ${(seance.dureeEstimeeSec / 60).toFixed(1)} min ` +
          `(exigée ${noeud.exigence.dureeMin}), intensité ${seance.intensite}, focus ${seance.focus}`,
      );
    }
  }
});

test('une séance trop courte ou trop molle ne valide pas un nœud', () => {
  const noeud = parcours().find((n) => n.exigence.dureeMin >= 30 && n.exigence.intensiteMin === 3)!;
  const base = {
    materielDispo: ['chaise' as const],
    silencieux: false,
    niveau: 20,
    historiqueIds: [],
    seed: 1,
  };

  const tropCourte = genererSeance({ ...optionsPourNoeud(noeud, base), dureeMin: 10 });
  assert.ok(!seanceValideNoeud(tropCourte, noeud), 'une séance de 10 min ne devrait pas passer');

  const tropMolle = genererSeance({ ...optionsPourNoeud(noeud, base), intensite: 1 });
  assert.ok(!seanceValideNoeud(tropMolle, noeud), 'une séance tranquille ne devrait pas passer');
});

test('un boss impose deux cartes modificatrices', () => {
  const boss = parcours().filter((n) => n.type === 'boss');
  for (const noeud of boss) {
    const seance = genererSeance(
      optionsPourNoeud(noeud, {
        materielDispo: [],
        silencieux: false,
        niveau: 20,
        historiqueIds: [],
        seed: 12,
      }),
    );
    assert.equal(seance.type, 'boss');
    assert.equal(seance.modificateurs.length, 2, `${noeud.nom} : ${seance.modificateurs.length} carte(s)`);
    assert.equal(seance.titre, noeud.nom);
  }
});

/* ------------------------------- Défis ------------------------------- */

test('les défis renvoient vers des exercices qui existent', () => {
  const ids = DEFIS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants de défis dupliqués');

  for (const defi of DEFIS) {
    assert.ok(defi.etapes.length > 0, `${defi.id} n'a aucune étape`);
    for (const etape of defi.etapes) {
      assert.ok(exerciceParId(etape.exerciceId), `${defi.id} renvoie vers ${etape.exerciceId}, inconnu`);
    }
    if (defi.format === 'amrap') {
      assert.ok(defi.dureeSec && defi.dureeSec > 0, `${defi.id} est un AMRAP sans durée`);
    }
    if (defi.format === 'chrono') {
      assert.ok(
        defi.etapes.every((e) => e.reps && e.reps > 0),
        `${defi.id} est un chrono sans objectif de répétitions`,
      );
    }
  }
});

test('les défis se débloquent avec le niveau', () => {
  assert.ok(defisDisponibles(1).length > 0, 'il faut au moins un défi dès le niveau 1');
  assert.ok(defisDisponibles(20).length >= defisDisponibles(1).length);
});

test('un record se juge dans le bon sens selon le format', () => {
  const chrono = DEFIS.find((d) => d.format === 'chrono')!;
  const amrap = DEFIS.find((d) => d.format === 'amrap')!;

  assert.ok(!plusGrandEstMeilleur(chrono));
  assert.ok(plusGrandEstMeilleur(amrap));

  // Sur un chrono, plus vite = mieux.
  assert.ok(estRecord(chrono, 90, 120));
  assert.ok(!estRecord(chrono, 150, 120));

  // Sur un AMRAP, plus de répétitions = mieux.
  assert.ok(estRecord(amrap, 30, 25));
  assert.ok(!estRecord(amrap, 20, 25));

  // Un premier score est toujours un record.
  assert.ok(estRecord(chrono, 200, null));
  assert.ok(estRecord(amrap, 5, undefined));
  assert.ok(!estRecord(amrap, 0, null), 'un score nul n\'est pas un record');
});

test('les scores en secondes s\'affichent en minutes au-delà de 60 s', () => {
  const chrono = DEFIS.find((d) => d.unite === 'secondes')!;
  assert.equal(formaterScore(chrono, 45), '45 s');
  assert.equal(formaterScore(chrono, 125), '2 min 05 s');

  const amrap = DEFIS.find((d) => d.unite !== 'secondes')!;
  assert.ok(formaterScore(amrap, 12).includes(amrap.unite));
});

test('battre un record rapporte deux fois plus d\'XP', () => {
  const defi = DEFIS[0];
  assert.equal(xpPourDefi(defi, true), xpPourDefi(defi, false) * 2);
});

/* ------------------------------- Coach ------------------------------- */

test('le coach répond dans tous les contextes, sans variable oubliée', () => {
  const contextes = [
    'accueil', 'accueil_serie', 'retour_apres_pause', 'debut_seance', 'echauffement',
    'debut_exo', 'mi_effort', 'fin_exo', 'repos', 'dernier_tour', 'derniere_seconde',
    'retour_calme', 'fin_seance', 'record', 'niveau_gagne', 'boss_vaincu', 'abandon',
    'exercice_retire',
  ] as const;

  for (const contexte of contextes) {
    for (let graine = 1; graine <= 40; graine++) {
      const texte = repliqueCoach(contexte, creerAlea(graine), {
        exercice: 'Pompes',
        serie: 5,
        niveau: 7,
      });
      assert.ok(texte.length > 0, `réplique vide pour ${contexte}`);
      assert.ok(!texte.includes('{'), `variable non remplacée dans « ${texte} »`);
    }
  }
});

test('l\'accueil du coach s\'adapte à l\'état du joueur', () => {
  const alea = creerAlea(3);
  assert.ok(accueilCoach(alea, 0, null).length > 0);
  assert.ok(accueilCoach(creerAlea(3), 5, 0).includes('5'), 'la série doit apparaître dans le message');
  assert.ok(accueilCoach(creerAlea(3), 0, 10).length > 0, 'un retour après pause doit être géré');
});
