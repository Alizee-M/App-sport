import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, LigneInfo, Panneau, Puce, TitreSection } from '../composants/base';
import { BulleCoach } from '../composants/elements';
import { repliqueCoach } from '../../moteur/coach';
import { creerAlea } from '../../moteur/alea';
import { titrePourNiveau } from '../../moteur/progression';
import { EMOJI_STAT, LIBELLE_STAT, STATS } from '../../moteur/types';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Bilan'>;

/**
 * Le bilan de fin de séance.
 *
 * C'est le moment où le travail devient visible : XP, jauges qui montent,
 * nouvelles cartes débloquées. Une séance abandonnée en route arrive ici
 * aussi — elle affiche ce qui a été fait, jamais ce qui a manqué.
 */
export default function Bilan({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { resultat, titre } = route.params;

  const montaDeNiveau = resultat.niveauApres > resultat.niveauAvant;
  const complet = resultat.ratio >= 0.99;

  const propos = useMemo(() => {
    const alea = creerAlea(Math.round(resultat.xpGagnee * 31 + 7));
    if (resultat.noeudValide?.type === 'boss') return repliqueCoach('boss_vaincu', alea);
    if (montaDeNiveau) return repliqueCoach('niveau_gagne', alea, { niveau: resultat.niveauApres });
    if (!complet) return repliqueCoach('abandon', alea);
    return repliqueCoach('fin_seance', alea);
  }, [resultat, montaDeNiveau, complet]);

  const apparition = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(apparition, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
  }, [apparition]);

  const statsGagnees = STATS.filter((stat) => resultat.gains[stat] > 0);

  return (
    <View style={styles.ecran}>
      <ScrollView
        contentContainerStyle={{
          padding: espace.l,
          paddingTop: insets.top + espace.xl,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: apparition,
            transform: [{ scale: apparition }],
          }}
        >
          <Text style={styles.emojiFin}>
            {resultat.noeudValide?.type === 'boss' ? '👑' : complet ? '🏆' : '👊'}
          </Text>
          <Text style={styles.titre}>{complet ? 'Séance terminée' : 'Séance écourtée'}</Text>
          <Text style={styles.nomSeance}>{titre}</Text>

          <View style={styles.xpBloc}>
            <Text style={styles.xpValeur}>+{resultat.xpGagnee}</Text>
            <Text style={styles.xpLibelle}>XP</Text>
          </View>
        </Animated.View>

        <View style={{ height: espace.l }} />
        <BulleCoach texte={propos} />

        {/* ------------------------ Montée de niveau ---------------------- */}
        {montaDeNiveau ? (
          <>
            <TitreSection>Montée de niveau</TitreSection>
            <Panneau couleurBordure={couleurs.or}>
              <Text style={styles.niveauTexte}>
                Niveau {resultat.niveauAvant} → <Text style={styles.niveauNouveau}>{resultat.niveauApres}</Text>
              </Text>
              <Text style={styles.nouveauTitre}>« {titrePourNiveau(resultat.niveauApres)} »</Text>
            </Panneau>
          </>
        ) : null}

        {/* ---------------------------- Quête ----------------------------- */}
        {resultat.noeudValide ? (
          <>
            <TitreSection>Quête accomplie</TitreSection>
            <Panneau couleurBordure={couleurs.succes}>
              <View style={styles.ligneQuete}>
                <Text style={styles.emojiQuete}>{resultat.noeudValide.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomQuete}>{resultat.noeudValide.nom}</Text>
                  <Text style={styles.bonusQuete}>+{resultat.noeudValide.xpBonus} XP de quête</Text>
                </View>
              </View>
              {resultat.zoneTerminee ? (
                <Text style={styles.zoneFinie}>
                  {resultat.zoneTerminee.emoji} Zone « {resultat.zoneTerminee.nom} » entièrement
                  nettoyée. La suivante t'attend.
                </Text>
              ) : null}
            </Panneau>
          </>
        ) : null}

        {/* -------------------------- Déblocages -------------------------- */}
        {resultat.exercicesDebloques.length > 0 || resultat.modificateursDebloques.length > 0 ? (
          <>
            <TitreSection>Nouveau dans ton deck</TitreSection>
            <Panneau couleurBordure={couleurs.violet}>
              {resultat.exercicesDebloques.map((exercice) => (
                <View key={exercice.id} style={styles.ligneDeblocage}>
                  <Text style={styles.emojiDeblocage}>{exercice.emoji}</Text>
                  <Text style={styles.nomDeblocage}>{exercice.nom}</Text>
                  <Puce couleur={couleurs.texteFaible}>exercice</Puce>
                </View>
              ))}
              {resultat.modificateursDebloques.map((modificateur) => (
                <View key={modificateur.id} style={styles.ligneDeblocage}>
                  <Text style={styles.emojiDeblocage}>{modificateur.emoji}</Text>
                  <Text style={styles.nomDeblocage}>{modificateur.nom}</Text>
                  <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
                    règle
                  </Puce>
                </View>
              ))}
            </Panneau>
          </>
        ) : null}

        {/* ---------------------------- Détail ---------------------------- */}
        <TitreSection>Le détail</TitreSection>
        <Panneau>
          {!complet ? (
            <LigneInfo
              libelle="Part réalisée"
              valeur={`${Math.round(resultat.ratio * 100)} %`}
              couleurValeur={couleurs.texteDoux}
            />
          ) : null}
          {resultat.partBonusSerie > 0 ? (
            <LigneInfo
              libelle={`Bonus de régularité (${resultat.serie} jours)`}
              valeur={`+${resultat.partBonusSerie} XP`}
              couleurValeur={couleurs.succes}
            />
          ) : null}
          {statsGagnees.map((stat) => (
            <LigneInfo
              key={stat}
              libelle={`${EMOJI_STAT[stat]}  ${LIBELLE_STAT[stat]}`}
              valeur={`+${resultat.gains[stat]}`}
              couleurValeur={couleurs.accent}
            />
          ))}
        </Panneau>
      </ScrollView>

      <View style={[styles.barreBasse, { paddingBottom: insets.bottom + espace.l }]}>
        <Bouton
          titre="Retour au camp"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Onglets' }] })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  emojiFin: { fontSize: 60 },
  titre: { ...texte.titre, color: couleurs.texte, marginTop: espace.m },
  nomSeance: { ...texte.corps, color: couleurs.texteDoux, marginTop: 4, textAlign: 'center' },

  xpBloc: { flexDirection: 'row', alignItems: 'baseline', gap: espace.s, marginTop: espace.xl },
  xpValeur: { fontSize: 52, fontWeight: '800', color: couleurs.or },
  xpLibelle: { ...texte.sousTitre, color: couleurs.or },

  niveauTexte: { ...texte.sousTitre, color: couleurs.texte, textAlign: 'center' },
  niveauNouveau: { color: couleurs.or },
  nouveauTitre: {
    ...texte.corps,
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espace.s,
    fontStyle: 'italic',
  },

  ligneQuete: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  emojiQuete: { fontSize: 30 },
  nomQuete: { ...texte.corps, color: couleurs.texte, fontWeight: '800' },
  bonusQuete: { ...texte.petit, color: couleurs.succes, marginTop: 2 },
  zoneFinie: {
    ...texte.petit,
    color: couleurs.texteDoux,
    marginTop: espace.m,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  ligneDeblocage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingVertical: espace.s,
  },
  emojiDeblocage: { fontSize: 22 },
  nomDeblocage: { ...texte.corps, color: couleurs.texte, flex: 1 },

  barreBasse: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: espace.l,
    paddingTop: espace.m,
    backgroundColor: couleurs.fond,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
});
