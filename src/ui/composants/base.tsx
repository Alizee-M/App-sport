import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { couleurs, espace, rayon, texte } from '../theme';

/* Briques d'interface réutilisées partout : boutons, panneaux, jauges. */

type VarianteBouton = 'principal' | 'secondaire' | 'fantome' | 'danger';

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  icone,
  desactive,
  chargement,
  pleineLargeur = true,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: VarianteBouton;
  icone?: string;
  desactive?: boolean;
  chargement?: boolean;
  pleineLargeur?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fond =
    variante === 'principal'
      ? couleurs.accent
      : variante === 'danger'
        ? couleurs.danger
        : variante === 'secondaire'
          ? couleurs.surfaceHaute
          : 'transparent';

  const couleurTexte =
    variante === 'principal' || variante === 'danger' ? '#1a1005' : couleurs.texte;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desactive }}
      disabled={desactive || chargement}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: fond },
        variante === 'fantome' && styles.boutonFantome,
        pleineLargeur && { alignSelf: 'stretch' },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
        desactive && { opacity: 0.4 },
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={couleurTexte} />
      ) : (
        <Text style={[styles.boutonTexte, { color: couleurTexte }]} numberOfLines={1}>
          {icone ? `${icone}  ` : ''}
          {titre}
        </Text>
      )}
    </Pressable>
  );
}

export function Panneau({
  children,
  style,
  couleurBordure,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  couleurBordure?: string;
}) {
  return (
    <View
      style={[styles.panneau, couleurBordure ? { borderColor: couleurBordure } : null, style]}
    >
      {children}
    </View>
  );
}

export function TitreSection({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.ligneSection}>
      <Text style={styles.titreSection}>{children.toUpperCase()}</Text>
      {action}
    </View>
  );
}

export function Jauge({
  progression,
  couleur = couleurs.accent,
  hauteur = 10,
}: {
  progression: number;
  couleur?: string;
  hauteur?: number;
}) {
  const part = Math.max(0, Math.min(1, progression));
  return (
    <View style={[styles.jauge, { height: hauteur, borderRadius: hauteur / 2 }]}>
      <View
        style={{
          width: `${part * 100}%`,
          height: '100%',
          backgroundColor: couleur,
          borderRadius: hauteur / 2,
        }}
      />
    </View>
  );
}

export function Puce({
  children,
  couleur = couleurs.texteDoux,
  fond = couleurs.surfaceHaute,
}: {
  children: React.ReactNode;
  couleur?: string;
  fond?: string;
}) {
  return (
    <View style={[styles.puce, { backgroundColor: fond }]}>
      <Text style={[styles.puceTexte, { color: couleur }]}>{children}</Text>
    </View>
  );
}

/** Ligne d'information « libellé → valeur », très utilisée dans les bilans. */
export function LigneInfo({
  libelle,
  valeur,
  couleurValeur = couleurs.texte,
}: {
  libelle: string;
  valeur: string;
  couleurValeur?: string;
}) {
  return (
    <View style={styles.ligneInfo}>
      <Text style={styles.ligneInfoLibelle}>{libelle}</Text>
      <Text style={[styles.ligneInfoValeur, { color: couleurValeur }]}>{valeur}</Text>
    </View>
  );
}

export function EtatVide({ emoji, titre, texte: description }: { emoji: string; titre: string; texte: string }) {
  return (
    <View style={styles.etatVide}>
      <Text style={styles.etatVideEmoji}>{emoji}</Text>
      <Text style={styles.etatVideTitre}>{titre}</Text>
      <Text style={styles.etatVideTexte}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bouton: {
    paddingVertical: 15,
    paddingHorizontal: espace.xl,
    borderRadius: rayon.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonFantome: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  boutonTexte: {
    fontSize: 16,
    fontWeight: '800',
  },
  panneau: {
    backgroundColor: couleurs.surface,
    borderRadius: rayon.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.l,
  },
  ligneSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espace.m,
    marginTop: espace.l,
  },
  titreSection: {
    ...texte.section,
    color: couleurs.texteFaible,
  },
  jauge: {
    backgroundColor: couleurs.surfaceHaute,
    overflow: 'hidden',
    width: '100%',
  },
  puce: {
    paddingHorizontal: espace.m,
    paddingVertical: 5,
    borderRadius: rayon.rond,
  },
  puceTexte: {
    ...texte.minuscule,
  },
  ligneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espace.s,
  },
  ligneInfoLibelle: {
    ...texte.corps,
    color: couleurs.texteDoux,
    flexShrink: 1,
  },
  ligneInfoValeur: {
    ...texte.corps,
    fontWeight: '800',
  },
  etatVide: {
    alignItems: 'center',
    paddingVertical: espace.xxl,
    paddingHorizontal: espace.l,
  },
  etatVideEmoji: {
    fontSize: 44,
    marginBottom: espace.m,
  },
  etatVideTitre: {
    ...texte.sousTitre,
    color: couleurs.texte,
    marginBottom: espace.s,
    textAlign: 'center',
  },
  etatVideTexte: {
    ...texte.petit,
    color: couleurs.texteDoux,
    textAlign: 'center',
    lineHeight: 20,
  },
});
