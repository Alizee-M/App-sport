import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, Jauge, Panneau, Puce, TitreSection } from '../composants/base';
import { BarresStats, BulleCoach } from '../composants/elements';
import { useJeu, joursDepuisDerniereSeance } from '../../etat/magasin';
import { niveauDepuisXp, titrePourNiveau, prochainTitre, serieAffichee, jourLocal } from '../../moteur/progression';
import { accueilCoach } from '../../moteur/coach';
import { creerAlea } from '../../moteur/alea';
import { avancement } from '../../moteur/aventure';
import { exercicesDisponibles } from '../../moteur/exercices';
import type { ParamsPile } from '../navigation';

/**
 * Le camp de base : ce que l'on voit en ouvrant l'app.
 *
 * Un seul geste doit suffire à lancer une séance. Tout le reste (stats,
 * quête, titres) est là pour donner envie, pas pour être configuré.
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

  const niveau = niveauDepuisXp(xpTotal);
  const serie = serieAffichee(enchainement, jourLocal(new Date()));
  const quete = avancement(noeudsTermines);

  // Une réplique par ouverture d'écran, pas une par re-rendu.
  const propos = useMemo(
    () => accueilCoach(creerAlea(Date.now() % 100000), serie, joursDepuisDerniereSeance(enchainement)),
    [serie, enchainement.dernierJour],
  );

  const tailleDeck = useMemo(
    () =>
      exercicesDisponibles({
        phase: 'bloc',
        niveau: niveau.niveau,
        materielDispo: reglages.materielDispo,
        silencieux: reglages.silencieux,
      }).length,
    [niveau.niveau, reglages.materielDispo, reglages.silencieux],
  );

  const titreSuivant = prochainTitre(niveau.niveau);

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={{ padding: espace.l, paddingTop: insets.top + espace.m, paddingBottom: espace.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* ---------------------------- Héros ---------------------------- */}
      <View style={styles.entete}>
        <View style={{ flex: 1 }}>
          <Text style={styles.surtitre}>HÉROS DE SALON</Text>
          <Text style={styles.titreHeros}>{titrePourNiveau(niveau.niveau)}</Text>
        </View>
        <View style={styles.pastilleNiveau}>
          <Text style={styles.pastilleNiveauChiffre}>{niveau.niveau}</Text>
          <Text style={styles.pastilleNiveauLibelle}>NIV.</Text>
        </View>
      </View>

      <View style={{ marginTop: espace.l }}>
        <Jauge progression={niveau.progression} couleur={couleurs.or} />
        <View style={styles.ligneXp}>
          <Text style={styles.texteXp}>
            {niveau.xpDansNiveau} / {niveau.xpRequisNiveau} XP
          </Text>
          {titreSuivant ? (
            <Text style={styles.texteXpDroite}>
              niveau {titreSuivant.niveau} : {titreSuivant.titre}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ height: espace.l }} />
      <BulleCoach texte={propos} />

      {/* ------------------------- Action centrale --------------------- */}
      <View style={{ height: espace.xl }} />
      <Bouton
        titre="Tirer une séance"
        icone="🎲"
        onPress={() => navigation.navigate('Tirage')}
      />
      <Text style={styles.sousBouton}>
        {tailleDeck} exercices dans ton deck · jamais deux fois la même séance
      </Text>

      {/* ---------------------------- Quête ---------------------------- */}
      {quete.noeudCourant && quete.zoneCourante ? (
        <>
          <TitreSection>Quête en cours</TitreSection>
          <Panneau couleurBordure={quete.zoneCourante.couleur}>
            <View style={styles.ligneQuete}>
              <Text style={styles.emojiQuete}>{quete.noeudCourant.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneQuete}>
                  {quete.zoneCourante.emoji} {quete.zoneCourante.nom}
                </Text>
                <Text style={styles.nomQuete}>{quete.noeudCourant.nom}</Text>
              </View>
              {quete.noeudCourant.type === 'boss' ? (
                <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
                  BOSS
                </Puce>
              ) : null}
            </View>
            <Text style={styles.recitQuete}>{quete.noeudCourant.recit}</Text>
            <Bouton
              titre={quete.noeudCourant.type === 'boss' ? 'Affronter le boss' : 'Partir en quête'}
              variante="secondaire"
              onPress={() =>
                navigation.navigate('Tirage', { noeudId: quete.noeudCourant!.id })
              }
              style={{ marginTop: espace.m }}
            />
          </Panneau>
        </>
      ) : null}

      {/* ---------------------------- Stats ---------------------------- */}
      <TitreSection>Ton personnage</TitreSection>
      <Panneau>
        <BarresStats stats={stats} />
      </Panneau>

      {/* --------------------------- Compteurs ------------------------- */}
      <View style={styles.compteurs}>
        <Compteur emoji="🔥" valeur={String(serie)} libelle={serie > 1 ? 'jours d\'affilée' : 'jour d\'affilée'} />
        <Compteur emoji="🏋️" valeur={String(seancesTerminees)} libelle="séances" />
        <Compteur emoji="🗺️" valeur={`${quete.faits}/${quete.total}`} libelle="étapes" />
      </View>
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
  surtitre: { ...texte.section, color: couleurs.accent },
  titreHeros: { ...texte.titre, color: couleurs.texte, marginTop: 4 },
  pastilleNiveau: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 2,
    borderColor: couleurs.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleNiveauChiffre: { fontSize: 24, fontWeight: '800', color: couleurs.or },
  pastilleNiveauLibelle: { ...texte.minuscule, color: couleurs.texteFaible, fontSize: 9 },

  ligneXp: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espace.s, gap: espace.m },
  texteXp: { ...texte.minuscule, color: couleurs.texteDoux },
  texteXpDroite: { ...texte.minuscule, color: couleurs.texteFaible, flexShrink: 1, textAlign: 'right' },

  sousBouton: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    textAlign: 'center',
    marginTop: espace.m,
  },

  ligneQuete: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  emojiQuete: { fontSize: 30 },
  zoneQuete: { ...texte.minuscule, color: couleurs.texteFaible },
  nomQuete: { ...texte.sousTitre, color: couleurs.texte, marginTop: 2 },
  recitQuete: {
    ...texte.petit,
    color: couleurs.texteDoux,
    fontStyle: 'italic',
    marginTop: espace.m,
    lineHeight: 19,
  },

  compteurs: { flexDirection: 'row', gap: espace.m, marginTop: espace.l },
  compteur: {
    flex: 1,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingVertical: espace.l,
    alignItems: 'center',
  },
  compteurEmoji: { fontSize: 20 },
  compteurValeur: { ...texte.sousTitre, color: couleurs.texte, marginTop: 4 },
  compteurLibelle: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 2, textAlign: 'center' },
});
