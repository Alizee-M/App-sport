import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, Jauge, Puce, TitreSection } from '../composants/base';
import { FenetreSysteme, NotificationSysteme } from '../composants/systeme';
import { useJeu } from '../../etat/magasin';
import {
  VOIES,
  voieParId,
  etatVoie,
  progressionVoie,
  voieAchevee,
  palierCourant,
  type Voie,
} from '../../moteur/competences';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Competences'>;

/**
 * Les voies de compétence.
 *
 * Le tirage au sort empêche l'ennui mais ne mène nulle part en
 * particulier. Une voie donne une direction : un geste difficile nommé,
 * découpé en paliers, et un tirage qui programme réellement l'exercice du
 * palier en cours au lieu de piocher au hasard.
 */
export default function Competences({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const voieActive = useJeu((e) => e.voieActive);
  const paliersValides = useJeu((e) => e.paliersValides);
  const volumes = useJeu((e) => e.volumes);
  const choisirVoie = useJeu((e) => e.choisirVoie);
  const validerPalier = useJeu((e) => e.validerPalier);

  const [franchi, setFranchi] = useState<string | null>(null);

  const active = voieActive ? voieParId(voieActive) : undefined;

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
      <Text style={styles.titre}>Voies de compétence</Text>
      <Text style={styles.sousTitre}>
        Une voie te donne un objectif — tenir sur les mains, une pompe sur un bras — et
        programme les exercices qui y mènent, dans l'ordre. Tant qu'elle est active, tes
        séances travaillent le palier en cours.
      </Text>

      {/* --------------------------- Voie suivie ---------------------------- */}
      {active ? (
        <>
          <TitreSection>Voie suivie</TitreSection>
          <DetailVoie
            voie={active}
            paliersValides={paliersValides}
            volumes={volumes}
            onValider={(palierId, nom) => {
              Alert.alert(
                'Test réussi ?',
                'Le Système te croit sur parole. Valide seulement si tu as réellement réussi.',
                [
                  { text: 'Pas encore', style: 'cancel' },
                  {
                    text: 'Réussi',
                    onPress: () => {
                      validerPalier(palierId);
                      setFranchi(nom);
                    },
                  },
                ],
              );
            }}
          />
          <Bouton
            titre="Abandonner cette voie"
            variante="fantome"
            onPress={() =>
              Alert.alert(
                'Abandonner la voie ?',
                'Les paliers déjà franchis et la pratique accumulée sont conservés. Seul le pilotage du tirage s\'arrête.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Abandonner', style: 'destructive', onPress: () => choisirVoie(null) },
                ],
              )
            }
            style={{ marginTop: espace.m }}
          />
        </>
      ) : null}

      {/* -------------------------- Les autres voies ------------------------ */}
      <TitreSection>{active ? 'Autres voies' : 'Choisir une voie'}</TitreSection>
      <View style={{ gap: espace.s }}>
        {VOIES.filter((v) => v.id !== voieActive).map((voie) => {
          const achevee = voieAchevee(voie, paliersValides);
          const courant = palierCourant(voie, paliersValides);

          return (
            <Pressable
              key={voie.id}
              accessibilityRole="button"
              disabled={achevee}
              onPress={() => choisirVoie(voie.id)}
              style={({ pressed }) => [styles.carte, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.emoji}>{achevee ? '🏆' : voie.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{voie.nom}</Text>
                <Text style={styles.objectif}>{voie.objectif}</Text>
                <View style={{ marginTop: espace.s }}>
                  <Jauge
                    progression={progressionVoie(voie, paliersValides)}
                    couleur={achevee ? couleurs.or : couleurs.accent}
                    hauteur={5}
                  />
                </View>
                <Text style={styles.etape}>
                  {achevee
                    ? 'Voie achevée'
                    : `Palier ${voie.paliers.findIndex((p) => p.id === courant?.id) + 1} sur ${voie.paliers.length}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.avertissement}>
        Un palier ne se valide pas d'un clic : il faut d'abord avoir accumulé la pratique,
        que l'app compte séance après séance. Le test lui-même se valide sur parole — aucun
        téléphone ne peut vérifier un équilibre.
      </Text>

      <View style={{ height: espace.l }} />
      <Bouton titre="Retour" variante="fantome" onPress={() => navigation.goBack()} />

      <NotificationSysteme
        visible={franchi !== null}
        titre="Palier franchi"
        lignes={franchi ? [franchi, 'Le prochain palier commence dès ta prochaine séance.'] : []}
        couleur={couleurs.succes}
        libelleBouton="Continuer"
        onFermer={() => setFranchi(null)}
      />
    </ScrollView>
  );
}

function DetailVoie({
  voie,
  paliersValides,
  volumes,
  onValider,
}: {
  voie: Voie;
  paliersValides: string[];
  volumes: Parameters<typeof etatVoie>[2];
  onValider: (palierId: string, nom: string) => void;
}) {
  const etats = etatVoie(voie, paliersValides, volumes);

  return (
    <FenetreSysteme titre={`${voie.emoji} ${voie.nom}`} couleur={couleurs.accent}>
      <Text style={styles.objectifActif}>{voie.objectif}</Text>
      <View style={{ marginVertical: espace.m }}>
        <Jauge progression={progressionVoie(voie, paliersValides)} couleur={couleurs.accent} />
      </View>

      {etats.map((etat, index) => (
        <View
          key={etat.palier.id}
          style={[
            styles.palier,
            etat.courant && styles.palierCourant,
            etat.valide && styles.palierValide,
          ]}
        >
          <View style={styles.enteteePalier}>
            <Text style={styles.numeroPalier}>
              {etat.valide ? '✅' : etat.courant ? '▶' : `${index + 1}`}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nomPalier, etat.valide && styles.nomPalierValide]}>
                {etat.exercice?.emoji}  {etat.exercice?.nom}
              </Text>
              {!etat.valide ? <Text style={styles.testPalier}>{etat.palier.test}</Text> : null}
            </View>
            {etat.courant ? <Puce couleur={couleurs.accent}>EN COURS</Puce> : null}
          </View>

          {etat.courant ? (
            <>
              <Text style={styles.pourquoi}>{etat.palier.pourquoi}</Text>

              <View style={{ marginTop: espace.m }}>
                <Jauge
                  progression={etat.pratique}
                  couleur={etat.testOuvert ? couleurs.succes : couleurs.texteFaible}
                  hauteur={6}
                />
                <Text style={styles.pratique}>
                  {etat.testOuvert
                    ? 'Pratique suffisante. Le test est ouvert.'
                    : `Pratique : ${Math.round(etat.pratique * 100)} % — continue à faire des séances.`}
                </Text>
              </View>

              <Bouton
                titre={etat.testOuvert ? 'J\'ai réussi le test' : 'Test verrouillé'}
                variante={etat.testOuvert ? 'principal' : 'secondaire'}
                desactive={!etat.testOuvert}
                onPress={() => onValider(etat.palier.id, etat.exercice?.nom ?? '')}
                style={{ marginTop: espace.m }}
              />
            </>
          ) : null}
        </View>
      ))}
    </FenetreSysteme>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.s, lineHeight: 20 },

  objectifActif: { ...texte.corps, color: couleurs.texteDoux, fontStyle: 'italic' },

  palier: {
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    paddingTop: espace.m,
    marginTop: espace.m,
  },
  palierCourant: {
    backgroundColor: 'rgba(76,201,240,0.06)',
    borderRadius: rayon.s,
    padding: espace.m,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: couleurs.accent,
  },
  palierValide: { opacity: 0.55 },
  enteteePalier: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  numeroPalier: {
    ...texte.petit,
    color: couleurs.texteFaible,
    width: 22,
    textAlign: 'center',
    fontWeight: '800',
  },
  nomPalier: { ...texte.corps, color: couleurs.texte, fontWeight: '700' },
  nomPalierValide: { textDecorationLine: 'line-through', color: couleurs.texteFaible },
  testPalier: { ...texte.minuscule, color: couleurs.texteDoux, marginTop: 3, lineHeight: 16 },
  pourquoi: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    fontStyle: 'italic',
    marginTop: espace.m,
    lineHeight: 16,
  },
  pratique: { ...texte.minuscule, color: couleurs.texteDoux, marginTop: espace.s },

  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.s,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.l,
  },
  emoji: { fontSize: 28 },
  nom: { ...texte.corps, color: couleurs.texte, fontWeight: '800' },
  objectif: { ...texte.minuscule, color: couleurs.texteDoux, marginTop: 2 },
  etape: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 5 },

  avertissement: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.xl,
    lineHeight: 16,
  },
});
