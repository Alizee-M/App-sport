import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, Jauge, Puce, TitreSection } from '../composants/base';
import { FenetreSysteme, NotificationSysteme } from '../composants/systeme';
import { useJeu } from '../../etat/magasin';
import { niveauDepuisXp } from '../../moteur/progression';
import { genererSeance } from '../../moteur/seance';
import {
  RECOMPENSES,
  LIBELLE_PALIER,
  caloriesSeance,
  progressionQuete,
  kcalRestantes,
  seancesRestantes,
  recompenseParId,
  type Palier,
  type Recompense,
} from '../../moteur/calories';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Recompenses'>;

const ORDRE_PALIERS: Palier[] = ['petite', 'moyenne', 'grosse', 'legendaire'];

const COULEUR_PALIER: Record<Palier, string> = {
  petite: couleurs.succes,
  moyenne: couleurs.accent,
  grosse: couleurs.or,
  legendaire: couleurs.violet,
};

/**
 * Le catalogue des récompenses à débloquer.
 *
 * L'écran ne dit jamais quoi manger et ne parle jamais de poids : il
 * traduit une envie en effort, et affiche cet effort sans le minorer.
 * Un burger vaut cinq séances — l'annoncer autrement serait mentir.
 */
export default function Recompenses({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const reglages = useJeu((e) => e.reglages);
  const majReglages = useJeu((e) => e.majReglages);
  const xpTotal = useJeu((e) => e.xpTotal);
  const quete = useJeu((e) => e.queteRecompense);
  const choisirRecompense = useJeu((e) => e.choisirRecompense);
  const abandonnerQuete = useJeu((e) => e.abandonnerQuete);
  const reclamerRecompense = useJeu((e) => e.reclamerRecompense);
  const debloquees = useJeu((e) => e.recompensesDebloquees);

  const niveau = niveauDepuisXp(xpTotal).niveau;
  const [saisiePoids, setSaisiePoids] = useState(
    reglages.poidsKg ? String(reglages.poidsKg) : '',
  );
  const [reclamee, setReclamee] = useState<Recompense | null>(null);

  /** Dépense d'une séance type, avec les réglages habituels du joueur. */
  const kcalParSeance = useMemo(() => {
    if (!reglages.poidsKg) return 0;
    const type = genererSeance({
      dureeMin: reglages.dureeMin,
      intensite: reglages.intensite,
      focus: reglages.focus,
      materielDispo: reglages.materielDispo,
      silencieux: reglages.silencieux,
      niveau,
      historiqueIds: [],
      seed: 1,
      nbModificateurs: 0,
    });
    return caloriesSeance(type, reglages.poidsKg);
  }, [reglages, niveau]);

  const enregistrerPoids = () => {
    const valeur = Math.round(parseFloat(saisiePoids.replace(',', '.')));
    if (!Number.isFinite(valeur) || valeur < 30 || valeur > 250) {
      Alert.alert('Poids invalide', 'Indique un poids en kilogrammes, entre 30 et 250.');
      return;
    }
    majReglages({ poidsKg: valeur });
  };

  const active = quete ? recompenseParId(quete.recompenseId) : undefined;

  /* ------------------- Sans poids, aucun calcul possible ------------------ */
  if (!reglages.poidsKg) {
    return (
      <ScrollView
        style={styles.ecran}
        contentContainerStyle={{ padding: espace.l, paddingTop: insets.top + espace.xl }}
      >
        <Text style={styles.titre}>Calibrage requis</Text>
        <View style={{ height: espace.l }} />

        <FenetreSysteme titre="Donnée manquante">
          <Text style={styles.explication}>
            Pour estimer ta dépense, le Système a besoin de ton poids : c'est le facteur
            principal du calcul. Sans lui, tout chiffre affiché serait inventé — et une
            estimation inventée ne vaut rien.
          </Text>

          <View style={styles.champPoids}>
            <TextInput
              value={saisiePoids}
              onChangeText={setSaisiePoids}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor={couleurs.texteFaible}
              style={styles.saisie}
              accessibilityLabel="Poids en kilogrammes"
              maxLength={5}
            />
            <Text style={styles.unite}>kg</Text>
          </View>

          <Bouton titre="Valider" onPress={enregistrerPoids} style={{ marginTop: espace.m }} />

          <Text style={styles.noteConfidentialite}>
            Cette valeur reste sur ton téléphone, ne sert qu'à ce calcul, et n'est jamais
            affichée ailleurs. L'app ne parle pas de poids à perdre.
          </Text>
        </FenetreSysteme>

        <View style={{ height: espace.l }} />
        <Bouton titre="Retour" variante="fantome" onPress={() => navigation.goBack()} />
      </ScrollView>
    );
  }

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
      <Text style={styles.titre}>Récompenses</Text>
      <Text style={styles.sousTitre}>
        Choisis ce que tu veux débloquer. Le Système annonce l'effort réel que ça demande,
        sans l'arrondir à la baisse.
      </Text>

      {/* --------------------------- Quête en cours -------------------------- */}
      {quete && active ? (
        <>
          <TitreSection>En cours</TitreSection>
          <FenetreSysteme titre={active.nom} couleur={COULEUR_PALIER[active.palier]}>
            <View style={styles.ligneActive}>
              <Text style={styles.emojiActive}>{active.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.valeurActive}>
                  {Math.round(quete.kcalAccumulees)} / {active.kcal} kcal
                </Text>
                <Text style={styles.detailActive}>
                  {progressionQuete(quete) >= 1
                    ? 'Objectif atteint.'
                    : `Encore ${kcalRestantes(quete)} kcal · environ ${seancesRestantes(quete, kcalParSeance)} séance(s)`}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: espace.m }}>
              <Jauge progression={progressionQuete(quete)} couleur={COULEUR_PALIER[active.palier]} />
            </View>

            {progressionQuete(quete) >= 1 ? (
              <Bouton
                titre="Réclamer"
                onPress={() => {
                  setReclamee(active);
                  reclamerRecompense();
                }}
                style={{ marginTop: espace.l }}
              />
            ) : (
              <Bouton
                titre="Abandonner cette quête"
                variante="fantome"
                onPress={() =>
                  Alert.alert(
                    'Abandonner ?',
                    'Les calories accumulées sur cette quête seront perdues.',
                    [
                      { text: 'Continuer', style: 'cancel' },
                      { text: 'Abandonner', style: 'destructive', onPress: abandonnerQuete },
                    ],
                  )
                }
                style={{ marginTop: espace.l }}
              />
            )}
          </FenetreSysteme>
        </>
      ) : null}

      {/* ---------------------------- Le catalogue --------------------------- */}
      {ORDRE_PALIERS.map((palier) => (
        <View key={palier}>
          <TitreSection>{LIBELLE_PALIER[palier]}</TitreSection>
          <View style={{ gap: espace.s }}>
            {RECOMPENSES.filter((r) => r.palier === palier).map((recompense) => {
              const seances = Math.ceil(recompense.kcal / Math.max(1, kcalParSeance));
              const enCours = quete?.recompenseId === recompense.id;

              return (
                <Pressable
                  key={recompense.id}
                  accessibilityRole="button"
                  disabled={enCours}
                  onPress={() =>
                    quete
                      ? Alert.alert(
                          'Changer de quête ?',
                          'La progression de la quête en cours sera perdue.',
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Changer',
                              style: 'destructive',
                              onPress: () => choisirRecompense(recompense.id),
                            },
                          ],
                        )
                      : choisirRecompense(recompense.id)
                  }
                  style={({ pressed }) => [
                    styles.carte,
                    enCours && { borderColor: COULEUR_PALIER[palier] },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.emoji}>{recompense.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nom}>{recompense.nom}</Text>
                    <Text style={styles.cout}>
                      {recompense.kcal} kcal · {seances} séance{seances > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {enCours ? (
                    <Puce couleur={COULEUR_PALIER[palier]} fond="rgba(76,201,240,0.12)">
                      EN COURS
                    </Puce>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* ---------------------------- Déjà obtenues -------------------------- */}
      {debloquees.length > 0 ? (
        <>
          <TitreSection>Déjà débloquées</TitreSection>
          <FenetreSysteme discrete>
            {debloquees.slice(0, 10).map((entree, index) => {
              const recompense = recompenseParId(entree.recompenseId);
              if (!recompense) return null;
              return (
                <Text key={`${entree.recompenseId}-${index}`} style={styles.ligneObtenue}>
                  {recompense.emoji}  {recompense.nom} —{' '}
                  {new Date(entree.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              );
            })}
          </FenetreSysteme>
        </>
      ) : null}

      <Text style={styles.avertissement}>
        Estimation par la méthode MET, juste à ±20-30 % près : deux personnes du même poids
        ne dépensent pas exactement la même chose. C'est un ordre de grandeur pour fixer un
        objectif, pas une mesure.
      </Text>

      <View style={{ height: espace.l }} />
      <Bouton titre="Retour" variante="fantome" onPress={() => navigation.goBack()} />

      <NotificationSysteme
        visible={reclamee !== null}
        titre="Récompense débloquée"
        lignes={
          reclamee
            ? [`${reclamee.emoji}  ${reclamee.nom}`, 'Tu as fait le travail. Profites-en.']
            : []
        }
        couleur={couleurs.or}
        libelleBouton="Bien mérité"
        onFermer={() => setReclamee(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.s, lineHeight: 20 },

  explication: { ...texte.corps, color: couleurs.texteDoux, lineHeight: 22 },
  champPoids: { flexDirection: 'row', alignItems: 'center', gap: espace.m, marginTop: espace.l },
  saisie: {
    flex: 1,
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.accent,
    borderRadius: rayon.s,
    color: couleurs.texte,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
    textAlign: 'center',
  },
  unite: { ...texte.sousTitre, color: couleurs.texteDoux },
  noteConfidentialite: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.m,
    lineHeight: 16,
  },

  ligneActive: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  emojiActive: { fontSize: 34 },
  valeurActive: { ...texte.sousTitre, color: couleurs.texte },
  detailActive: { ...texte.petit, color: couleurs.texteDoux, marginTop: 2 },

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
  emoji: { fontSize: 26 },
  nom: { ...texte.corps, color: couleurs.texte, fontWeight: '700' },
  cout: { ...texte.minuscule, color: couleurs.accent, marginTop: 3 },

  ligneObtenue: { ...texte.petit, color: couleurs.texteDoux, paddingVertical: 4 },

  avertissement: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.xl,
    lineHeight: 16,
  },
});
