#!/usr/bin/env node
/* ----------------------------------------------------------------------
 * Génère les icônes de l'application, sans aucune dépendance.
 *
 * Le projet n'embarque pas de bibliothèque graphique : on écrit
 * directement des PNG (en-tête, pixels RGBA bruts, CRC), ce qui évite
 * d'ajouter une dépendance de build pour trois images.
 *
 *   node scripts/generer-icones.mjs
 * -------------------------------------------------------------------- */

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(RACINE, 'assets');

const FOND = [12, 14, 22, 255]; // #0c0e16
const ACCENT = [255, 107, 53, 255]; // #ff6b35
const OR = [255, 200, 87, 255]; // #ffc857
const BLANC = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

/* ----------------------------- Encodage PNG --------------------------- */

const TABLE_CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const octet of buffer) c = TABLE_CRC[(c ^ octet) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloc(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
  const controle = Buffer.alloc(4);
  controle.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, controle]);
}

function encoderPng(largeur, hauteur, pixels) {
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete[8] = 8; // 8 bits par canal
  entete[9] = 6; // RGBA
  entete[10] = 0;
  entete[11] = 0;
  entete[12] = 0;

  // Chaque ligne est précédée de son octet de filtre (0 = aucun).
  const brut = Buffer.alloc(hauteur * (1 + largeur * 4));
  for (let y = 0; y < hauteur; y++) {
    const depart = y * (1 + largeur * 4);
    brut[depart] = 0;
    pixels.copy(brut, depart + 1, y * largeur * 4, (y + 1) * largeur * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', entete),
    bloc('IDAT', zlib.deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------- Dessin ------------------------------- */

function creerToile(taille, fond) {
  const pixels = Buffer.alloc(taille * taille * 4);
  for (let i = 0; i < taille * taille; i++) {
    pixels[i * 4] = fond[0];
    pixels[i * 4 + 1] = fond[1];
    pixels[i * 4 + 2] = fond[2];
    pixels[i * 4 + 3] = fond[3];
  }
  return pixels;
}

/** Mélange une couleur sur un pixel, en respectant son opacité. */
function poser(pixels, taille, x, y, couleur, opacite = 1) {
  if (x < 0 || y < 0 || x >= taille || y >= taille) return;
  const i = (y * taille + x) * 4;
  const a = (couleur[3] / 255) * opacite;
  if (a <= 0) return;
  pixels[i] = Math.round(pixels[i] * (1 - a) + couleur[0] * a);
  pixels[i + 1] = Math.round(pixels[i + 1] * (1 - a) + couleur[1] * a);
  pixels[i + 2] = Math.round(pixels[i + 2] * (1 - a) + couleur[2] * a);
  pixels[i + 3] = Math.max(pixels[i + 3], Math.round(255 * a));
}

/**
 * Rectangle à coins arrondis, avec un léger lissage sur le bord : sans
 * anticrénelage, une icône de 1024 px paraît sale une fois réduite.
 */
function rectangleArrondi(pixels, taille, x0, y0, largeur, hauteur, rayon, couleur) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + hauteur); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + largeur); x++) {
      const dx = Math.max(x0 + rayon - x, 0, x - (x0 + largeur - rayon - 1));
      const dy = Math.max(y0 + rayon - y, 0, y - (y0 + hauteur - rayon - 1));
      const distance = Math.hypot(dx, dy);
      if (distance <= rayon - 1) poser(pixels, taille, x, y, couleur);
      else if (distance < rayon) poser(pixels, taille, x, y, couleur, rayon - distance);
    }
  }
}

/**
 * L'haltère : deux disques encadrant une barre.
 * Lisible même en 48 px dans la barre de notifications.
 */
function dessinerHaltere(pixels, taille, couleur, couleurDisques) {
  const u = taille / 100; // unité relative, pour rester indépendant de la taille

  const centreY = 50 * u;
  const hauteurBarre = 11 * u;
  rectangleArrondi(
    pixels,
    taille,
    28 * u,
    centreY - hauteurBarre / 2,
    44 * u,
    hauteurBarre,
    hauteurBarre / 2,
    couleur,
  );

  // Disques intérieurs (hauts) puis extérieurs (plus courts).
  for (const cote of [-1, 1]) {
    const centreX = 50 * u + cote * 27 * u;

    rectangleArrondi(
      pixels,
      taille,
      centreX - 6 * u,
      centreY - 24 * u,
      12 * u,
      48 * u,
      5 * u,
      couleurDisques,
    );

    const decalage = cote * 12 * u;
    rectangleArrondi(
      pixels,
      taille,
      centreX + decalage - 5 * u,
      centreY - 16 * u,
      10 * u,
      32 * u,
      4 * u,
      couleurDisques,
    );
  }
}

/* ------------------------------ Fabrication --------------------------- */

function ecrire(nom, buffer) {
  const chemin = path.join(DOSSIER, nom);
  fs.writeFileSync(chemin, buffer);
  console.log(`✓ ${nom} (${(buffer.length / 1024).toFixed(1)} Ko)`);
}

function iconePrincipale(taille = 1024) {
  const pixels = creerToile(taille, FOND);
  dessinerHaltere(pixels, taille, ACCENT, OR);
  return encoderPng(taille, taille, pixels);
}

/**
 * Premier plan de l'icône adaptative Android : fond transparent, motif
 * réduit pour tenir dans la zone sûre (le système en rogne les bords).
 */
function premierPlanAdaptatif(taille = 1024) {
  const pixels = creerToile(taille, TRANSPARENT);
  const reduit = Math.round(taille * 0.62);
  const motif = creerToile(reduit, TRANSPARENT);
  dessinerHaltere(motif, reduit, ACCENT, OR);

  const decalage = Math.round((taille - reduit) / 2);
  for (let y = 0; y < reduit; y++) {
    for (let x = 0; x < reduit; x++) {
      const source = (y * reduit + x) * 4;
      if (motif[source + 3] === 0) continue;
      const cible = ((y + decalage) * taille + (x + decalage)) * 4;
      motif.copy(pixels, cible, source, source + 4);
    }
  }
  return encoderPng(taille, taille, pixels);
}

function fondAdaptatif(taille = 1024) {
  return encoderPng(taille, taille, creerToile(taille, FOND));
}

function monochrome(taille = 1024) {
  const pixels = creerToile(taille, TRANSPARENT);
  const reduit = Math.round(taille * 0.62);
  const motif = creerToile(reduit, TRANSPARENT);
  dessinerHaltere(motif, reduit, BLANC, BLANC);

  const decalage = Math.round((taille - reduit) / 2);
  for (let y = 0; y < reduit; y++) {
    for (let x = 0; x < reduit; x++) {
      const source = (y * reduit + x) * 4;
      if (motif[source + 3] === 0) continue;
      const cible = ((y + decalage) * taille + (x + decalage)) * 4;
      motif.copy(pixels, cible, source, source + 4);
    }
  }
  return encoderPng(taille, taille, pixels);
}

fs.mkdirSync(DOSSIER, { recursive: true });
ecrire('icon.png', iconePrincipale());
ecrire('android-icon-foreground.png', premierPlanAdaptatif());
ecrire('android-icon-background.png', fondAdaptatif());
ecrire('android-icon-monochrome.png', monochrome());
ecrire('splash-icon.png', premierPlanAdaptatif(512));
ecrire('favicon.png', iconePrincipale(128));
