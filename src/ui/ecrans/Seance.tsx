import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';

import { couleurs, couleurParGenre, espace, libelleParGenre, rayon, texte } from '../theme';
import { Bouton, Jauge } from '../composants/base';
import { BulleCoach } from '../composants/elements';
import { useJeu } from '../../etat/magasin';
import {
  construireEtapes,
  formaterChrono,
  ratioAccompli,
  secondesRestantes,
} from '../../moteur/deroulement';
import { repliqueCoach, type ContexteCoach } from '../../moteur/coach';
import { creerAlea } from '../../moteur/alea';
import { useSonsSeance } from '../sons';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Seance'>;

/**
 * L'exécution de la séance.
 *
 * L'écran reste volontairement pauvre en informations : un chrono énorme,
 * un nom d'exercice, une consigne. Le téléphone est posé par terre à un
 * mètre des yeux — tout ce qui est petit ne sera pas lu.
 */
export default function Seance({ navigation }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const seance = useJeu((e) => e.seancePreparee);
  const terminerSeance = useJeu((e) => e.terminerSeance);
  const oublier = useJeu((e) => e.oublierSeancePreparee);
  const sonsActifs = useJeu((e) => e.reglages.sons);
  const jouer = useSonsSeance(sonsActifs);

  const etapes = useMemo(() => (seance ? construireEtapes(seance) : []), [seance]);

  const [index, setIndex] = useState(0);
  const [ecoule, setEcoule] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const cloture = useRef(false);

  const debut = useRef(Date.now());
  const cumul = useRef(0);

  const etape = etapes[index];

  /* Chaque nouvelle étape repart d'un compteur neuf. Cet effet doit rester
   * déclaré avant celui du chronomètre : React exécute les effets dans
   * l'ordre de déclaration, et le chrono doit démarrer sur un cumul remis
   * à zéro. */
  useEffect(() => {
    cumul.current = 0;
    debut.current = Date.now();
    setEcoule(0);
  }, [index]);

  useEffect(() => {
    if (enPause || !etape) return;
    debut.current = Date.now();
    const identifiant = setInterval(() => {
      setEcoule(cumul.current + (Date.now() - debut.current) / 1000);
    }, 200);
    return () => {
      cumul.current += (Date.now() - debut.current) / 1000;
      clearInterval(identifiant);
    };
  }, [enPause, index, etape]);

  const cloturer = useCallback(
    (positionArret: number) => {
      if (!seance || cloture.current) return;
      cloture.current = true;
      const ratio = ratioAccompli(etapes, positionArret);
      const resultat = terminerSeance(seance, ratio);
      navigation.replace('Bilan', { resultat, titre: seance.titre });
    },
    [seance, etapes, terminerSeance, navigation],
  );

  const avancer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setIndex((precedent) => {
      const suivant = precedent + 1;
      if (suivant >= etapes.length) {
        jouer('fin');
        cloturer(etapes.length);
        return precedent;
      }
      return suivant;
    });
  }, [etapes.length, cloturer, jouer]);

  /* Un signal à chaque changement d'étape : sans lui, il faudrait fixer
   * l'écran en permanence pour savoir quand passer à la suite — ce qui
   * est intenable en pleine planche. */
  const dernierBip = useRef<number | null>(null);
  useEffect(() => {
    dernierBip.current = null;
    const courante = etapes[index];
    if (!courante) return;
    jouer(courante.genre === 'repos' || courante.genre === 'repos_bloc' ? 'repos' : 'depart');
    // Volontairement limité à l'index : on annonce le changement d'étape,
    // pas chaque battement du chronomètre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* Décompte des trois dernières secondes. */
  useEffect(() => {
    if (enPause || !etape) return;
    const restant = Math.ceil(etape.secondes - ecoule);
    if (restant <= 3 && restant >= 1 && dernierBip.current !== restant) {
      dernierBip.current = restant;
      jouer('bip');
    }
  }, [ecoule, etape, enPause, jouer]);

  // Fin d'étape : le temps imparti est écoulé.
  useEffect(() => {
    if (!etape || enPause) return;
    if (ecoule >= etape.secondes) avancer();
  }, [ecoule, etape, enPause, avancer]);

  const abandonner = useCallback(() => {
    Alert.alert(
      'Arrêter la séance ?',
      'Ce que tu as déjà fait sera compté. Rien n\'est perdu.',
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Arrêter', style: 'destructive', onPress: () => cloturer(index) },
      ],
    );
  }, [cloturer, index]);

  // Le retour Android ne doit pas quitter la séance par accident.
  useEffect(() => {
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      abandonner();
      return true;
    });
    return () => abonnement.remove();
  }, [abandonner]);

  /* Séance introuvable : on sort proprement plutôt que d'afficher un écran
   * vide. Le drapeau de clôture est indispensable — terminer une séance
   * vide `seancePreparee`, et sans lui cet effet renverrait au camp en
   * écrasant le bilan qu'on vient tout juste d'ouvrir. */
  useEffect(() => {
    if (!seance && !cloture.current) {
      oublier();
      navigation.replace('Onglets');
    }
  }, [seance, oublier, navigation]);

  const propos = useMemo(() => {
    if (!etape) return '';
    const alea = creerAlea(index * 7919 + 13);
    const contexte: ContexteCoach =
      etape.genre === 'echauffement'
        ? 'echauffement'
        : etape.genre === 'retour_calme'
          ? 'retour_calme'
          : etape.genre === 'repos' || etape.genre === 'repos_bloc'
            ? 'repos'
            : etape.dernierTour
              ? 'dernier_tour'
              : 'debut_exo';
    return repliqueCoach(contexte, alea, { exercice: etape.titre });
  }, [index, etape]);

  if (!seance || !etape) return <View style={styles.ecran} />;

  const restant = Math.max(0, Math.ceil(etape.secondes - ecoule));
  const progressionEtape = Math.min(1, ecoule / etape.secondes);
  const couleur = couleurParGenre[etape.genre] ?? couleurs.accent;
  const enRepos = etape.genre === 'repos' || etape.genre === 'repos_bloc';
  const prescrit = etape.prescrit;

  const dose = prescrit
    ? prescrit.exercice.mesure === 'reps'
      ? `${prescrit.reps} répétitions`
      : `${etape.secondes} secondes`
    : null;

  return (
    <View style={[styles.ecran, { paddingTop: insets.top }]}>
      {/* ------------------------- Avancement global ------------------------ */}
      <View style={styles.entete}>
        <Text style={styles.contexte} numberOfLines={1}>
          {etape.contexte}
        </Text>
        <Text style={styles.restantTotal}>
          {formaterChrono(secondesRestantes(etapes, index) - ecoule)} restant
        </Text>
      </View>
      <View style={{ paddingHorizontal: espace.l }}>
        <Jauge progression={index / etapes.length} couleur={couleurs.violet} hauteur={5} />
      </View>

      {/* La règle du jour est acceptée avant de commencer, puis oubliée
          dès le premier exercice : elle reste donc affichée. */}
      {seance.modificateurs.length > 0 ? (
        <View style={styles.rappelRegles}>
          {seance.modificateurs.map((m) => (
            <Text key={m.id} style={styles.rappelRegle} numberOfLines={1}>
              {m.emoji} {m.nom}
            </Text>
          ))}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.corps}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.etiquetteGenre, { backgroundColor: `${couleur}22` }]}>
          <Text style={[styles.etiquetteGenreTexte, { color: couleur }]}>
            {libelleParGenre[etape.genre] ?? ''}
          </Text>
        </View>

        <Text style={[styles.chrono, { color: couleur }]}>{restant}</Text>

        <View style={styles.anneau}>
          <Jauge progression={progressionEtape} couleur={couleur} hauteur={6} />
        </View>

        <Text style={styles.nomEtape}>
          {prescrit ? `${prescrit.exercice.emoji}  ` : ''}
          {etape.titre}
        </Text>

        {dose ? <Text style={[styles.dose, { color: couleur }]}>{dose}</Text> : null}

        {enRepos && etape.suivant ? (
          <View style={styles.encartSuivant}>
            <Text style={styles.libelleSuivant}>ENSUITE</Text>
            <Text style={styles.nomSuivant}>{etape.suivant}</Text>
          </View>
        ) : null}

        {prescrit ? (
          <View style={styles.consigneBloc}>
            <Text style={styles.consigne}>{prescrit.exercice.consigne}</Text>
            {prescrit.exercice.astuce ? (
              <Text style={styles.astuce}>💡 {prescrit.exercice.astuce}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: espace.l }} />
        <BulleCoach texte={propos} />
      </ScrollView>

      {/* ---------------------------- Commandes ---------------------------- */}
      <View style={[styles.commandes, { paddingBottom: insets.bottom + espace.l }]}>
        <View style={styles.ligneCommandes}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Arrêter la séance"
            onPress={abandonner}
            style={styles.boutonRond}
          >
            <Text style={styles.boutonRondTexte}>✕</Text>
          </Pressable>

          <Bouton
            titre={enPause ? 'Reprendre' : 'Pause'}
            icone={enPause ? '▶️' : '⏸️'}
            variante={enPause ? 'principal' : 'secondaire'}
            onPress={() => setEnPause((p) => !p)}
            pleineLargeur={false}
            style={{ flex: 1 }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passer à l'étape suivante"
            onPress={avancer}
            style={styles.boutonRond}
          >
            <Text style={styles.boutonRondTexte}>⏭</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espace.l,
    paddingVertical: espace.m,
    gap: espace.m,
  },
  contexte: { ...texte.minuscule, color: couleurs.texteDoux, flex: 1 },
  restantTotal: { ...texte.minuscule, color: couleurs.texteFaible },

  rappelRegles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace.s,
    paddingHorizontal: espace.l,
    paddingTop: espace.s,
  },
  rappelRegle: {
    ...texte.minuscule,
    color: couleurs.or,
    backgroundColor: 'rgba(255,200,87,0.12)',
    paddingHorizontal: espace.m,
    paddingVertical: 4,
    borderRadius: rayon.rond,
  },

  corps: {
    alignItems: 'center',
    paddingHorizontal: espace.l,
    paddingTop: espace.xl,
    paddingBottom: espace.xl,
  },
  etiquetteGenre: {
    paddingHorizontal: espace.l,
    paddingVertical: 6,
    borderRadius: rayon.rond,
  },
  etiquetteGenreTexte: { ...texte.section },

  chrono: { ...texte.geant, marginTop: espace.s, fontVariant: ['tabular-nums'] },
  anneau: { width: '60%', marginTop: espace.s, marginBottom: espace.xl },

  nomEtape: {
    ...texte.titre,
    color: couleurs.texte,
    textAlign: 'center',
    paddingHorizontal: espace.m,
  },
  dose: { ...texte.sousTitre, marginTop: espace.s },

  encartSuivant: {
    marginTop: espace.xl,
    alignItems: 'center',
    backgroundColor: couleurs.surface,
    borderRadius: rayon.l,
    paddingVertical: espace.l,
    paddingHorizontal: espace.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  libelleSuivant: { ...texte.minuscule, color: couleurs.texteFaible, letterSpacing: 1.2 },
  nomSuivant: { ...texte.sousTitre, color: couleurs.texte, marginTop: 4, textAlign: 'center' },

  consigneBloc: {
    marginTop: espace.xl,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.l,
    padding: espace.l,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  consigne: { ...texte.corps, color: couleurs.texte, lineHeight: 22, textAlign: 'center' },
  astuce: {
    ...texte.petit,
    color: couleurs.texteDoux,
    marginTop: espace.m,
    lineHeight: 19,
    textAlign: 'center',
  },

  commandes: {
    paddingHorizontal: espace.l,
    paddingTop: espace.m,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  ligneCommandes: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  boutonRond: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: couleurs.surfaceHaute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonRondTexte: { fontSize: 20, color: couleurs.texte },
});
