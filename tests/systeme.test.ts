import test from 'node:test';
import assert from 'node:assert/strict';

import {
  metDe,
  kcalPour,
  caloriesSeance,
  RECOMPENSES,
  recompenseParId,
  progressionQuete,
  queteAccomplie,
  kcalRestantes,
  seancesRestantes,
} from '../src/moteur/calories';
import {
  RANGS,
  rangPourNiveau,
  palierPourNiveau,
  prochainPalier,
  pointsVides,
  totalPoints,
  bonusPoints,
  queteJournaliere,
  grainePourJour,
  calculerPenalite,
  appliquerPenalite,
  joursManquesEntre,
  PENALITES_MAX,
  POINTS_PAR_NIVEAU,
} from '../src/moteur/systeme';
import { genererSeance } from '../src/moteur/seance';
import { CATALOGUE, exerciceParId } from '../src/moteur/exercices';
import { xpCumuleePourAtteindre } from '../src/moteur/progression';
import type { OptionsTirage } from '../src/moteur/types';

const POIDS_TEST = 70;

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 20,
    intensite: 3,
    focus: 'complet',
    materielDispo: ['chaise', 'mur'],
    silencieux: false,
    niveau: 8,
    historiqueIds: [],
    seed: 3,
    nbModificateurs: 0,
    ...surcharge,
  };
}

/* ---------------------------- Les calories ---------------------------- */

test('la formule MET donne les valeurs de référence', () => {
  // 8 MET, 70 kg, 60 min → 8 × 3,5 × 70 / 200 = 9,8 kcal/min, soit 588.
  assert.equal(Math.round(kcalPour(8, 70, 3600)), 588);
  assert.equal(Math.round(kcalPour(8, 70, 60)), 10);
  assert.equal(kcalPour(8, 0, 3600), 0);
});

test('un exercice difficile coûte plus cher qu\'un exercice facile', () => {
  for (const exercice of CATALOGUE) {
    const met = metDe(exercice);
    assert.ok(met >= 2 && met <= 11, `${exercice.nom} : MET aberrant de ${met}`);
  }

  const facile = exerciceParId('mollets')!;
  const dur = exerciceParId('burpees')!;
  assert.ok(metDe(dur) > metDe(facile));

  // La mobilité reste un effort léger, quelle que soit la difficulté.
  assert.ok(metDe(exerciceParId('cercles_bras')!) < 3);
});

test('sans poids renseigné, aucune calorie n\'est inventée', () => {
  const seance = genererSeance(options());
  assert.equal(caloriesSeance(seance, 0), 0);
  assert.equal(caloriesSeance(seance, -5), 0);
});

test('la dépense d\'une séance reste dans un ordre de grandeur crédible', () => {
  // Une séance maison de 20 minutes ne brûle pas 600 kcal, quoi qu'en
  // disent les applications optimistes.
  const seance = genererSeance(options({ dureeMin: 20, intensite: 3 }));
  const kcal = caloriesSeance(seance, POIDS_TEST);

  assert.ok(kcal > 50, `${kcal} kcal pour 20 min : invraisemblablement bas`);
  assert.ok(kcal < 250, `${kcal} kcal pour 20 min : invraisemblablement haut`);
});

test('la dépense grandit avec la durée, l\'intensité et le poids', () => {
  const court = caloriesSeance(genererSeance(options({ dureeMin: 10 })), POIDS_TEST);
  const long = caloriesSeance(genererSeance(options({ dureeMin: 45 })), POIDS_TEST);
  assert.ok(long > court * 2, 'une séance quatre fois plus longue doit coûter bien plus');

  const doux = caloriesSeance(genererSeance(options({ intensite: 1 })), POIDS_TEST);
  const dur = caloriesSeance(genererSeance(options({ intensite: 3 })), POIDS_TEST);
  assert.ok(dur > doux);

  const leger = caloriesSeance(genererSeance(options()), 55);
  const lourd = caloriesSeance(genererSeance(options()), 95);
  assert.ok(lourd > leger, 'à effort égal, une personne plus lourde dépense davantage');
});

test('une séance abandonnée ne compte que ce qui a été fait', () => {
  const seance = genererSeance(options());
  const complet = caloriesSeance(seance, POIDS_TEST, 1);
  const moitie = caloriesSeance(seance, POIDS_TEST, 0.5);
  assert.ok(moitie < complet);
  assert.equal(caloriesSeance(seance, POIDS_TEST, 0), 0);
});

/* --------------------------- Les récompenses -------------------------- */

test('le catalogue de récompenses est cohérent', () => {
  const ids = RECOMPENSES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués');

  for (const recompense of RECOMPENSES) {
    assert.ok(recompense.kcal > 0, `${recompense.nom} : valeur nulle`);
    assert.ok(recompense.kcal < 3000, `${recompense.nom} : valeur invraisemblable`);
  }

  // Les paliers doivent refléter la valeur énergétique, sinon ils mentent.
  const maxParPalier = { petite: 0, moyenne: 0, grosse: 0, legendaire: 0 };
  const minParPalier = { petite: Infinity, moyenne: Infinity, grosse: Infinity, legendaire: Infinity };
  for (const r of RECOMPENSES) {
    maxParPalier[r.palier] = Math.max(maxParPalier[r.palier], r.kcal);
    minParPalier[r.palier] = Math.min(minParPalier[r.palier], r.kcal);
  }
  assert.ok(maxParPalier.petite < minParPalier.moyenne);
  assert.ok(maxParPalier.moyenne < minParPalier.grosse);
  assert.ok(maxParPalier.grosse < minParPalier.legendaire);
});

test('un burger demande plusieurs séances, et l\'app le dit', () => {
  // C'est l'enjeu central : annoncer qu'une séance suffit serait mentir
  // d'un facteur cinq.
  const seance = genererSeance(options({ dureeMin: 20, intensite: 3 }));
  const parSeance = caloriesSeance(seance, POIDS_TEST);

  const burger = recompenseParId('burger')!;
  const quete = { recompenseId: 'burger', kcalAccumulees: 0, debutee: '2026-01-01' };

  const necessaires = seancesRestantes(quete, parSeance);
  assert.ok(
    necessaires >= 3,
    `un burger de ${burger.kcal} kcal ne devrait pas tenir en ${necessaires} séance(s) de ${parSeance} kcal`,
  );

  // Et le menu complet doit coûter nettement plus cher que le burger seul.
  const menu = { recompenseId: 'menu_burger', kcalAccumulees: 0, debutee: '2026-01-01' };
  assert.ok(seancesRestantes(menu, parSeance) > necessaires);
});

test('la progression d\'une quête suit les calories accumulées', () => {
  const burger = recompenseParId('burger')!;
  const quete = { recompenseId: 'burger', kcalAccumulees: 0, debutee: '2026-01-01' };

  assert.equal(progressionQuete(quete), 0);
  assert.ok(!queteAccomplie(quete));
  assert.equal(kcalRestantes(quete), burger.kcal);

  quete.kcalAccumulees = burger.kcal / 2;
  assert.ok(Math.abs(progressionQuete(quete) - 0.5) < 0.01);

  quete.kcalAccumulees = burger.kcal;
  assert.equal(progressionQuete(quete), 1);
  assert.ok(queteAccomplie(quete));
  assert.equal(kcalRestantes(quete), 0);
  assert.equal(seancesRestantes(quete, 100), 0);

  // Dépasser l'objectif ne fait pas déborder la barre.
  quete.kcalAccumulees = burger.kcal * 3;
  assert.equal(progressionQuete(quete), 1);
  assert.equal(kcalRestantes(quete), 0);
});

test('une quête pointant vers une récompense inconnue ne casse rien', () => {
  const quete = { recompenseId: 'inexistant', kcalAccumulees: 100, debutee: '2026-01-01' };
  assert.equal(progressionQuete(quete), 0);
  assert.equal(kcalRestantes(quete), 0);
});

/* ------------------------------ Les rangs ----------------------------- */

test('les rangs montent de E à S sans jamais redescendre', () => {
  assert.equal(rangPourNiveau(1), 'E');
  assert.equal(rangPourNiveau(30), 'S');

  let precedent = -1;
  for (let niveau = 1; niveau <= 40; niveau++) {
    const index = RANGS.indexOf(rangPourNiveau(niveau));
    assert.ok(index >= precedent, `le rang recule au niveau ${niveau}`);
    precedent = index;
  }
});

test('chaque rang annonce le suivant, sauf le dernier', () => {
  assert.equal(prochainPalier(1)?.rang, 'D');
  assert.equal(prochainPalier(100), null);

  for (let niveau = 1; niveau <= 30; niveau++) {
    const palier = palierPourNiveau(niveau);
    assert.ok(palier.titre.length > 0);
    assert.ok(/^#[0-9a-f]{6}$/i.test(palier.couleur), `couleur invalide : ${palier.couleur}`);
  }
});

/* ---------------------------- Les points ------------------------------ */

test('les points investis rapportent un bonus plafonné', () => {
  const points = pointsVides();
  assert.equal(totalPoints(points), 0);
  assert.equal(bonusPoints(points, 'force'), 0);

  points.force = 5;
  assert.ok(Math.abs(bonusPoints(points, 'force') - 0.1) < 1e-9);
  assert.equal(bonusPoints(points, 'cardio'), 0, 'les points d\'une stat ne servent pas à une autre');

  // Le plafond empêche de rendre les autres stats inutiles.
  points.force = 500;
  assert.equal(bonusPoints(points, 'force'), 0.3);
});

test('une séance complète profite de la répartition moyenne', () => {
  const points = pointsVides();
  points.force = 4;
  points.cardio = 4;
  points.souplesse = 4;
  points.gainage = 4;
  assert.ok(bonusPoints(points, 'complet') > 0);
  assert.ok(bonusPoints(points, 'complet') <= 0.3);
});

test('chaque montée de niveau donne des points à répartir', () => {
  assert.ok(POINTS_PAR_NIVEAU > 0);
});

/* ------------------------ La quête journalière ------------------------ */

test('la quête du jour ne change pas dans la journée', () => {
  const a = queteJournaliere('2026-03-10', 8, ['chaise'], false);
  const b = queteJournaliere('2026-03-10', 8, ['chaise'], false);
  assert.deepEqual(a, b);

  const lendemain = queteJournaliere('2026-03-11', 8, ['chaise'], false);
  assert.notDeepEqual(
    a.lignes.map((l) => l.exerciceId),
    lendemain.lignes.map((l) => l.exerciceId),
  );
});

test('la quête du jour est faisable avec ce dont on dispose', () => {
  for (const jour of ['2026-01-05', '2026-06-18', '2026-11-30']) {
    for (const niveau of [1, 10, 25]) {
      const quete = queteJournaliere(jour, niveau, [], true);
      assert.equal(quete.lignes.length, 3, 'trois lignes attendues');

      for (const ligne of quete.lignes) {
        const exercice = exerciceParId(ligne.exerciceId)!;
        assert.ok(exercice, `exercice inconnu : ${ligne.exerciceId}`);
        assert.ok(exercice.niveauRequis <= niveau, `${exercice.nom} dépasse le niveau ${niveau}`);
        assert.equal(exercice.materiel.length, 0, `${exercice.nom} exige du matériel`);
        assert.notEqual(exercice.bruit, 'bruyant', `${exercice.nom} est bruyant`);
        assert.ok(ligne.objectif > 0);
      }

      // Trois familles distinctes : une quête journalière touche tout le corps.
      const familles = quete.lignes.map((l) => exerciceParId(l.exerciceId)!.famille);
      assert.equal(new Set(familles).size, familles.length, `familles répétées : ${familles}`);
    }
  }
});

test('l\'objectif journalier monte avec le niveau sans devenir absurde', () => {
  const debutant = queteJournaliere('2026-04-01', 1, [], false);
  const confirme = queteJournaliere('2026-04-01', 25, [], false);

  const total = (q: typeof debutant) => q.lignes.reduce((s, l) => s + l.objectif, 0);
  assert.ok(total(confirme) > total(debutant));
  assert.ok(confirme.xpRecompense > debutant.xpRecompense);

  for (const ligne of confirme.lignes) {
    const plafond = ligne.unite === 'reps' ? 200 : 600;
    assert.ok(ligne.objectif <= plafond, `${ligne.nom} : ${ligne.objectif} ${ligne.unite}, intenable`);
  }
});

test('deux dates différentes donnent des graines différentes', () => {
  assert.notEqual(grainePourJour('2026-03-10'), grainePourJour('2026-03-11'));
  assert.equal(grainePourJour('2026-03-10'), grainePourJour('2026-03-10'));
});

/* ---------------------------- La pénalité ----------------------------- */

test('rater une quête coûte, mais le prix est plafonné', () => {
  assert.deepEqual(calculerPenalite(0, 5000), { joursManques: 0, xpPerdue: 0, serieBrisee: false });

  const unJour = calculerPenalite(1, 5000);
  assert.ok(unJour.xpPerdue > 0);
  assert.ok(unJour.serieBrisee);

  const troisJours = calculerPenalite(3, 5000);
  assert.ok(troisJours.xpPerdue > unJour.xpPerdue);

  // Revenir après un mois ne doit pas coûter un mois de pénalités.
  const unMois = calculerPenalite(30, 5000);
  assert.equal(unMois.joursManques, PENALITES_MAX);
  assert.deepEqual(unMois, troisJours);
});

test('une pénalité ne fait jamais perdre un rang acquis', () => {
  const niveau = 12;
  const seuil = xpCumuleePourAtteindre(niveau);
  const xpTotal = seuil + 40; // tout juste au-dessus du seuil

  const penalite = calculerPenalite(3, xpTotal);
  const apres = appliquerPenalite(xpTotal, penalite, seuil);

  assert.ok(apres >= seuil, 'la pénalité a fait redescendre sous le niveau atteint');
  assert.ok(apres <= xpTotal);
});

test('la pénalité reste indolore quand on n\'a presque rien accumulé', () => {
  const penalite = calculerPenalite(3, 50);
  assert.ok(penalite.xpPerdue < 10, 'un débutant ne doit pas être puni sévèrement');
});

test('les jours manqués se comptent jusqu\'à hier, jamais aujourd\'hui', () => {
  // Ouvrir l'app le matin même ne doit rien coûter.
  assert.equal(joursManquesEntre('2026-03-10', '2026-03-10', []), 0);

  // Vu le 10, on revient le 13 sans rien avoir fait : 10, 11 et 12 manquent.
  assert.equal(joursManquesEntre('2026-03-10', '2026-03-13', []), 3);

  // Les jours honorés ne comptent pas.
  assert.equal(joursManquesEntre('2026-03-10', '2026-03-13', ['2026-03-11']), 2);
  assert.equal(
    joursManquesEntre('2026-03-10', '2026-03-13', ['2026-03-10', '2026-03-11', '2026-03-12']),
    0,
  );

  // Passage de mois et d'année.
  assert.equal(joursManquesEntre('2026-01-30', '2026-02-02', []), 3);
  assert.equal(joursManquesEntre('2025-12-30', '2026-01-02', []), 3);

  // Une longue absence ne fait pas boucler indéfiniment.
  assert.ok(joursManquesEntre('2020-01-01', '2026-03-13', []) <= 90);
});
