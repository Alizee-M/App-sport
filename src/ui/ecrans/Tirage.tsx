import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, Panneau, Puce, TitreSection } from '../composants/base';
import {
  Bascule,
  CarteExercice,
  CarteModificateur,
  PuceSelectionnable,
  RangeePuces,
  Segments,
} from '../composants/elements';
import { useJeu } from '../../etat/magasin';
import { niveauDepuisXp } from '../../moteur/progression';
import { genererSeance, retirerExercice, retirerModificateur } from '../../moteur/seance';
import { graineAleatoire } from '../../moteur/alea';
import { noeudParId, optionsPourNoeud } from '../../moteur/aventure';
import { plageRepos } from '../../moteur/deroulement';
import { LIBELLE_MATERIEL, LIBELLE_FOCUS, LIBELLE_INTENSITE } from '../../moteur/types';
import type { Focus, Intensite, Materiel, OptionsTirage, Seance } from '../../moteur/types';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Tirage'>;

const DUREES = [10, 15, 20, 30, 45];
const INTENSITES: Intensite[] = [1, 2, 3];
const FOCUS: Focus[] = ['complet', 'force', 'cardio', 'gainage', 'souplesse'];
const MATERIELS: Materiel[] = ['chaise', 'mur', 'tapis', 'elastique', 'halteres'];

/**
 * Le tirage. Deux temps : on règle le cadre (temps dont on dispose,
 * énergie du jour, voisins), puis on découvre ce que le hasard propose.
 *
 * Chaque carte peut être échangée individuellement : c'est ce qui permet
 * d'accepter une séance imparfaite au lieu de tout annuler.
 */
export default function Tirage({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const idNoeud = route.params?.noeudId;
  const noeud = idNoeud ? noeudParId(idNoeud) : undefined;

  const xpTotal = useJeu((e) => e.xpTotal);
  const historiqueIds = useJeu((e) => e.historiqueIds);
  const reglages = useJeu((e) => e.reglages);
  const majReglages = useJeu((e) => e.majReglages);
  const preparerSeance = useJeu((e) => e.preparerSeance);

  const niveau = niveauDepuisXp(xpTotal).niveau;
  const [seance, setSeance] = useState<Seance | null>(null);

  const options = useMemo<OptionsTirage>(() => {
    const base = {
      materielDispo: reglages.materielDispo,
      silencieux: reglages.silencieux,
      niveau,
      historiqueIds,
      seed: 0,
    };
    if (noeud) return optionsPourNoeud(noeud, base);
    return {
      ...base,
      dureeMin: reglages.dureeMin,
      intensite: reglages.intensite,
      focus: reglages.focus,
    };
  }, [noeud, reglages, niveau, historiqueIds]);

  const tirer = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSeance(genererSeance({ ...options, seed: graineAleatoire() }));
  }, [options]);

  // Une quête arrive avec son cadre déjà fixé : on tire tout de suite.
  useEffect(() => {
    if (noeud && !seance) tirer();
  }, [noeud, seance, tirer]);

  if (seance) {
    return (
      <Apercu
        seance={seance}
        options={options}
        niveau={niveau}
        insets={insets.top}
        onRetirerTout={tirer}
        onRetirerExercice={(bloc, exo) =>
          setSeance((actuelle) =>
            actuelle ? retirerExercice(actuelle, bloc, exo, options, graineAleatoire()) : actuelle,
          )
        }
        onRetirerModificateur={(index) =>
          setSeance((actuelle) =>
            actuelle ? retirerModificateur(actuelle, index, options, graineAleatoire()) : actuelle,
          )
        }
        onLancer={() => {
          preparerSeance(seance, idNoeud ?? null);
          navigation.replace('Seance');
        }}
        // Une quête arrive avec son cadre imposé : il n'y a rien à régler.
        onChangerCadre={noeud ? undefined : () => setSeance(null)}
      />
    );
  }

  /* --------------------------- Réglages du jour ------------------------ */
  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={{ padding: espace.l, paddingTop: insets.top + espace.m, paddingBottom: espace.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.titre}>Le cadre du jour</Text>
      <Text style={styles.sousTitre}>
        Dis-moi seulement de quoi tu disposes. Le contenu, c'est la surprise.
      </Text>

      <TitreSection>Combien de temps</TitreSection>
      <Segments
        valeurs={DUREES.map((d) => ({ valeur: d, libelle: `${d} min` }))}
        valeur={reglages.dureeMin}
        onChange={(dureeMin) => majReglages({ dureeMin })}
        libelle={(d) => `${d} min`}
      />

      <TitreSection>Quelle énergie</TitreSection>
      <Segments
        valeurs={INTENSITES.map((i) => ({ valeur: i, libelle: LIBELLE_INTENSITE[i] }))}
        valeur={reglages.intensite}
        onChange={(intensite) => majReglages({ intensite })}
        libelle={(i) => LIBELLE_INTENSITE[i as Intensite]}
      />

      <TitreSection>Envie de travailler</TitreSection>
      <RangeePuces>
        {FOCUS.map((f) => (
          <PuceSelectionnable
            key={f}
            titre={LIBELLE_FOCUS[f]}
            actif={reglages.focus === f}
            onPress={() => majReglages({ focus: f })}
          />
        ))}
      </RangeePuces>

      <TitreSection>Ce que tu as sous la main</TitreSection>
      <RangeePuces>
        {MATERIELS.map((m) => (
          <PuceSelectionnable
            key={m}
            titre={LIBELLE_MATERIEL[m]}
            actif={reglages.materielDispo.includes(m)}
            onPress={() =>
              majReglages({
                materielDispo: reglages.materielDispo.includes(m)
                  ? reglages.materielDispo.filter((x) => x !== m)
                  : [...reglages.materielDispo, m],
              })
            }
          />
        ))}
      </RangeePuces>

      <View style={{ height: espace.s }} />
      <Panneau>
        <Bascule
          titre="Mode appartement"
          description="Écarte tout ce qui saute. Les voisins du dessous te diront merci."
          actif={reglages.silencieux}
          onChange={(silencieux) => majReglages({ silencieux })}
        />
      </Panneau>

      <View style={{ height: espace.xl }} />
      <Bouton titre="Tirer la séance" icone="🎲" onPress={tirer} />
    </ScrollView>
  );
}

/* --------------------------- Aperçu du tirage ------------------------- */

function Apercu({
  seance,
  options,
  niveau,
  insets,
  onRetirerTout,
  onRetirerExercice,
  onRetirerModificateur,
  onLancer,
  onChangerCadre,
}: {
  seance: Seance;
  options: OptionsTirage;
  niveau: number;
  insets: number;
  onRetirerTout: () => void;
  onRetirerExercice: (bloc: number, exo: number) => void;
  onRetirerModificateur: (index: number) => void;
  onLancer: () => void;
  onChangerCadre?: () => void;
}) {
  const apparition = useRef(new Animated.Value(0)).current;

  // Les cartes « arrivent » à chaque nouveau tirage : sans ce mouvement,
  // re-tirer ne se ressent pas comme un tirage.
  useEffect(() => {
    apparition.setValue(0);
    Animated.timing(apparition, {
      toValue: 1,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [seance.seed, apparition]);

  const style = {
    opacity: apparition,
    transform: [
      { translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
    ],
  };

  return (
    <View style={styles.ecran}>
      <ScrollView
        contentContainerStyle={{
          padding: espace.l,
          paddingTop: insets + espace.m,
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={style}>
          <Text style={styles.etiquetteTirage}>
            {seance.type === 'boss' ? '👹 COMBAT DE BOSS' : seance.type === 'aventure' ? '🗺️ QUÊTE' : '🎲 TIRAGE'}
          </Text>
          <Text style={styles.titre}>{seance.titre}</Text>

          <View style={styles.metaLigne}>
            <Puce couleur={couleurs.texte}>⏱️ {Math.round(seance.dureeEstimeeSec / 60)} min</Puce>
            <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
              ⭐ {seance.xpPotentiel} XP
            </Puce>
            <Puce couleur={couleurs.texteDoux}>{LIBELLE_INTENSITE[seance.intensite]}</Puce>
          </View>

          {/* ------------------------ Règles du jeu ------------------------ */}
          {seance.modificateurs.length > 0 ? (
            <>
              <TitreSection>
                {seance.modificateurs.length > 1 ? 'Règles du jour' : 'Règle du jour'}
              </TitreSection>
              <Text style={styles.expliqueRegle}>
                Une contrainte tirée au sort qui change la façon de jouer les mêmes exercices —
                c'est ce qui empêche deux séances de se ressembler. Tu l'acceptes en échange
                d'XP en plus. Celles marquées <Text style={styles.expliqueAuto}>⚙️ auto</Text>{' '}
                sont déjà appliquées à la séance ci-dessous ; les autres tiennent sur ta parole.
              </Text>
              <View style={{ gap: espace.m }}>
                {seance.modificateurs.map((m, index) => (
                  <CarteModificateur
                    key={`${m.id}-${index}`}
                    modificateur={m}
                    onRetirer={seance.type === 'boss' ? undefined : () => onRetirerModificateur(index)}
                  />
                ))}
              </View>
              {seance.type === 'boss' ? (
                <Text style={styles.noteBoss}>
                  Un boss impose ses règles : celles-ci ne s'échangent pas.
                </Text>
              ) : null}
            </>
          ) : null}

          {/* --------------------------- Blocs ---------------------------- */}
          {seance.blocs.map((bloc, indexBloc) => (
            <View key={indexBloc}>
              <TitreSection>{`Bloc ${indexBloc + 1} · ${bloc.nom}`}</TitreSection>
              <Text style={styles.detailBloc}>
                {bloc.tours} tours · {bloc.travailSec} s d'effort ·{' '}
                {(() => {
                  // Le repos varie avec la difficulté : l'annoncer évite de
                  // croire à une incohérence en voyant 15 s puis 25 s.
                  const { min, max } = plageRepos(bloc);
                  if (max === 0) return 'aucun repos';
                  return min === max ? `${min} s de repos` : `repos de ${min} à ${max} s`;
                })()}
              </Text>
              <View style={{ gap: espace.s, marginTop: espace.m }}>
                {bloc.exercices.map((prescrit, indexExo) => (
                  <CarteExercice
                    key={`${prescrit.exercice.id}-${indexExo}`}
                    prescrit={prescrit}
                    index={indexExo + 1}
                    onRetirer={() => onRetirerExercice(indexBloc, indexExo)}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* ------------------- Échauffement / étirements ------------------ */}
          <TitreSection>Autour de l'effort</TitreSection>
          <Panneau>
            <Text style={styles.libelleAutour}>🔥 Échauffement</Text>
            <Text style={styles.listeAutour}>
              {seance.echauffement.map((p) => p.exercice.nom).join(' · ')}
            </Text>
            <View style={{ height: espace.m }} />
            <Text style={styles.libelleAutour}>🧘 Retour au calme</Text>
            <Text style={styles.listeAutour}>
              {seance.retourCalme.map((p) => p.exercice.nom).join(' · ')}
            </Text>
          </Panneau>

          <Text style={styles.astuceRetirage}>
            Une carte ne te plaît pas ? Touche le 🎲 à côté pour l'échanger.
          </Text>

          {onChangerCadre ? (
            <Bouton
              titre="Changer le cadre"
              variante="fantome"
              onPress={onChangerCadre}
              style={{ marginTop: espace.l }}
            />
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.barreBasse, { paddingBottom: espace.l }]}>
        <Bouton titre="Re-tirer" icone="🎲" variante="fantome" onPress={onRetirerTout} />
        <View style={{ height: espace.s }} />
        <Bouton titre="C'est parti" onPress={onLancer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.s, lineHeight: 20 },

  etiquetteTirage: { ...texte.section, color: couleurs.accent, marginBottom: espace.s },
  metaLigne: { flexDirection: 'row', gap: espace.s, marginTop: espace.m, flexWrap: 'wrap' },

  expliqueRegle: {
    ...texte.petit,
    color: couleurs.texteDoux,
    lineHeight: 19,
    marginBottom: espace.m,
  },
  expliqueAuto: { color: couleurs.succes, fontWeight: '700' },

  detailBloc: { ...texte.minuscule, color: couleurs.texteFaible },
  noteBoss: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: espace.s, fontStyle: 'italic' },

  libelleAutour: { ...texte.petit, color: couleurs.texte, fontWeight: '700' },
  listeAutour: { ...texte.petit, color: couleurs.texteDoux, marginTop: 4, lineHeight: 19 },

  astuceRetirage: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    textAlign: 'center',
    marginTop: espace.xl,
  },

  barreBasse: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espace.l,
    backgroundColor: couleurs.fond,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
});
