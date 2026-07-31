import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { couleurs, espace, texte } from '../theme';
import { Bouton } from './base';
import { FenetreSysteme } from './systeme';

/* ----------------------------------------------------------------------
 * L'éveil : le tout premier écran, joué une seule fois.
 *
 * Il pose le cadre du jeu en quelques lignes — ce qu'est le Système, ce
 * qu'il attend, ce qu'il ne fera pas. Mieux vaut trente secondes de mise
 * en scène qu'un utilisateur qui découvre les règles au fil de l'eau et
 * ne comprend ni les rangs ni les quêtes.
 * -------------------------------------------------------------------- */

const LIGNES = [
  'Un Système vient de te sélectionner.',
  'À partir de maintenant, tes séances comptent : elles rapportent de l\'expérience, font monter ton rang, et débloquent des récompenses que tu choisis toi-même.',
  'Chaque jour, une quête t\'attend. L\'honorer renforce ton enchaînement. L\'ignorer coûte un peu — jamais assez pour te décourager de revenir.',
  'Aucune séance n\'est écrite à l\'avance : tout est tiré au sort à partir du temps et du matériel dont tu disposes.',
];

export function Eveil({ onTermine }: { onTermine: () => void }) {
  const [etape, setEtape] = useState(0);
  const apparition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    apparition.setValue(0);
    Animated.timing(apparition, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [etape, apparition]);

  const derniere = etape === LIGNES.length - 1;

  return (
    <View style={styles.ecran}>
      <Animated.View
        style={{
          opacity: apparition,
          transform: [
            { translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          ],
        }}
      >
        <Text style={styles.marque}>⚔️</Text>
        <Text style={styles.surtitre}>ÉVEIL</Text>

        <View style={{ height: espace.xl }} />
        <FenetreSysteme titre="Notification du Système">
          <Text style={styles.ligne}>{LIGNES[etape]}</Text>
        </FenetreSysteme>

        <View style={styles.points}>
          {LIGNES.map((_, index) => (
            <View
              key={index}
              style={[styles.point, index === etape && { backgroundColor: couleurs.accent }]}
            />
          ))}
        </View>
      </Animated.View>

      <View style={styles.bas}>
        <Bouton
          titre={derniere ? 'Accepter' : 'Continuer'}
          onPress={() => (derniere ? onTermine() : setEtape((e) => e + 1))}
        />
        {!derniere ? (
          <Bouton
            titre="Passer"
            variante="fantome"
            onPress={onTermine}
            style={{ marginTop: espace.s }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
    justifyContent: 'center',
    padding: espace.xl,
  },
  marque: { fontSize: 52, textAlign: 'center' },
  surtitre: {
    ...texte.section,
    color: couleurs.accent,
    textAlign: 'center',
    marginTop: espace.m,
    letterSpacing: 6,
  },
  ligne: { ...texte.corps, color: couleurs.texte, lineHeight: 24, textAlign: 'center' },
  points: { flexDirection: 'row', justifyContent: 'center', gap: espace.s, marginTop: espace.xl },
  point: { width: 7, height: 7, borderRadius: 4, backgroundColor: couleurs.bordure },
  bas: { position: 'absolute', left: espace.xl, right: espace.xl, bottom: espace.xxl },
});
