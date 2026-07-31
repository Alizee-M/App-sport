import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, Jauge, Puce } from '../composants/base';
import { BarresStats, BulleCoach } from '../composants/elements';
import {
  BoutonPoint,
  Ecusson,
  FenetreSysteme,
  LigneSysteme,
  NotificationSysteme,
} from '../composants/systeme';
import { useJeu, joursDepuisDerniereSeance } from '../../etat/magasin';
import { niveauDepuisXp, serieAffichee, jourLocal } from '../../moteur/progression';
import { accueilCoach } from '../../moteur/coach';
import { creerAlea } from '../../moteur/alea';
import { avancement } from '../../moteur/aventure';
import {
  palierPourNiveau,
  prochainPalier,
  queteJournaliere,
  totalPoints,
} from '../../moteur/systeme';
import {
  progressionQuete,
  kcalRestantes,
  seancesRestantes,
  recompenseParId,
  caloriesSeance,
} from '../../moteur/calories';
import {
  voieParId,
  palierCourant,
  partPratique,
  progressionVoie,
} from '../../moteur/competences';
import { exerciceParId } from '../../moteur/exercices';
import { genererSeance } from '../../moteur/seance';
import { EMOJI_STAT, LIBELLE_STAT, STATS } from '../../moteur/types';
import type { ParamsPile } from '../navigation';

/**
 * L'écran de statut : la fiche du chasseur.
 *
 * Un seul geste doit suffire à lancer une séance. Tout le reste — rang,
 * points, quêtes — est là pour donner envie, pas pour être configuré.
 */
export default function Camp() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ParamsPile>>();

  const xpTotal = useJeu((e) => e.xpTotal);
  const stats = useJeu((e) => e.stats);
  const enchainement = useJeu((e) => e.enchainement);
  const noeudsTermines = useJeu((e) => e.noeudsTermines);
  const seancesTerminees = useJeu((e) => e.seancesTerminees);
  const reglages = useJeu((e) => e.reglages);
  const pointsDisponibles = useJeu((e) => e.pointsDisponibles);
  const pointsAlloues = useJeu((e) => e.pointsAlloues);
  const allouerPoint = useJeu((e) => e.allouerPoint);
  const quete = useJeu((e) => e.queteRecompense);
  const voieActive = useJeu((e) => e.voieActive);
  const paliersValides = useJeu((e) => e.paliersValides);
  const volumes = useJeu((e) => e.volumes);
  const joursQueteFaite = useJeu((e) => e.joursQueteFaite);
  const validerQuete = useJeu((e) => e.validerQueteJournaliere);

  const niveau = niveauDepuisXp(xpTotal);
  const palier = palierPourNiveau(niveau.niveau);
  const suivant = prochainPalier(niveau.niveau);
  const serie = serieAffichee(enchainement, jourLocal(new Date()));
  const aventure = avancement(noeudsTermines);
  const aujourdhui = jourLocal(new Date());

  const [notification, setNotification] = useState<string | null>(null);

  const propos = useMemo(
    () => accueilCoach(creerAlea(Date.now() % 100000), serie, joursDepuisDerniereSeance(enchainement)),
    [serie, enchainement.dernierJour],
  );

  const journaliere = useMemo(
    () => queteJournaliere(aujourdhui, niveau.niveau, reglages.materielDispo, reglages.silencieux),
    [aujourdhui, niveau.niveau, reglages.materielDispo, reglages.silencieux],
  );
  const journaliereFaite = joursQueteFaite.includes(aujourdhui);

  /* Dépense d'une séance type, pour traduire une quête en nombre de
   * séances plutôt qu'en calories abstraites. */
  const kcalParSeance = useMemo(() => {
    if (!reglages.poidsKg) return 0;
    const type = genererSeance({
      dureeMin: reglages.dureeMin,
      intensite: reglages.intensite,
      focus: reglages.focus,
      materielDispo: reglages.materielDispo,
      silencieux: reglages.silencieux,
      niveau: niveau.niveau,
      historiqueIds: [],
      seed: 1,
      nbModificateurs: 0,
    });
    return caloriesSeance(type, reglages.poidsKg);
  }, [reglages, niveau.niveau]);

  const recompense = quete ? recompenseParId(quete.recompenseId) : undefined;

  const voie = voieActive ? voieParId(voieActive) : undefined;
  const palierEnCours = voie ? palierCourant(voie, paliersValides) : null;
  const exercicePalier = palierEnCours ? exerciceParId(palierEnCours.exerciceId) : undefined;
  const pratique = palierEnCours ? partPratique(palierEnCours, volumes) : 0;

  const confirmerQuete = () =>
    Alert.alert(
      'Quête journalière accomplie ?',
      'Le Système te croit sur parole. Valide seulement si tu l\'as réellement faite.',
      [
        { text: 'Pas encore', style: 'cancel' },
        {
          text: 'C\'est fait',
          onPress: () => {
            validerQuete();
            setNotification(`Quête journalière validée. +${journaliere.xpRecompense} XP.`);
          },
        },
      ],
    );

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
      {/* ---------------------------- Le chasseur --------------------------- */}
      <View style={styles.entete}>
        <Ecusson rang={palier.rang} couleur={palier.couleur} />
        <View style={{ flex: 1 }}>
          <Text style={styles.surtitre}>STATUT</Text>
          <Text style={[styles.titreHeros, { color: palier.couleur }]}>{palier.titre}</Text>
          <Text style={styles.niveauTexte}>Niveau {niveau.niveau}</Text>
        </View>
      </View>

      <View style={{ marginTop: espace.l }}>
        <Jauge progression={niveau.progression} couleur={couleurs.accent} />
        <View style={styles.ligneXp}>
          <Text style={styles.texteXp}>
            {niveau.xpDansNiveau} / {niveau.xpRequisNiveau} XP
          </Text>
          {suivant ? (
            <Text style={styles.texteXpDroite}>
              rang {suivant.rang} au niveau {suivant.niveauMin}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ height: espace.l }} />
      <BulleCoach texte={propos} />

      <View style={{ height: espace.xl }} />
      <Bouton titre="Tirer une séance" icone="🎲" onPress={() => navigation.navigate('Tirage')} />

      {/* ------------------------- Quête journalière ------------------------ */}
      <View style={{ height: espace.xl }} />
      <FenetreSysteme
        titre="Quête journalière"
        couleur={journaliereFaite ? couleurs.succes : couleurs.accent}
      >
        {journaliereFaite ? (
          <Text style={styles.queteFaite}>
            ✅ Accomplie aujourd'hui. Le Système est satisfait.
          </Text>
        ) : (
          <>
            {journaliere.lignes.map((ligne) => (
              <LigneSysteme
                key={ligne.exerciceId}
                libelle={`${ligne.emoji}  ${ligne.nom}`}
                valeur={
                  ligne.unite === 'reps' ? `${ligne.objectif}` : `${ligne.objectif} s`
                }
                couleurValeur={couleurs.accent}
              />
            ))}
            <Text style={styles.avertissementQuete}>
              À faire dans la journée, en une ou plusieurs fois. Ne pas l'honorer brise
              l'enchaînement et coûte un peu d'expérience.
            </Text>
            <Bouton
              titre={`Valider · +${journaliere.xpRecompense} XP`}
              variante="secondaire"
              onPress={confirmerQuete}
              style={{ marginTop: espace.m }}
            />
          </>
        )}
      </FenetreSysteme>

      {/* -------------------------- Quête récompense ------------------------ */}
      <View style={{ height: espace.m }} />
      <FenetreSysteme titre="Quête de récompense" couleur={couleurs.or}>
        {quete && recompense ? (
          <>
            <View style={styles.ligneRecompense}>
              <Text style={styles.emojiRecompense}>{recompense.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomRecompense}>{recompense.nom}</Text>
                <Text style={styles.detailRecompense}>
                  {recompense.kcal} kcal à dépenser
                </Text>
              </View>
              <Text style={styles.pourcentRecompense}>
                {Math.round(progressionQuete(quete) * 100)} %
              </Text>
            </View>

            <View style={{ marginTop: espace.m }}>
              <Jauge progression={progressionQuete(quete)} couleur={couleurs.or} />
            </View>

            <Text style={styles.resteRecompense}>
              {progressionQuete(quete) >= 1
                ? 'Objectif atteint. Va la réclamer.'
                : kcalParSeance > 0
                  ? `Encore ${kcalRestantes(quete)} kcal, soit environ ${seancesRestantes(quete, kcalParSeance)} séance(s).`
                  : `Encore ${kcalRestantes(quete)} kcal.`}
            </Text>

            <Bouton
              titre={progressionQuete(quete) >= 1 ? 'Réclamer la récompense' : 'Voir les récompenses'}
              variante={progressionQuete(quete) >= 1 ? 'principal' : 'fantome'}
              onPress={() => navigation.navigate('Recompenses')}
              style={{ marginTop: espace.m }}
            />
          </>
        ) : (
          <>
            <Text style={styles.sansQuete}>
              Choisis ce que tu veux débloquer. Le Système calculera l'effort exact que ça
              demande — et il ne trichera pas sur le chiffre.
            </Text>
            <Bouton
              titre="Choisir une récompense"
              variante="secondaire"
              onPress={() => navigation.navigate('Recompenses')}
              style={{ marginTop: espace.m }}
            />
          </>
        )}
      </FenetreSysteme>

      {/* ------------------------- Voie de compétence ----------------------- */}
      <View style={{ height: espace.m }} />
      <FenetreSysteme titre="Voie de compétence" couleur={couleurs.accent}>
        {voie && palierEnCours ? (
          <>
            <View style={styles.ligneRecompense}>
              <Text style={styles.emojiRecompense}>{voie.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomRecompense}>{exercicePalier?.nom ?? voie.nom}</Text>
                <Text style={styles.detailRecompense}>{voie.nom}</Text>
              </View>
              <Text style={styles.pourcentRecompense}>
                {Math.round(progressionVoie(voie, paliersValides) * 100)} %
              </Text>
            </View>

            <View style={{ marginTop: espace.m }}>
              <Jauge progression={pratique} couleur={pratique >= 1 ? couleurs.succes : couleurs.accent} />
            </View>

            <Text style={styles.resteRecompense}>
              {pratique >= 1
                ? 'Pratique suffisante : le test du palier est ouvert.'
                : `Pratique du palier : ${Math.round(pratique * 100)} %. Tes séances travaillent ce geste.`}
            </Text>

            <Bouton
              titre={pratique >= 1 ? 'Passer le test' : 'Voir la voie'}
              variante={pratique >= 1 ? 'principal' : 'fantome'}
              onPress={() => navigation.navigate('Competences')}
              style={{ marginTop: espace.m }}
            />
          </>
        ) : (
          <>
            <Text style={styles.sansQuete}>
              {voie
                ? 'Voie achevée. Choisis-en une nouvelle : le tirage programmera les exercices qui y mènent.'
                : 'Vise un geste précis — tenir sur les mains, une pompe sur un bras. Le tirage placera alors dans tes séances les exercices qui y mènent, dans l\'ordre.'}
            </Text>
            <Bouton
              titre="Choisir une voie"
              variante="secondaire"
              onPress={() => navigation.navigate('Competences')}
              style={{ marginTop: espace.m }}
            />
          </>
        )}
      </FenetreSysteme>

      {/* ------------------------------ Statut ------------------------------ */}
      <View style={{ height: espace.m }} />
      <FenetreSysteme
        titre={pointsDisponibles > 0 ? `Points à répartir · ${pointsDisponibles}` : 'Attributs'}
        couleur={pointsDisponibles > 0 ? couleurs.or : couleurs.bordure}
        discrete={pointsDisponibles === 0}
      >
        {pointsDisponibles > 0 ? (
          <Text style={styles.explicationPoints}>
            Chaque point investi rend les séances de cette spécialité plus rémunératrices,
            jusqu'à +30 %.
          </Text>
        ) : null}

        {STATS.map((stat) => (
          <LigneSysteme
            key={stat}
            libelle={`${EMOJI_STAT[stat]}  ${LIBELLE_STAT[stat]}`}
            valeur={
              pointsAlloues[stat] > 0
                ? `${Math.round(stats[stat])} (+${pointsAlloues[stat]})`
                : `${Math.round(stats[stat])}`
            }
            couleurValeur={pointsAlloues[stat] > 0 ? couleurs.or : couleurs.texte}
            action={
              <BoutonPoint actif={pointsDisponibles > 0} onPress={() => allouerPoint(stat)} />
            }
          />
        ))}

        <View style={{ height: espace.m }} />
        <BarresStats stats={stats} />
      </FenetreSysteme>

      {/* ------------------------------ Aventure ---------------------------- */}
      {aventure.noeudCourant && aventure.zoneCourante ? (
        <>
          <View style={{ height: espace.m }} />
          <FenetreSysteme titre="Donjon en cours" couleur={aventure.zoneCourante.couleur}>
            <View style={styles.ligneRecompense}>
              <Text style={styles.emojiRecompense}>{aventure.noeudCourant.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomRecompense}>{aventure.noeudCourant.nom}</Text>
                <Text style={styles.detailRecompense}>{aventure.zoneCourante.nom}</Text>
              </View>
              {aventure.noeudCourant.type === 'boss' ? (
                <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
                  BOSS
                </Puce>
              ) : null}
            </View>
            <Bouton
              titre={aventure.noeudCourant.type === 'boss' ? 'Affronter le boss' : 'Y aller'}
              variante="fantome"
              onPress={() => navigation.navigate('Tirage', { noeudId: aventure.noeudCourant!.id })}
              style={{ marginTop: espace.m }}
            />
          </FenetreSysteme>
        </>
      ) : null}

      {/* ----------------------------- Compteurs ---------------------------- */}
      <View style={styles.compteurs}>
        <Compteur emoji="🔥" valeur={String(serie)} libelle={serie > 1 ? 'jours de suite' : 'jour de suite'} />
        <Compteur emoji="⚔️" valeur={String(seancesTerminees)} libelle="séances" />
        <Compteur emoji="🗺️" valeur={`${aventure.faits}/${aventure.total}`} libelle="donjons" />
      </View>

      <NotificationSysteme
        visible={notification !== null}
        titre="Quête accomplie"
        lignes={notification ? [notification] : []}
        couleur={couleurs.succes}
        onFermer={() => setNotification(null)}
      />
    </ScrollView>
  );
}

function Compteur({ emoji, valeur, libelle }: { emoji: string; valeur: string; libelle: string }) {
  return (
    <View style={styles.compteur}>
      <Text style={styles.compteurEmoji}>{emoji}</Text>
      <Text style={styles.compteurValeur}>{valeur}</Text>
      <Text style={styles.compteurLibelle}>{libelle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.l },
  surtitre: { ...texte.section, color: couleurs.texteFaible, fontSize: 10 },
  titreHeros: { ...texte.sousTitre, marginTop: 2 },
  niveauTexte: { ...texte.petit, color: couleurs.texteDoux, marginTop: 2 },

  ligneXp: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espace.s, gap: espace.m },
  texteXp: { ...texte.minuscule, color: couleurs.texteDoux },
  texteXpDroite: { ...texte.minuscule, color: couleurs.texteFaible, flexShrink: 1, textAlign: 'right' },

  queteFaite: { ...texte.corps, color: couleurs.succes, textAlign: 'center' },
  avertissementQuete: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.m,
    lineHeight: 16,
  },

  ligneRecompense: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  emojiRecompense: { fontSize: 30 },
  nomRecompense: { ...texte.corps, color: couleurs.texte, fontWeight: '800' },
  detailRecompense: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 2 },
  pourcentRecompense: { ...texte.sousTitre, color: couleurs.or },
  resteRecompense: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.m, lineHeight: 19 },
  sansQuete: { ...texte.petit, color: couleurs.texteDoux, lineHeight: 20 },

  explicationPoints: {
    ...texte.minuscule,
    color: couleurs.or,
    marginBottom: espace.m,
    lineHeight: 16,
  },

  compteurs: { flexDirection: 'row', gap: espace.m, marginTop: espace.l },
  compteur: {
    flex: 1,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.s,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingVertical: espace.l,
    alignItems: 'center',
  },
  compteurEmoji: { fontSize: 20 },
  compteurValeur: { ...texte.sousTitre, color: couleurs.texte, marginTop: 4 },
  compteurLibelle: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 2, textAlign: 'center' },
});
