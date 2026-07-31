import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { couleurs, espace, rayon, texte } from '../theme';
import { Jauge, Panneau, Puce } from './base';
import type { ExercicePrescrit, Modificateur, Stat } from '../../moteur/types';
import { EMOJI_STAT, LIBELLE_STAT } from '../../moteur/types';
import { progressionRangStat } from '../../moteur/progression';
import { LIBELLE_RARETE } from '../../moteur/modificateurs';

/* Éléments propres au jeu : coach, cartes d'exercice, cartes de règle. */

export function BulleCoach({ texte: propos, emoji = '🗿' }: { texte: string; emoji?: string }) {
  return (
    <View style={styles.bulle}>
      <Text style={styles.bulleEmoji}>{emoji}</Text>
      <Text style={styles.bulleTexte}>{propos}</Text>
    </View>
  );
}

/** Choix parmi quelques options, façon segments. */
export function Segments<T extends string | number>({
  valeurs,
  valeur,
  onChange,
  libelle,
}: {
  valeurs: { valeur: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: (v: T) => string;
}) {
  return (
    <View style={styles.segments}>
      {valeurs.map((option) => {
        const actif = option.valeur === valeur;
        return (
          <Pressable
            key={String(option.valeur)}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(option.valeur);
            }}
            style={[styles.segment, actif && styles.segmentActif]}
          >
            <Text style={[styles.segmentTexte, actif && styles.segmentTexteActif]}>
              {option.libelle || libelle(option.valeur)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Case à cocher pleine largeur, avec explication sous le libellé. */
export function Bascule({
  titre,
  description,
  actif,
  onChange,
}: {
  titre: string;
  description?: string;
  actif: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: actif }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!actif);
      }}
      style={styles.bascule}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.basculeTitre}>{titre}</Text>
        {description ? <Text style={styles.basculeDescription}>{description}</Text> : null}
      </View>
      <View style={[styles.basculePiste, actif && styles.basculePisteActive]}>
        <View style={[styles.basculePastille, actif && styles.basculePastilleActive]} />
      </View>
    </Pressable>
  );
}

/**
 * Une carte d'exercice, telle qu'elle apparaît dans l'aperçu du tirage.
 * Le bouton de re-tirage est ce qui évite d'abandonner une séance entière
 * à cause d'un seul exercice qui ne passe pas.
 */
export function CarteExercice({
  prescrit,
  onRetirer,
  index,
  marque,
}: {
  prescrit: ExercicePrescrit;
  onRetirer?: () => void;
  index?: number;
  /** Mention affichée sous le nom : « ⭐ voie de compétence », par exemple. */
  marque?: string;
}) {
  const { exercice } = prescrit;
  const dose =
    exercice.mesure === 'reps' ? `${prescrit.reps} répétitions` : `${prescrit.secondes} secondes`;

  return (
    <View style={[styles.carteExercice, marque ? styles.carteMarquee : null]}>
      <Text style={styles.carteEmoji}>{exercice.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.carteNom} numberOfLines={2}>
          {index !== undefined ? `${index}. ` : ''}
          {exercice.nom}
        </Text>
        <Text style={styles.carteDose}>{dose}</Text>
        {marque ? <Text style={styles.carteMarque}>{marque}</Text> : null}
      </View>
      {onRetirer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remplacer ${exercice.nom}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onRetirer();
          }}
          style={styles.boutonRetirer}
        >
          <Text style={styles.boutonRetirerTexte}>🎲</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const COULEUR_RARETE: Record<Modificateur['rarete'], string> = {
  commune: couleurs.texteDoux,
  rare: couleurs.repos,
  epique: couleurs.or,
};

export function CarteModificateur({
  modificateur,
  onRetirer,
}: {
  modificateur: Modificateur;
  onRetirer?: () => void;
}) {
  const couleur = COULEUR_RARETE[modificateur.rarete];
  return (
    <Panneau style={styles.carteRegle} couleurBordure={couleur}>
      <View style={styles.carteRegleEntete}>
        <Text style={styles.carteRegleEmoji}>{modificateur.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.carteRegleNom}>{modificateur.nom}</Text>
          <Text style={[styles.carteRegleRarete, { color: couleur }]}>
            {LIBELLE_RARETE[modificateur.rarete]} · +
            {Math.round((modificateur.bonusXp - 1) * 100)} % d'XP
          </Text>
        </View>
        {/* Dire qui applique la règle évite de chercher en vain un
            changement à l'écran — ou, à l'inverse, de croire que l'app
            fera le travail à ta place. */}
        <View style={styles.marqueurApplication}>
          <Text
            style={[
              styles.marqueurApplicationTexte,
              { color: modificateur.applique ? couleurs.succes : couleurs.texteFaible },
            ]}
          >
            {modificateur.applique ? '⚙️ auto' : '🤝 sur\nl\'honneur'}
          </Text>
        </View>
        {onRetirer ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remplacer la règle ${modificateur.nom}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onRetirer();
            }}
            style={styles.boutonRetirer}
          >
            <Text style={styles.boutonRetirerTexte}>🎲</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.carteRegleDescription}>{modificateur.description}</Text>
    </Panneau>
  );
}

/** Les quatre jauges du héros, avec leur rang. */
export function BarresStats({ stats }: { stats: Record<Stat, number> }) {
  const ordre: Stat[] = ['force', 'cardio', 'souplesse', 'gainage'];
  return (
    <View style={{ gap: espace.m }}>
      {ordre.map((stat) => {
        const { rang, progression } = progressionRangStat(stats[stat]);
        return (
          <View key={stat}>
            <View style={styles.ligneStat}>
              <Text style={styles.libelleStat}>
                {EMOJI_STAT[stat]}  {LIBELLE_STAT[stat]}
              </Text>
              <Text style={styles.rangStat}>rang {rang}</Text>
            </View>
            <Jauge progression={progression} couleur={COULEUR_STAT[stat]} hauteur={8} />
          </View>
        );
      })}
    </View>
  );
}

const COULEUR_STAT: Record<Stat, string> = {
  force: couleurs.accent,
  cardio: couleurs.danger,
  souplesse: couleurs.violet,
  gainage: couleurs.succes,
};

/** Rangée horizontale défilante de puces (matériel, filtres…). */
export function RangeePuces({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: espace.s, paddingRight: espace.l }}
    >
      {children}
    </ScrollView>
  );
}

export function PuceSelectionnable({
  titre,
  actif,
  onPress,
}: {
  titre: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: actif }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.puceSelect, actif && styles.puceSelectActive]}
    >
      <Text style={[styles.puceSelectTexte, actif && styles.puceSelectTexteActif]}>{titre}</Text>
    </Pressable>
  );
}

export { Puce };

const styles = StyleSheet.create({
  bulle: {
    flexDirection: 'row',
    gap: espace.m,
    backgroundColor: couleurs.surfaceHaute,
    borderRadius: rayon.l,
    borderLeftWidth: 3,
    borderLeftColor: couleurs.accent,
    padding: espace.l,
    alignItems: 'center',
  },
  bulleEmoji: { fontSize: 26 },
  bulleTexte: {
    ...texte.corps,
    color: couleurs.texte,
    flex: 1,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  segments: {
    flexDirection: 'row',
    backgroundColor: couleurs.surfaceHaute,
    borderRadius: rayon.m,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: rayon.s,
    alignItems: 'center',
  },
  segmentActif: { backgroundColor: couleurs.accent },
  segmentTexte: {
    ...texte.petit,
    color: couleurs.texteDoux,
    fontWeight: '700',
  },
  segmentTexteActif: { color: '#1a1005' },

  bascule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.l,
    paddingVertical: espace.m,
  },
  basculeTitre: { ...texte.corps, color: couleurs.texte, fontWeight: '700' },
  basculeDescription: { ...texte.petit, color: couleurs.texteDoux, marginTop: 2 },
  basculePiste: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: couleurs.bordure,
    padding: 3,
    justifyContent: 'center',
  },
  basculePisteActive: { backgroundColor: couleurs.succes },
  basculePastille: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.texteDoux,
  },
  basculePastilleActive: { backgroundColor: '#0c0e16', alignSelf: 'flex-end' },

  carteExercice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.surfaceHaute,
    borderRadius: rayon.m,
    padding: espace.m,
  },
  carteEmoji: { fontSize: 26 },
  carteNom: { ...texte.corps, color: couleurs.texte, fontWeight: '700' },
  carteDose: { ...texte.petit, color: couleurs.accent, marginTop: 2, fontWeight: '700' },
  carteMarquee: { borderWidth: 1, borderColor: couleurs.or },
  carteMarque: { ...texte.minuscule, color: couleurs.or, marginTop: 3, fontWeight: '700' },
  boutonRetirer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surface,
  },
  boutonRetirerTexte: { fontSize: 18 },

  carteRegle: { gap: espace.m },
  carteRegleEntete: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  carteRegleEmoji: { fontSize: 28 },
  carteRegleNom: { ...texte.corps, color: couleurs.texte, fontWeight: '800' },
  carteRegleRarete: { ...texte.minuscule, marginTop: 2 },
  carteRegleDescription: { ...texte.petit, color: couleurs.texteDoux, lineHeight: 19 },
  marqueurApplication: { alignItems: 'flex-end', maxWidth: 74 },
  marqueurApplicationTexte: {
    ...texte.minuscule,
    fontSize: 10,
    textAlign: 'right',
    lineHeight: 13,
  },

  ligneStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  libelleStat: { ...texte.petit, color: couleurs.texte, fontWeight: '700' },
  rangStat: { ...texte.minuscule, color: couleurs.texteFaible },

  puceSelect: {
    paddingHorizontal: espace.l,
    paddingVertical: 10,
    borderRadius: rayon.rond,
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  puceSelectActive: {
    backgroundColor: couleurs.violet,
    borderColor: couleurs.violet,
  },
  puceSelectTexte: { ...texte.petit, color: couleurs.texteDoux, fontWeight: '700' },
  puceSelectTexteActif: { color: '#fff' },
});
