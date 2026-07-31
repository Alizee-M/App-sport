/* ----------------------------------------------------------------------
 * Identité visuelle : sombre, chaude, un peu jeu de rôle.
 *
 * L'app s'utilise souvent tôt le matin ou tard le soir, téléphone posé au
 * sol à un mètre des yeux : d'où le fond sombre et des tailles de texte
 * volontairement grandes pendant l'effort.
 * -------------------------------------------------------------------- */

export const couleurs = {
  fond: '#0c0e16',
  surface: '#161a27',
  surfaceHaute: '#1f2434',
  bordure: '#2c3346',

  texte: '#eef1f8',
  texteDoux: '#98a1bb',
  texteFaible: '#6b7490',

  accent: '#ff6b35',
  accentSombre: '#c4471b',
  violet: '#7c5cff',
  violetSombre: '#5b3fd9',

  succes: '#3ddc97',
  or: '#ffc857',
  danger: '#f2545b',

  effort: '#ff6b35',
  repos: '#4cc9f0',
  echauffement: '#ffc857',
  retourCalme: '#7c5cff',
} as const;

export const espace = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
} as const;

export const rayon = {
  s: 8,
  m: 12,
  l: 18,
  xl: 26,
  rond: 999,
} as const;

export const texte = {
  titre: { fontSize: 26, fontWeight: '800' },
  sousTitre: { fontSize: 19, fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  corps: { fontSize: 15, fontWeight: '500' },
  petit: { fontSize: 13, fontWeight: '500' },
  minuscule: { fontSize: 11, fontWeight: '600' },
  geant: { fontSize: 68, fontWeight: '800' },
} as const;

/** Couleur associée à un moment de la séance, reprise par le chrono. */
export const couleurParGenre: Record<string, string> = {
  echauffement: couleurs.echauffement,
  effort: couleurs.effort,
  repos: couleurs.repos,
  repos_bloc: couleurs.repos,
  retour_calme: couleurs.retourCalme,
};

export const libelleParGenre: Record<string, string> = {
  echauffement: 'Échauffement',
  effort: 'Effort',
  repos: 'Repos',
  repos_bloc: 'Pause',
  retour_calme: 'Retour au calme',
};
