/* ----------------------------------------------------------------------
 * Hasard reproductible.
 *
 * Tout le tirage d'une séance découle d'une seule graine : deux appareils
 * (ou deux relances) avec la même graine produisent exactement la même
 * séance. C'est ce qui permet de re-tirer une carte précise sans que le
 * reste de la séance bouge, et de rejouer une séance passée à l'identique.
 * -------------------------------------------------------------------- */

/** Générateur mulberry32 : petit, rapide, largement suffisant ici. */
export function creerAlea(graine: number): () => number {
  let a = graine >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier dans [min, max] inclus. */
export function entierEntre(alea: () => number, min: number, max: number): number {
  return min + Math.floor(alea() * (max - min + 1));
}

/** Élément au hasard, uniformément. */
export function choisirUn<T>(alea: () => number, liste: readonly T[]): T {
  return liste[Math.floor(alea() * liste.length)];
}

/**
 * Tirage pondéré sans remise.
 *
 * `poids` peut renvoyer 0 pour écarter un élément. Si tous les poids
 * restants sont nuls, on retombe sur un tirage uniforme plutôt que de
 * renvoyer une liste incomplète : mieux vaut une séance un peu répétitive
 * qu'une séance trouée.
 */
export function tirerPondere<T>(
  alea: () => number,
  candidats: readonly T[],
  nombre: number,
  poids: (element: T, dejaTires: T[]) => number,
): T[] {
  const restants = [...candidats];
  const tires: T[] = [];

  while (tires.length < nombre && restants.length > 0) {
    const scores = restants.map((c) => Math.max(0, poids(c, tires)));
    let total = scores.reduce((somme, s) => somme + s, 0);

    let index: number;
    if (total <= 0) {
      index = Math.floor(alea() * restants.length);
    } else {
      let seuil = alea() * total;
      index = scores.length - 1;
      for (let i = 0; i < scores.length; i++) {
        seuil -= scores[i];
        if (seuil <= 0) {
          index = i;
          break;
        }
      }
    }

    tires.push(restants[index]);
    restants.splice(index, 1);
  }

  return tires;
}

/** Mélange de Fisher-Yates, sur une copie. */
export function melanger<T>(alea: () => number, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Graine imprévisible, pour un tirage « surprise-moi ». */
export function graineAleatoire(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
