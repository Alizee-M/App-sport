#!/usr/bin/env node
/* ----------------------------------------------------------------------
 * Génère les sons de la séance, sans dépendance ni fichier externe.
 *
 * On écrit directement des WAV (PCM 16 bits, mono) : quelques bips de
 * synthèse suffisent, et cela évite d'embarquer des fichiers audio dont
 * la licence serait à vérifier.
 *
 *   node scripts/generer-sons.mjs
 * -------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(RACINE, 'assets', 'sons');

const ECHANTILLONNAGE = 44100;

/* ------------------------------ Synthèse ------------------------------ */

/**
 * Une note. L'enveloppe (attaque courte puis extinction douce) est ce qui
 * évite le « clic » désagréable qu'on obtient en coupant net une sinusoïde.
 */
function note(frequence, dureeSec, volume = 0.5) {
  const total = Math.round(dureeSec * ECHANTILLONNAGE);
  const echantillons = new Float32Array(total);
  const attaque = Math.round(0.006 * ECHANTILLONNAGE);

  for (let i = 0; i < total; i++) {
    const t = i / ECHANTILLONNAGE;

    // Fondamentale + une octave discrète : plus present sur un petit
    // haut-parleur de téléphone qu'une sinusoïde pure.
    const onde =
      Math.sin(2 * Math.PI * frequence * t) +
      0.25 * Math.sin(4 * Math.PI * frequence * t);

    const montee = Math.min(1, i / attaque);
    const extinction = Math.exp(-3.5 * (i / total));

    echantillons[i] = onde * montee * extinction * volume * 0.5;
  }
  return echantillons;
}

function silence(dureeSec) {
  return new Float32Array(Math.round(dureeSec * ECHANTILLONNAGE));
}

function enchainer(...morceaux) {
  const total = morceaux.reduce((somme, m) => somme + m.length, 0);
  const resultat = new Float32Array(total);
  let position = 0;
  for (const morceau of morceaux) {
    resultat.set(morceau, position);
    position += morceau.length;
  }
  return resultat;
}

/* ----------------------------- Encodage WAV --------------------------- */

function encoderWav(echantillons) {
  const donnees = Buffer.alloc(echantillons.length * 2);
  for (let i = 0; i < echantillons.length; i++) {
    const borne = Math.max(-1, Math.min(1, echantillons[i]));
    donnees.writeInt16LE(Math.round(borne * 32767), i * 2);
  }

  const entete = Buffer.alloc(44);
  entete.write('RIFF', 0);
  entete.writeUInt32LE(36 + donnees.length, 4);
  entete.write('WAVE', 8);
  entete.write('fmt ', 12);
  entete.writeUInt32LE(16, 16); // taille du bloc fmt
  entete.writeUInt16LE(1, 20); // PCM
  entete.writeUInt16LE(1, 22); // mono
  entete.writeUInt32LE(ECHANTILLONNAGE, 24);
  entete.writeUInt32LE(ECHANTILLONNAGE * 2, 28); // octets par seconde
  entete.writeUInt16LE(2, 32); // alignement
  entete.writeUInt16LE(16, 34); // bits par échantillon
  entete.write('data', 36);
  entete.writeUInt32LE(donnees.length, 40);

  return Buffer.concat([entete, donnees]);
}

/* ---------------------------- Les quatre sons ------------------------- */

// Notes de référence, en hertz.
const DO = 523.25;
const MI = 659.25;
const SOL = 783.99;
const LA = 880;
const MI_AIGU = 1318.51;

const SONS = {
  // Décompte des dernières secondes : bref et sec, il doit s'entendre
  // sans couvrir la musique.
  bip: () => note(LA, 0.1, 0.45),

  // Un effort commence : deux notes qui montent, franches.
  depart: () => enchainer(note(LA, 0.11, 0.6), note(MI_AIGU, 0.22, 0.6)),

  // Un repos commence : deux notes qui descendent, plus douces.
  repos: () => enchainer(note(SOL, 0.11, 0.4), note(DO, 0.24, 0.4)),

  // Séance terminée : petit accord ascendant.
  fin: () =>
    enchainer(
      note(DO, 0.14, 0.55),
      note(MI, 0.14, 0.55),
      note(SOL, 0.16, 0.55),
      silence(0.02),
      note(DO * 2, 0.42, 0.6),
    ),
};

fs.mkdirSync(DOSSIER, { recursive: true });
for (const [nom, fabriquer] of Object.entries(SONS)) {
  const buffer = encoderWav(fabriquer());
  fs.writeFileSync(path.join(DOSSIER, `${nom}.wav`), buffer);
  console.log(`✓ ${nom}.wav (${(buffer.length / 1024).toFixed(1)} Ko)`);
}
