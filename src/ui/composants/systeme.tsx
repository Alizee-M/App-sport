import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton } from './base';

/* ----------------------------------------------------------------------
 * Les fenêtres du Système.
 *
 * Bordures nettes, coins peu arrondis, en-tête en capitales : l'idée est
 * qu'un panneau soit projeté devant les yeux plutôt qu'affiché dans une
 * app. Tout ce qui vient du Système passe par ces composants, ce qui les
 * distingue au premier coup d'œil du contenu ordinaire.
 * -------------------------------------------------------------------- */

export function FenetreSysteme({
  titre,
  children,
  couleur = couleurs.accent,
  discrete,
}: {
  titre?: string;
  children: React.ReactNode;
  couleur?: string;
  /** Sans lueur ni en-tête : pour les blocs secondaires. */
  discrete?: boolean;
}) {
  return (
    <View style={[styles.fenetre, { borderColor: couleur }, discrete && styles.fenetreDiscrete]}>
      {titre ? (
        <View style={[styles.entete, { borderBottomColor: couleur }]}>
          <View style={[styles.marqueur, { backgroundColor: couleur }]} />
          <Text style={[styles.enteteTexte, { color: couleur }]} numberOfLines={1}>
            {titre.toUpperCase()}
          </Text>
        </View>
      ) : null}
      <View style={styles.corps}>{children}</View>
    </View>
  );
}

/**
 * La notification du Système : le panneau modal qui s'impose à l'écran.
 *
 * Réservée aux évènements qui méritent d'interrompre — éveil, montée de
 * rang, pénalité, récompense débloquée. En abuser la banaliserait.
 */
export function NotificationSysteme({
  visible,
  titre,
  lignes,
  couleur = couleurs.accent,
  libelleBouton = 'Compris',
  onFermer,
}: {
  visible: boolean;
  titre: string;
  lignes: string[];
  couleur?: string;
  libelleBouton?: string;
  onFermer: () => void;
}) {
  const apparition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      apparition.setValue(0);
      return;
    }
    Animated.spring(apparition, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  }, [visible, apparition]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <View style={styles.voile}>
        <Animated.View
          style={[
            styles.notification,
            { borderColor: couleur, opacity: apparition, transform: [{ scale: apparition }] },
          ]}
        >
          <Text style={[styles.notificationEntete, { color: couleur }]}>⚠  NOTIFICATION</Text>
          <View style={[styles.trait, { backgroundColor: couleur }]} />

          <Text style={styles.notificationTitre}>{titre}</Text>
          {lignes.map((ligne, index) => (
            <Text key={index} style={styles.notificationLigne}>
              {ligne}
            </Text>
          ))}

          <View style={{ height: espace.xl }} />
          <Bouton titre={libelleBouton} onPress={onFermer} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/** L'écusson de rang, affiché en permanence sur l'écran de statut. */
export function Ecusson({ rang, couleur }: { rang: string; couleur: string }) {
  return (
    <View style={[styles.ecusson, { borderColor: couleur }]}>
      <Text style={[styles.ecussonLettre, { color: couleur }]}>{rang}</Text>
      <Text style={styles.ecussonLibelle}>RANG</Text>
    </View>
  );
}

/** Ligne « libellé …… valeur » en capitales, façon fiche de personnage. */
export function LigneSysteme({
  libelle,
  valeur,
  couleurValeur = couleurs.texte,
  action,
}: {
  libelle: string;
  valeur: string;
  couleurValeur?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.ligneLibelle}>{libelle}</Text>
      <View style={styles.ligneDroite}>
        <Text style={[styles.ligneValeur, { color: couleurValeur }]}>{valeur}</Text>
        {action}
      </View>
    </View>
  );
}

/** Petit bouton carré « + », pour investir un point de stat. */
export function BoutonPoint({ onPress, actif }: { onPress: () => void; actif: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Investir un point"
      accessibilityState={{ disabled: !actif }}
      disabled={!actif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boutonPoint,
        !actif && styles.boutonPointInactif,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.boutonPointTexte, !actif && { color: couleurs.texteFaible }]}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fenetre: {
    borderWidth: 1,
    borderRadius: rayon.s,
    backgroundColor: 'rgba(12,19,34,0.92)',
    // La lueur donne l'impression d'une projection lumineuse.
    shadowColor: couleurs.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  fenetreDiscrete: {
    borderColor: couleurs.bordure,
    shadowOpacity: 0,
    elevation: 0,
  },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    paddingHorizontal: espace.m,
    paddingVertical: espace.s,
    borderBottomWidth: 1,
  },
  marqueur: { width: 6, height: 6, transform: [{ rotate: '45deg' }] },
  enteteTexte: { ...texte.section, fontSize: 11, flex: 1 },
  corps: { padding: espace.l },

  voile: {
    flex: 1,
    backgroundColor: 'rgba(2,4,10,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espace.xl,
  },
  notification: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderRadius: rayon.s,
    backgroundColor: '#0a1120',
    padding: espace.xl,
    shadowColor: couleurs.accent,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  notificationEntete: { ...texte.section, textAlign: 'center', fontSize: 12 },
  trait: { height: 1, opacity: 0.5, marginVertical: espace.l },
  notificationTitre: {
    ...texte.sousTitre,
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: espace.m,
  },
  notificationLigne: {
    ...texte.corps,
    color: couleurs.texteDoux,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: espace.xs,
  },

  ecusson: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderRadius: rayon.s,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,19,34,0.9)',
  },
  ecussonLettre: { fontSize: 34, fontWeight: '800', lineHeight: 38 },
  ecussonLibelle: { ...texte.minuscule, color: couleurs.texteFaible, fontSize: 9, letterSpacing: 2 },

  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espace.m,
    paddingVertical: 7,
  },
  ligneLibelle: { ...texte.petit, color: couleurs.texteDoux, flexShrink: 1 },
  ligneDroite: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  ligneValeur: { ...texte.petit, fontWeight: '800' },

  boutonPoint: {
    width: 26,
    height: 26,
    borderRadius: rayon.s,
    borderWidth: 1,
    borderColor: couleurs.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76,201,240,0.12)',
  },
  boutonPointInactif: { borderColor: couleurs.bordure, backgroundColor: 'transparent' },
  boutonPointTexte: { fontSize: 16, fontWeight: '800', color: couleurs.accent, lineHeight: 18 },
});
