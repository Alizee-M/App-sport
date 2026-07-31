import test from 'node:test';
import assert from 'node:assert/strict';

import {
  niveauDepuisXp,
  xpRequisPourNiveau,
  xpCumuleePourAtteindre,
  statsGagnees,
  statsVides,
  rangStat,
  progressionRangStat,
  majEnchainement,
  serieAffichee,
  jourLocal,
  titrePourNiveau,
  prochainTitre,
  xpPotentielSeance,
} from '../src/moteur/progression';
import { genererSeance } from '../src/moteur/seance';
import { STATS } from '../src/moteur/types';
import type { OptionsTirage } from '../src/moteur/types';

const OPTS: OptionsTirage = {
  dureeMin: 20,
  intensite: 2,
  focus: 'complet',
  materielDispo: ['chaise', 'mur'],
  silencieux: false,
  niveau: 5,
  historiqueIds: [],
  seed: 8,
};

test('le niveau démarre à 1 et progresse avec l\'XP', () => {
  assert.equal(niveauDepuisXp(0).niveau, 1);
  assert.equal(niveauDepuisXp(xpRequisPourNiveau(1) - 1).niveau, 1);
  assert.equal(niveauDepuisXp(xpRequisPourNiveau(1)).niveau, 2);
});

test('niveauDepuisXp et xpCumuleePourAtteindre sont réciproques', () => {
  for (let niveau = 1; niveau <= 30; niveau++) {
    const seuil = xpCumuleePourAtteindre(niveau);
    assert.equal(niveauDepuisXp(seuil).niveau, niveau, `seuil du niveau ${niveau}`);
    assert.equal(niveauDepuisXp(seuil).xpDansNiveau, 0);
    if (niveau > 1) {
      assert.equal(niveauDepuisXp(seuil - 1).niveau, niveau - 1);
    }
  }
});

test('l\'avancement dans un niveau reste entre 0 et 1', () => {
  for (let xp = 0; xp < 5000; xp += 37) {
    const info = niveauDepuisXp(xp);
    assert.ok(info.progression >= 0 && info.progression < 1, `progression ${info.progression} pour ${xp} XP`);
    assert.ok(info.xpDansNiveau < info.xpRequisNiveau);
  }
});

test('chaque niveau demande plus d\'XP que le précédent', () => {
  for (let niveau = 1; niveau < 30; niveau++) {
    assert.ok(xpRequisPourNiveau(niveau + 1) > xpRequisPourNiveau(niveau));
  }
});

test('une séance rapporte des points dans plusieurs stats', () => {
  const seance = genererSeance(OPTS);
  const gains = statsGagnees(seance);
  const total = STATS.reduce((s, stat) => s + gains[stat], 0);
  assert.ok(total > 0, 'aucune stat gagnée');
  assert.ok(
    STATS.filter((stat) => gains[stat] > 0).length >= 2,
    `séance trop monotone : ${JSON.stringify(gains)}`,
  );
});

test('une séance abandonnée à mi-parcours rapporte moitié moins', () => {
  const seance = genererSeance(OPTS);
  const complet = statsGagnees(seance, 1);
  const moitie = statsGagnees(seance, 0.5);
  for (const stat of STATS) {
    assert.ok(moitie[stat] <= complet[stat], `${stat} devrait être plus faible`);
  }
  assert.ok(STATS.some((stat) => moitie[stat] > 0), 'une séance à moitié faite doit compter');
});

test('les rangs de stats montent de plus en plus lentement', () => {
  assert.equal(rangStat(0), 0);
  assert.ok(rangStat(50) > 0);
  const paliers = [1, 2, 3, 4, 5].map((rang) => 12 * rang * rang);
  for (const points of paliers) {
    assert.equal(rangStat(points), Math.round(Math.sqrt(points / 12)));
  }
  for (let i = 1; i < paliers.length; i++) {
    const ecartPrecedent = paliers[i] - paliers[i - 1];
    const ecartSuivant = (paliers[i + 1] ?? 12 * 36) - paliers[i];
    assert.ok(ecartSuivant >= ecartPrecedent);
  }
});

test('progressionRangStat reste dans les bornes', () => {
  for (let points = 0; points < 800; points += 7) {
    const { progression } = progressionRangStat(points);
    assert.ok(progression >= 0 && progression <= 1, `progression ${progression} pour ${points} points`);
  }
});

test('l\'XP promise augmente avec la durée et l\'intensité', () => {
  const court = xpPotentielSeance(600, 2, 'libre', 1);
  const long = xpPotentielSeance(1800, 2, 'libre', 1);
  assert.ok(long > court);

  const doux = xpPotentielSeance(1200, 1, 'libre', 1);
  const dur = xpPotentielSeance(1200, 3, 'libre', 1);
  assert.ok(dur > doux);

  const boss = xpPotentielSeance(1200, 3, 'boss', 1);
  assert.ok(boss > dur, 'un boss doit rapporter davantage');

  const avecCarte = xpPotentielSeance(1200, 2, 'libre', 1.3);
  assert.ok(avecCarte > xpPotentielSeance(1200, 2, 'libre', 1));
});

/* ---------------------------- Enchaînement --------------------------- */

test('une première séance démarre la série à 1', () => {
  const etat = majEnchainement({ serie: 0, dernierJour: null }, '2026-03-10');
  assert.deepEqual(etat, { serie: 1, dernierJour: '2026-03-10' });
});

test('deux séances le même jour ne comptent qu\'une fois', () => {
  const apresUne = majEnchainement({ serie: 3, dernierJour: '2026-03-10' }, '2026-03-10');
  assert.equal(apresUne.serie, 3);
});

test('un jour consécutif fait monter la série', () => {
  const etat = majEnchainement({ serie: 3, dernierJour: '2026-03-10' }, '2026-03-11');
  assert.equal(etat.serie, 4);
});

test('la série repart à 1 après un jour sauté', () => {
  const etat = majEnchainement({ serie: 9, dernierJour: '2026-03-10' }, '2026-03-13');
  assert.equal(etat.serie, 1);
});

test('la série survit au passage d\'un mois et d\'une année', () => {
  assert.equal(majEnchainement({ serie: 2, dernierJour: '2026-01-31' }, '2026-02-01').serie, 3);
  assert.equal(majEnchainement({ serie: 5, dernierJour: '2025-12-31' }, '2026-01-01').serie, 6);
});

test('la série affichée ne s\'éteint pas le jour même', () => {
  assert.equal(serieAffichee({ serie: 4, dernierJour: '2026-03-10' }, '2026-03-10'), 4);
  assert.equal(serieAffichee({ serie: 4, dernierJour: '2026-03-10' }, '2026-03-11'), 4);
  assert.equal(serieAffichee({ serie: 4, dernierJour: '2026-03-10' }, '2026-03-12'), 0);
  assert.equal(serieAffichee({ serie: 0, dernierJour: null }, '2026-03-12'), 0);
});

test('jourLocal suit le calendrier local et non UTC', () => {
  const date = new Date(2026, 2, 9, 23, 30);
  assert.equal(jourLocal(date), '2026-03-09');
});

/* ------------------------------- Titres ------------------------------ */

test('les titres accompagnent la montée en niveau', () => {
  assert.equal(typeof titrePourNiveau(1), 'string');
  assert.notEqual(titrePourNiveau(1), titrePourNiveau(20));
  assert.equal(prochainTitre(1)?.niveau, 2);
  assert.equal(prochainTitre(999), null);
});

test('statsVides ne rapporte rien', () => {
  const vides = statsVides();
  for (const stat of STATS) assert.equal(vides[stat], 0);
});
