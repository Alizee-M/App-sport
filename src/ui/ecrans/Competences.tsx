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
  type EtatPalier,
  type Voie,
  type Volumes,
} from '../../moteur/competences';
import { exerciceParId } from '../../moteur/exercices';
import { useEntrainementVoie, phraseMaterielManquant } from '../entrainementVoie';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Competences'>;

/** « 118 répétitions » / « 3 min 20 s » — jamais des secondes à quatre chiffres. */
function quantite(valeur: number, unite: 'reps' | 'secondes'): string {
  if (unite === 'reps') return `${valeur} répétition${valeur > 1 ? 's' : ''}`;
  if (valeur < 90) return `${valeur} s`;
  const minutes = Math.floor(valeur / 60);
  const secondes = valeur % 60;
  return secondes === 0 ? `${minutes} min` : `${minutes} min ${secondes} s`;
}

/**
 * Les voies de compétence.
 *
 * L'écran doit répondre à une seule question : « qu'est-ce que je dois
 * faire, concrètement, pour arriver à tenir sur les mains ? ». D'où le
 * parti pris d'afficher partout l'exercice nommé et le compte exact de ce
 * qui reste, plutôt qu'un pourcentage d'avancement qui ne dit rien de ce
 * qu'il faut faire ce soir.
 */
export default function Competences({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const voieActive = useJeu((e) => e.voieActive);
  const paliersValides = useJeu((e) => e.paliersValides);
  const volumes = useJeu((e) => e.volumes);
  const choisirVoie = useJeu((e) => e.choisirVoie);
  const validerPalier = useJeu((e) => e.validerPalier);
  const preparerSeance = useJeu((e) => e.preparerSeance);

  const [franchi, setFranchi] = useState<string | null>(null);

  const active = voieActive ? voieParId(voieActive) : undefined;

  /* L'entraînement dédié : toute la séance est construite autour du geste
   * de l'étape, au lieu de l'attendre au détour d'un tirage. */
  const entrainement = useEntrainementVoie();
  const seanceVoie = entrainement?.tirage.possible ? entrainement.tirage.seance : null;
  const materielManquant =
    entrainement && !entrainement.tirage.possible ? entrainement.tirage.materielManquant : null;

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
        Une voie vise un geste précis et le découpe en étapes. Chaque étape a{' '}
        <Text style={styles.gras}>un exercice</Text> et{' '}
        <Text style={styles.gras}>une quantité à accumuler</Text> avant de passer à la
        suivante.
      </Text>

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

          {/* --- Lancer l'entraînement de la voie --- */}
          {seanceVoie ? (
            <>
              <Bouton
                titre={`Lancer l'entraînement · ~${Math.round(seanceVoie.dureeEstimeeSec / 60)} min`}
                icone="▶"
                onPress={() => {
                  preparerSeance(seanceVoie, null);
                  navigation.replace('Seance');
                }}
                style={{ marginTop: espace.l }}
              />
              <Text style={styles.detailLancement}>
                Le geste de l'étape en premier, à froid et avec du repos, puis ses exercices
                de soutien. Tout ce que tu fais compte pour l'étape.
              </Text>
            </>
          ) : null}

          {materielManquant ? (
            <View style={styles.blocage}>
              <Text style={styles.blocageTexte}>⚠ {phraseMaterielManquant(materielManquant)}</Text>
            </View>
          ) : null}

          <Bouton
            titre="Tirer une séance libre"
            icone="🎲"
            variante="secondaire"
            onPress={() => navigation.replace('Tirage')}
            style={{ marginTop: espace.s }}
          />
          <Bouton
            titre="Abandonner cette voie"
            variante="fantome"
            onPress={() =>
              Alert.alert(
                'Abandonner la voie ?',
                'Les étapes franchies et la pratique accumulée sont conservées. Seul le pilotage du tirage s\'arrête.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Abandonner', style: 'destructive', onPress: () => choisirVoie(null) },
                ],
              )
            }
            style={{ marginTop: espace.s }}
          />
        </>
      ) : null}

      {/* -------------------------- Les autres voies ------------------------ */}
      <TitreSection>{active ? 'Autres voies' : 'Choisir une voie'}</TitreSection>
      <View style={{ gap: espace.s }}>
        {VOIES.filter((v) => v.id !== voieActive).map((voie) => {
          const achevee = voieAchevee(voie, paliersValides);
          const courant = palierCourant(voie, paliersValides);
          const premier = courant ? exerciceParId(courant.exerciceId) : undefined;

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
                    : `${voie.paliers.length} étapes · on commence par ${premier?.nom ?? '—'}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.avertissement}>
        Tu n'as rien à programmer toi-même : tant qu'une voie est active, le tirage place
        son exercice dans presque toutes tes séances, et compte ce que tu fais. Le test de
        fin d'étape, lui, se valide sur parole — aucun téléphone ne peut vérifier un
        équilibre — mais seulement une fois la quantité atteinte.
      </Text>

      <View style={{ height: espace.l }} />
      <Bouton titre="Retour" variante="fantome" onPress={() => navigation.goBack()} />

      <NotificationSysteme
        visible={franchi !== null}
        titre="Étape franchie"
        lignes={franchi ? [franchi, 'La suivante commence dès ta prochaine séance.'] : []}
        couleur={couleurs.succes}
        libelleBouton="Continuer"
        onFermer={() => setFranchi(null)}
      />
    </ScrollView>
  );
}

/* ------------------------------ La voie suivie ------------------------ */

function DetailVoie({
  voie,
  paliersValides,
  volumes,
  onValider,
}: {
  voie: Voie;
  paliersValides: string[];
  volumes: Volumes;
  onValider: (palierId: string, nom: string) => void;
}) {
  const etats = etatVoie(voie, paliersValides, volumes);
  const courant = etats.find((e) => e.courant);

  return (
    <FenetreSysteme titre={`${voie.emoji} ${voie.nom}`} couleur={couleurs.accent}>
      <Text style={styles.objectifActif}>{voie.objectif}</Text>
      <View style={{ marginVertical: espace.m }}>
        <Jauge progression={progressionVoie(voie, paliersValides)} couleur={couleurs.accent} />
      </View>

      {/* --- Ce qu'il faut faire maintenant : la seule chose qui compte --- */}
      {courant ? <EtapeEnCours etat={courant} voie={voie} onValider={onValider} /> : null}

      {/* --- Le chemin complet, pour savoir où l'on va --- */}
      <Text style={styles.titreChemin}>LE CHEMIN</Text>
      {etats.map((etat, index) => (
        <View key={etat.palier.id} style={styles.ligneChemin}>
          <Text
            style={[
              styles.numero,
              etat.valide && styles.numeroValide,
              etat.courant && styles.numeroCourant,
            ]}
          >
            {etat.valide ? '✓' : `${index + 1}`}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.nomEtape,
                etat.valide && styles.nomEtapeValide,
                etat.courant && styles.nomEtapeCourante,
              ]}
            >
              {etat.exercice?.emoji} {etat.exercice?.nom}
            </Text>
            <Text style={styles.exigence}>
              {quantite(etat.avancement.cible, etat.avancement.unite)} à accumuler, puis :{' '}
              {etat.palier.test.toLowerCase()}
            </Text>
          </View>
          {etat.courant ? <Puce couleur={couleurs.accent}>ICI</Puce> : null}
        </View>
      ))}

      {/* --- Les exercices qui aident sans être l'étape --- */}
      <Text style={styles.titreChemin}>EXERCICES DE SOUTIEN</Text>
      <Text style={styles.soutiens}>
        {voie.soutiens
          .map((id) => exerciceParId(id)?.nom)
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={styles.noteSoutiens}>
        Le tirage les favorise aussi : ils tiennent le geste principal, sans le remplacer.
      </Text>
    </FenetreSysteme>
  );
}

function EtapeEnCours({
  etat,
  voie,
  onValider,
}: {
  etat: EtatPalier;
  voie: Voie;
  onValider: (palierId: string, nom: string) => void;
}) {
  const { avancement, exercice } = etat;
  const rang = voie.paliers.findIndex((p) => p.id === etat.palier.id) + 1;

  return (
    <View style={styles.encadreCourant}>
      <Text style={styles.surtitreCourant}>
        ÉTAPE {rang} SUR {voie.paliers.length} · À TRAVAILLER
      </Text>

      <View style={styles.enteteExercice}>
        <Text style={styles.emojiExercice}>{exercice?.emoji}</Text>
        <Text style={styles.nomExercice}>{exercice?.nom}</Text>
      </View>

      {exercice ? <Text style={styles.consigne}>{exercice.consigne}</Text> : null}
      {exercice?.astuce ? <Text style={styles.astuce}>💡 {exercice.astuce}</Text> : null}

      <View style={{ marginTop: espace.l }}>
        <Jauge
          progression={etat.pratique}
          couleur={etat.testOuvert ? couleurs.succes : couleurs.accent}
          hauteur={7}
        />
        <Text style={styles.compte}>
          {quantite(avancement.fait, avancement.unite)} sur{' '}
          {quantite(avancement.cible, avancement.unite)}
        </Text>
        <Text style={[styles.reste, etat.testOuvert && { color: couleurs.succes }]}>
          {etat.testOuvert
            ? 'Quantité atteinte. Le test est ouvert.'
            : `Il reste ${quantite(avancement.reste, avancement.unite)} à faire en séance.`}
        </Text>
      </View>

      <View style={styles.blocTest}>
        <Text style={styles.libelleTest}>LE TEST DE CETTE ÉTAPE</Text>
        <Text style={styles.test}>{etat.palier.test}</Text>
        <Text style={styles.pourquoi}>{etat.palier.pourquoi}</Text>
      </View>

      <Bouton
        titre={etat.testOuvert ? 'J\'ai réussi le test' : 'Test verrouillé'}
        variante={etat.testOuvert ? 'principal' : 'secondaire'}
        desactive={!etat.testOuvert}
        onPress={() => onValider(etat.palier.id, exercice?.nom ?? '')}
        style={{ marginTop: espace.m }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.s, lineHeight: 20 },
  gras: { color: couleurs.texte, fontWeight: '700' },

  objectifActif: { ...texte.corps, color: couleurs.texteDoux, fontStyle: 'italic' },

  detailLancement: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.s,
    lineHeight: 16,
    textAlign: 'center',
  },
  blocage: {
    marginTop: espace.l,
    padding: espace.m,
    borderRadius: rayon.s,
    borderWidth: 1,
    borderColor: couleurs.danger,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  blocageTexte: { ...texte.minuscule, color: couleurs.texteDoux, lineHeight: 17 },

  /* --- L'étape en cours --- */
  encadreCourant: {
    backgroundColor: 'rgba(76,201,240,0.07)',
    borderWidth: 1,
    borderColor: couleurs.accent,
    borderRadius: rayon.s,
    padding: espace.l,
  },
  surtitreCourant: { ...texte.section, color: couleurs.accent, fontSize: 10 },
  enteteExercice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    marginTop: espace.s,
  },
  emojiExercice: { fontSize: 30 },
  nomExercice: { ...texte.sousTitre, color: couleurs.texte, flex: 1 },
  consigne: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.m, lineHeight: 20 },
  astuce: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: espace.s, lineHeight: 17 },

  compte: { ...texte.corps, color: couleurs.texte, fontWeight: '800', marginTop: espace.s },
  reste: { ...texte.petit, color: couleurs.texteDoux, marginTop: 2 },

  blocTest: {
    marginTop: espace.l,
    paddingTop: espace.m,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  libelleTest: { ...texte.section, color: couleurs.texteFaible, fontSize: 10 },
  test: { ...texte.petit, color: couleurs.texte, marginTop: 4, lineHeight: 19 },
  pourquoi: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    fontStyle: 'italic',
    marginTop: espace.s,
    lineHeight: 16,
  },

  /* --- Le chemin complet --- */
  titreChemin: {
    ...texte.section,
    color: couleurs.texteFaible,
    fontSize: 10,
    marginTop: espace.xl,
    marginBottom: espace.s,
  },
  ligneChemin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingVertical: espace.s,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  numero: {
    ...texte.petit,
    color: couleurs.texteFaible,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  numeroValide: { color: couleurs.succes },
  numeroCourant: { color: couleurs.accent },
  nomEtape: { ...texte.petit, color: couleurs.texteDoux, fontWeight: '700' },
  nomEtapeValide: { textDecorationLine: 'line-through', color: couleurs.texteFaible },
  nomEtapeCourante: { color: couleurs.texte },
  exigence: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 2, lineHeight: 16 },

  soutiens: { ...texte.petit, color: couleurs.texteDoux, lineHeight: 20 },
  noteSoutiens: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 4, lineHeight: 16 },

  /* --- Le choix d'une voie --- */
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
