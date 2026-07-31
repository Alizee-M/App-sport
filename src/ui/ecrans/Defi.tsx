import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, LigneInfo, Panneau, TitreSection } from '../composants/base';
import { BulleCoach } from '../composants/elements';
import { useJeu, type ResultatDefi } from '../../etat/magasin';
import { DEFIS_PAR_ID, formaterScore, plusGrandEstMeilleur } from '../../moteur/defis';
import { exerciceParId } from '../../moteur/exercices';
import { formaterChrono } from '../../moteur/deroulement';
import { repliqueCoach } from '../../moteur/coach';
import { creerAlea } from '../../moteur/alea';
import { titrePourNiveau } from '../../moteur/progression';
import type { ParamsPile } from '../navigation';

type Props = NativeStackScreenProps<ParamsPile, 'Defi'>;

type Phase = 'presentation' | 'en_cours' | 'resultat';

/**
 * L'exécution d'un défi.
 *
 * Trois façons de compter selon le format : un compteur que l'on
 * incrémente pendant que le temps s'écoule (AMRAP), un chronomètre que
 * l'on arrête en finissant (chrono), ou une tenue de position (max).
 */
export default function Defi({ navigation, route }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const defi = DEFIS_PAR_ID[route.params.defiId];
  const records = useJeu((e) => e.recordsDefis);
  const enregistrerDefi = useJeu((e) => e.enregistrerDefi);

  const [phase, setPhase] = useState<Phase>('presentation');
  const [ecoule, setEcoule] = useState(0);
  const [compteur, setCompteur] = useState(0);
  const [resultat, setResultat] = useState<{ score: number; details: ResultatDefi } | null>(null);

  const debut = useRef(Date.now());
  const compteARebours = defi?.format === 'amrap';
  const ancienRecord = defi ? (records[defi.id] ?? null) : null;

  useEffect(() => {
    if (phase !== 'en_cours') return;
    debut.current = Date.now();
    const identifiant = setInterval(() => {
      setEcoule((Date.now() - debut.current) / 1000);
    }, 100);
    return () => clearInterval(identifiant);
  }, [phase]);

  const conclure = useCallback(
    (score: number) => {
      if (!defi) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const details = enregistrerDefi(defi, score);
      setResultat({ score, details });
      setPhase('resultat');
    },
    [defi, enregistrerDefi],
  );

  // Un AMRAP s'arrête tout seul quand le temps est écoulé.
  useEffect(() => {
    if (phase !== 'en_cours' || !defi || !compteARebours) return;
    if (ecoule >= (defi.dureeSec ?? 0)) conclure(compteur);
  }, [ecoule, phase, defi, compteARebours, compteur, conclure]);

  const propos = useMemo(() => {
    if (!resultat) return '';
    const alea = creerAlea(Math.round(resultat.score * 17 + 3));
    return repliqueCoach(resultat.details.record ? 'record' : 'fin_seance', alea);
  }, [resultat]);

  if (!defi) return <View style={styles.ecran} />;

  const restant = Math.max(0, Math.ceil((defi.dureeSec ?? 0) - ecoule));

  /* ---------------------------- Présentation --------------------------- */
  if (phase === 'presentation') {
    return (
      <ScrollView
        style={styles.ecran}
        contentContainerStyle={{ padding: espace.l, paddingTop: insets.top + espace.xl, paddingBottom: espace.xxl }}
      >
        <Text style={styles.emojiGrand}>{defi.emoji}</Text>
        <Text style={styles.titre}>{defi.nom}</Text>
        <Text style={styles.description}>{defi.description}</Text>

        <TitreSection>Au programme</TitreSection>
        <Panneau>
          {defi.etapes.map((etape, index) => {
            const exercice = exerciceParId(etape.exerciceId);
            return (
              <LigneInfo
                key={`${etape.exerciceId}-${index}`}
                libelle={`${exercice?.emoji ?? ''}  ${exercice?.nom ?? etape.exerciceId}`}
                valeur={etape.reps ? `${etape.reps} reps` : 'à volonté'}
              />
            );
          })}
        </Panneau>

        {ancienRecord !== null ? (
          <>
            <TitreSection>Ton record</TitreSection>
            <Panneau couleurBordure={couleurs.or}>
              <Text style={styles.recordActuel}>{formaterScore(defi, ancienRecord)}</Text>
              <Text style={styles.recordLegende}>
                {plusGrandEstMeilleur(defi) ? 'À dépasser.' : 'À battre, en plus rapide.'}
              </Text>
            </Panneau>
          </>
        ) : null}

        <Text style={styles.consigneFormat}>
          {defi.format === 'amrap'
            ? `Le chrono descend de ${defi.dureeSec} s. Compte chaque ${defi.unite.replace(/s$/, '')} en touchant le grand bouton.`
            : defi.format === 'chrono'
              ? 'Le chrono monte. Touche « Terminé » quand tu as fini le total.'
              : 'Le chrono monte. Touche « J\'ai lâché » quand tu ne tiens plus.'}
        </Text>

        <View style={{ height: espace.xl }} />
        <Bouton
          titre="Lancer le défi"
          icone="🔥"
          onPress={() => {
            setEcoule(0);
            setCompteur(0);
            setPhase('en_cours');
          }}
        />
        <View style={{ height: espace.s }} />
        <Bouton titre="Retour" variante="fantome" onPress={() => navigation.goBack()} />
      </ScrollView>
    );
  }

  /* ------------------------------ En cours ----------------------------- */
  if (phase === 'en_cours') {
    return (
      <View style={[styles.ecran, { paddingTop: insets.top }]}>
        <View style={styles.zoneChrono}>
          <Text style={styles.libelleChrono}>
            {compteARebours ? 'TEMPS RESTANT' : 'TEMPS ÉCOULÉ'}
          </Text>
          <Text
            style={[
              styles.chrono,
              compteARebours && restant <= 10 ? { color: couleurs.danger } : null,
            ]}
          >
            {compteARebours ? formaterChrono(restant) : formaterChrono(ecoule)}
          </Text>

          {compteARebours ? (
            <>
              <Text style={styles.compteur}>{compteur}</Text>
              <Text style={styles.uniteCompteur}>{defi.unite}</Text>
            </>
          ) : null}
        </View>

        {compteARebours ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ajouter un ${defi.unite}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setCompteur((c) => c + 1);
            }}
            style={({ pressed }) => [styles.grosBouton, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.grosBoutonTexte}>+1</Text>
          </Pressable>
        ) : (
          <View style={styles.rappelEtapes}>
            {defi.etapes.map((etape, index) => {
              const exercice = exerciceParId(etape.exerciceId);
              return (
                <Text key={index} style={styles.rappelTexte}>
                  {exercice?.emoji} {etape.reps ? `${etape.reps} × ` : ''}
                  {exercice?.nom}
                </Text>
              );
            })}
          </View>
        )}

        <View style={[styles.barreBasse, { paddingBottom: insets.bottom + espace.l }]}>
          {compteARebours ? (
            <Bouton
              titre="Arrêter maintenant"
              variante="fantome"
              onPress={() => conclure(compteur)}
            />
          ) : (
            <Bouton
              titre={defi.format === 'max' ? 'J\'ai lâché' : 'Terminé !'}
              onPress={() => conclure(Math.round(ecoule))}
            />
          )}
        </View>
      </View>
    );
  }

  /* ------------------------------ Résultat ----------------------------- */
  const details = resultat!.details;
  const montaDeNiveau = details.niveauApres > details.niveauAvant;

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={{ padding: espace.l, paddingTop: insets.top + espace.xl, paddingBottom: espace.xxl }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.emojiGrand}>{details.record ? '🏆' : '💪'}</Text>
        <Text style={styles.titre}>{details.record ? 'Nouveau record !' : 'Défi terminé'}</Text>
        <Text style={styles.scoreFinal}>{formaterScore(defi, resultat!.score)}</Text>
        {details.ancienRecord !== null ? (
          <Text style={styles.ancienRecord}>
            Ancien record : {formaterScore(defi, details.ancienRecord)}
          </Text>
        ) : null}
      </View>

      <View style={{ height: espace.l }} />
      <BulleCoach texte={propos} />

      <TitreSection>Récompense</TitreSection>
      <Panneau>
        <LigneInfo libelle="Expérience" valeur={`+${details.xpGagnee} XP`} couleurValeur={couleurs.or} />
        {details.record ? (
          <LigneInfo libelle="Bonus de record" valeur="×2" couleurValeur={couleurs.succes} />
        ) : null}
        {montaDeNiveau ? (
          <LigneInfo
            libelle="Niveau"
            valeur={`${details.niveauAvant} → ${details.niveauApres}`}
            couleurValeur={couleurs.or}
          />
        ) : null}
      </Panneau>

      {montaDeNiveau ? (
        <Text style={styles.nouveauTitre}>Te voilà « {titrePourNiveau(details.niveauApres)} ».</Text>
      ) : null}

      <View style={{ height: espace.xl }} />
      <Bouton
        titre="Recommencer"
        variante="secondaire"
        onPress={() => {
          setEcoule(0);
          setCompteur(0);
          setResultat(null);
          setPhase('presentation');
        }}
      />
      <View style={{ height: espace.s }} />
      <Bouton titre="Retour aux défis" variante="fantome" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  emojiGrand: { fontSize: 54, textAlign: 'center' },
  titre: { ...texte.titre, color: couleurs.texte, textAlign: 'center', marginTop: espace.m },
  description: {
    ...texte.corps,
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espace.m,
    lineHeight: 22,
  },
  consigneFormat: {
    ...texte.petit,
    color: couleurs.texteFaible,
    textAlign: 'center',
    marginTop: espace.xl,
    lineHeight: 19,
  },

  recordActuel: { ...texte.titre, color: couleurs.or, textAlign: 'center' },
  recordLegende: { ...texte.petit, color: couleurs.texteDoux, textAlign: 'center', marginTop: 4 },

  zoneChrono: { alignItems: 'center', paddingTop: espace.xxl },
  libelleChrono: { ...texte.section, color: couleurs.texteFaible },
  chrono: {
    fontSize: 62,
    fontWeight: '800',
    color: couleurs.texte,
    fontVariant: ['tabular-nums'],
    marginTop: espace.s,
  },
  compteur: { fontSize: 88, fontWeight: '800', color: couleurs.accent, marginTop: espace.l },
  uniteCompteur: { ...texte.corps, color: couleurs.texteDoux },

  grosBouton: {
    flex: 1,
    margin: espace.xl,
    borderRadius: rayon.xl,
    backgroundColor: couleurs.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grosBoutonTexte: { fontSize: 56, fontWeight: '800', color: '#1a1005' },

  rappelEtapes: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: espace.m },
  rappelTexte: { ...texte.sousTitre, color: couleurs.texte },

  barreBasse: {
    paddingHorizontal: espace.l,
    paddingTop: espace.m,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },

  scoreFinal: { fontSize: 46, fontWeight: '800', color: couleurs.or, marginTop: espace.l },
  ancienRecord: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.s },
  nouveauTitre: {
    ...texte.corps,
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espace.m,
    fontStyle: 'italic',
  },
});
