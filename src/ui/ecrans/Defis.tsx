import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Puce, TitreSection } from '../composants/base';
import { useJeu } from '../../etat/magasin';
import { niveauDepuisXp } from '../../moteur/progression';
import { DEFIS, formaterScore, type Defi } from '../../moteur/defis';
import type { ParamsPile } from '../navigation';

const LIBELLE_FORMAT: Record<Defi['format'], string> = {
  amrap: 'Le plus possible',
  chrono: 'Le plus vite possible',
  max: 'Le plus longtemps possible',
};

/**
 * Les défis éclair.
 *
 * Contrairement aux séances, ils ne changent jamais : c'est justement leur
 * raison d'être. Sans repère fixe, impossible de constater qu'on progresse.
 */
export default function Defis() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ParamsPile>>();

  const xpTotal = useJeu((e) => e.xpTotal);
  const records = useJeu((e) => e.recordsDefis);
  const niveau = niveauDepuisXp(xpTotal).niveau;

  const ouverts = DEFIS.filter((d) => d.niveauRequis <= niveau);
  const fermes = DEFIS.filter((d) => d.niveauRequis > niveau);

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={{
        padding: espace.l,
        paddingTop: insets.top + espace.m,
        paddingBottom: espace.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.titre}>Défis éclair</Text>
      <Text style={styles.sousTitre}>
        Des épreuves qui ne changent jamais, pour mesurer ce que le hasard ne peut pas mesurer.
      </Text>

      <TitreSection>À ta portée</TitreSection>
      <View style={{ gap: espace.s }}>
        {ouverts.map((defi) => (
          <Pressable
            key={defi.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('Defi', { defiId: defi.id })}
            style={({ pressed }) => [styles.carte, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{defi.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{defi.nom}</Text>
              <Text style={styles.format}>{LIBELLE_FORMAT[defi.format]}</Text>
              <Text style={styles.description}>{defi.description}</Text>
            </View>
            {records[defi.id] !== undefined ? (
              <View style={styles.record}>
                <Text style={styles.recordLibelle}>RECORD</Text>
                <Text style={styles.recordValeur}>{formaterScore(defi, records[defi.id])}</Text>
              </View>
            ) : (
              <Puce couleur={couleurs.texteFaible}>jamais tenté</Puce>
            )}
          </Pressable>
        ))}
      </View>

      {fermes.length > 0 ? (
        <>
          <TitreSection>Encore verrouillés</TitreSection>
          <View style={{ gap: espace.s }}>
            {fermes.map((defi) => (
              <View key={defi.id} style={[styles.carte, styles.carteFermee]}>
                <Text style={styles.emoji}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom}>{defi.nom}</Text>
                  <Text style={styles.format}>Niveau {defi.niveauRequis} requis</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.xs, lineHeight: 19 },

  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.l,
  },
  carteFermee: { opacity: 0.5 },
  emoji: { fontSize: 28 },
  nom: { ...texte.corps, color: couleurs.texte, fontWeight: '800' },
  format: { ...texte.minuscule, color: couleurs.violet, marginTop: 2 },
  description: { ...texte.petit, color: couleurs.texteDoux, marginTop: 6, lineHeight: 18 },

  record: { alignItems: 'flex-end' },
  recordLibelle: { ...texte.minuscule, color: couleurs.texteFaible, fontSize: 9 },
  recordValeur: { ...texte.petit, color: couleurs.or, fontWeight: '800', marginTop: 2 },
});
