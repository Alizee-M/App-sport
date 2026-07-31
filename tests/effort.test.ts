import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFIS,
  estRecord,
  partEffort,
  resultatCredible,
  xpPourDefi,
} from '../src/moteur/defis';
import { genererSeance } from '../src/moteur/seance';
import {
  zonesDe,
  ZONES_PAR_FAMILLE,
  exercicesDebloquesAuNiveau,
  exercicesDisponibles,
  NIVEAU_DERNIER_DEBLOCAGE,
} from '../src/moteur/exercices';
import type { Focus, OptionsTirage, ZoneCorps } from '../src/moteur/types';

/* ----------------------------------------------------------------------
 * Deux exigences de bon sens :
 *   - on ne gagne rien en ne faisant rien ;
 *   - on ne s'échauffe pas les épaules avant une séance de jambes.
 * -------------------------------------------------------------------- */

function options(surcharge: Partial<OptionsTirage> = {}): OptionsTirage {
  return {
    dureeMin: 25,
    intensite: 2,
    focus: 'complet',
    materielDispo: ['chaise', 'mur', 'tapis'],
    silencieux: false,
    niveau: 8,
    historiqueIds: [],
    seed: 99,
    ...surcharge,
  };
}

/* --------------------------- Défis non faits -------------------------- */

test('un défi validé sans rien faire ne rapporte aucune XP', () => {
  for (const defi of DEFIS) {
    assert.equal(xpPourDefi(defi, 0, false), 0, `${defi.nom} rapporte de l'XP pour un score nul`);
    assert.equal(partEffort(defi, 0), 0, `${defi.nom} : un score nul n'est pas un effort`);
    assert.ok(!resultatCredible(defi, 0), `${defi.nom} : un score nul ne devrait pas être crédible`);
  }
});

test('un chrono impossible est rejeté', () => {
  for (const defi of DEFIS.filter((d) => d.format === 'chrono')) {
    const minimum = defi.tempsMinimalSec!;

    // Appuyer sur « Terminé » au bout de trois secondes.
    assert.equal(xpPourDefi(defi, 3, false), 0, `${defi.nom} récompense un temps impossible`);
    assert.ok(!resultatCredible(defi, 3));
    assert.ok(!estRecord(defi, 3, null), `${defi.nom} : un temps impossible ne peut pas être un record`);
    assert.ok(!estRecord(defi, 3, 200), `${defi.nom} : un temps impossible ne peut pas battre un record`);

    // Juste sous le seuil : refusé. Au seuil : accepté.
    assert.equal(partEffort(defi, minimum - 1), 0);
    assert.equal(partEffort(defi, minimum), 1);
    assert.ok(xpPourDefi(defi, minimum, false) > 0);
  }
});

test('sur un AMRAP ou un maintien, l\'XP suit l\'effort fourni', () => {
  for (const defi of DEFIS.filter((d) => d.format !== 'chrono')) {
    const plein = defi.reference!;

    const petit = xpPourDefi(defi, 1, false);
    const moitie = xpPourDefi(defi, Math.round(plein / 2), false);
    const entier = xpPourDefi(defi, plein, false);

    assert.ok(petit < moitie, `${defi.nom} : une répétition devrait rapporter moins que la moitié`);
    assert.ok(moitie < entier, `${defi.nom} : la moitié devrait rapporter moins que l'effort plein`);

    // Au-delà de la référence, l'XP plafonne : le record reste la
    // récompense du dépassement, pas une XP qui s'envole.
    assert.equal(xpPourDefi(defi, plein * 3, false), entier);
  }
});

test('un score dérisoire reste un score : il compte, mais très peu', () => {
  const defi = DEFIS.find((d) => d.format === 'amrap')!;
  const xp = xpPourDefi(defi, 1, false);
  assert.ok(xp > 0, 'une répétition réellement faite doit compter');
  assert.ok(xp < xpPourDefi(defi, defi.reference!, false) / 4, 'mais rester marginale');
});

test('chaque défi déclare de quoi juger l\'effort', () => {
  for (const defi of DEFIS) {
    if (defi.format === 'chrono') {
      assert.ok(defi.tempsMinimalSec && defi.tempsMinimalSec > 0, `${defi.nom} : pas de temps minimal`);
    } else {
      assert.ok(defi.reference && defi.reference > 0, `${defi.nom} : pas d'effort de référence`);
    }
  }
});

/* ------------------- Échauffement lié à la séance --------------------- */

/** Zones réellement travaillées dans le corps de séance. */
function zonesDuCorps(seance: ReturnType<typeof genererSeance>): Set<ZoneCorps> {
  const zones = new Set<ZoneCorps>();
  for (const bloc of seance.blocs) {
    for (const prescrit of bloc.exercices) {
      for (const zone of zonesDe(prescrit.exercice)) zones.add(zone);
    }
  }
  return zones;
}

function recouvrement(liste: { exercice: { zones?: ZoneCorps[] } }[], zones: Set<ZoneCorps>): number {
  let touches = 0;
  for (const prescrit of liste) {
    const siennes = prescrit.exercice.zones ?? [];
    if (siennes.some((z) => zones.has(z))) touches += 1;
  }
  return liste.length === 0 ? 0 : touches / liste.length;
}

test('l\'échauffement prépare toujours au moins une zone qui va travailler', () => {
  const focus: Focus[] = ['complet', 'force', 'cardio', 'gainage', 'souplesse'];

  for (const f of focus) {
    for (let seed = 1; seed <= 20; seed++) {
      const seance = genererSeance(options({ focus: f, seed }));
      const zones = zonesDuCorps(seance);

      const prepare = seance.echauffement.some((p) =>
        (p.exercice.zones ?? []).some((z) => zones.has(z)),
      );
      assert.ok(prepare, `focus ${f}, graine ${seed} : échauffement sans rapport avec la séance`);

      const relache = seance.retourCalme.some((p) =>
        (p.exercice.zones ?? []).some((z) => zones.has(z)),
      );
      assert.ok(relache, `focus ${f}, graine ${seed} : étirements sans rapport avec la séance`);
    }
  }
});

test('l\'échauffement suit la séance plutôt que le hasard', () => {
  // On compare le ciblage réel à celui d'un tirage indifférent aux zones :
  // sans écart net, la pondération ne servirait à rien.
  let cible = 0;
  let mesures = 0;

  for (let seed = 1; seed <= 40; seed++) {
    const seance = genererSeance(options({ seed }));
    const zones = zonesDuCorps(seance);
    cible += recouvrement(seance.echauffement, zones);
    cible += recouvrement(seance.retourCalme, zones);
    mesures += 2;
  }

  const moyenne = cible / mesures;
  assert.ok(
    moyenne > 0.75,
    `seulement ${(moyenne * 100).toFixed(0)} % des exercices de mobilité ciblent la séance`,
  );
});

test('une séance de jambes échauffe les jambes ou les hanches', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const seance = genererSeance(options({ focus: 'cardio', seed }));
    const zonesBas: ZoneCorps[] = ['jambes', 'hanches'];

    // Le focus cardio remplit la séance de jambes : l'échauffement doit
    // suivre, c'est exactement le cas qui posait problème.
    const prepareLeBas = seance.echauffement.some((p) =>
      (p.exercice.zones ?? []).some((z) => zonesBas.includes(z)),
    );
    assert.ok(prepareLeBas, `graine ${seed} : bas du corps non échauffé avant une séance cardio`);
  }
});

test('chaque famille d\'effort sait quelles zones elle mobilise', () => {
  for (const [famille, zones] of Object.entries(ZONES_PAR_FAMILLE)) {
    if (famille === 'mobilite') continue;
    assert.ok(zones.length > 0, `la famille ${famille} ne déclare aucune zone`);
  }
});

/* ---------------- La progression tient sur la durée ------------------- */

test('chaque niveau jusqu\'au dernier palier débloque au moins un exercice', () => {
  for (let niveau = 2; niveau <= NIVEAU_DERNIER_DEBLOCAGE; niveau++) {
    const nouveaux = exercicesDebloquesAuNiveau(niveau);
    assert.ok(
      nouveaux.length > 0,
      `le niveau ${niveau} ne débloque aucun exercice : monter de niveau n'y change rien`,
    );
  }
});

test('le vivier continue de grandir bien après les premières semaines', () => {
  const config = { phase: 'bloc' as const, materielDispo: ['chaise', 'mur'] as const, silencieux: false };
  const taille = (niveau: number) =>
    exercicesDisponibles({ ...config, materielDispo: [...config.materielDispo], niveau }).length;

  // Le niveau 10 est atteint en une quinzaine de séances : si tout était
  // débloqué à ce stade, la promesse « les séances continuent de changer »
  // ne tiendrait que deux semaines.
  assert.ok(taille(15) > taille(10), 'plus rien de neuf entre les niveaux 10 et 15');
  assert.ok(taille(20) > taille(15), 'plus rien de neuf entre les niveaux 15 et 20');
  assert.ok(taille(25) > taille(20), 'plus rien de neuf entre les niveaux 20 et 25');

  // Et la croissance doit être substantielle, pas symbolique.
  assert.ok(
    taille(25) >= taille(1) * 3,
    `le vivier ne triple même pas : ${taille(1)} → ${taille(25)}`,
  );
});

test('les exercices tardifs sont réellement plus exigeants', () => {
  for (let niveau = 11; niveau <= NIVEAU_DERNIER_DEBLOCAGE; niveau++) {
    for (const exercice of exercicesDebloquesAuNiveau(niveau)) {
      assert.ok(
        exercice.difficulte >= 4,
        `${exercice.nom}, débloqué au niveau ${niveau}, n'a qu'une difficulté de ${exercice.difficulte}`,
      );
    }
  }
});
