import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Bouton, EtatVide, LigneInfo, Panneau, Puce, TitreSection } from '../composants/base';
import { Bascule } from '../composants/elements';
import { useJeu } from '../../etat/magasin';
import { niveauDepuisXp, statDominante, titrePourNiveau } from '../../moteur/progression';
import { EMOJI_STAT, LIBELLE_STAT } from '../../moteur/types';
import { NIVEAU_DERNIER_DEBLOCAGE } from '../../moteur/exercices';
import type { EntreeJournal } from '../../etat/magasin';
import type { ParamsPile } from '../navigation';

/** Journal des séances : la preuve, jour après jour, que ça a bien eu lieu. */
export default function Journal() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ParamsPile>>();

  const journal = useJeu((e) => e.journal);
  const xpTotal = useJeu((e) => e.xpTotal);
  const stats = useJeu((e) => e.stats);
  const seancesTerminees = useJeu((e) => e.seancesTerminees);
  const reglages = useJeu((e) => e.reglages);
  const majReglages = useJeu((e) => e.majReglages);
  const toutEffacer = useJeu((e) => e.toutEffacer);

  const niveau = niveauDepuisXp(xpTotal);
  const dominante = statDominante(stats);
  const tempsTotal = journal.reduce((total, e) => total + e.dureeSec, 0);

  const confirmerRemiseAZero = () =>
    Alert.alert(
      'Tout effacer ?',
      'Niveau, records, carte d\'aventure et journal seront perdus. C\'est définitif.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout effacer', style: 'destructive', onPress: toutEffacer },
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
      <Text style={styles.titre}>Journal</Text>

      <TitreSection>Bilan général</TitreSection>
      <Panneau>
        <LigneInfo libelle="Titre" valeur={titrePourNiveau(niveau.niveau)} />
        <LigneInfo libelle="Niveau" valeur={String(niveau.niveau)} couleurValeur={couleurs.or} />
        <LigneInfo libelle="Expérience totale" valeur={`${xpTotal} XP`} />
        <LigneInfo libelle="Séances terminées" valeur={String(seancesTerminees)} />
        <LigneInfo
          libelle="Temps d'entraînement"
          valeur={`${Math.round(tempsTotal / 60)} min`}
        />
        <LigneInfo
          libelle="Point fort"
          valeur={`${EMOJI_STAT[dominante]} ${LIBELLE_STAT[dominante]}`}
          couleurValeur={couleurs.accent}
        />
      </Panneau>

      {niveau.niveau < NIVEAU_DERNIER_DEBLOCAGE ? (
        <Text style={styles.notePlusTard}>
          De nouveaux exercices et de nouvelles règles se débloquent jusqu'au niveau{' '}
          {NIVEAU_DERNIER_DEBLOCAGE}.
        </Text>
      ) : null}

      <TitreSection>Réglages</TitreSection>
      <Panneau>
        <LigneInfo
          libelle="Poids (pour l'estimation des calories)"
          valeur={reglages.poidsKg ? `${reglages.poidsKg} kg` : 'non renseigné'}
          couleurValeur={reglages.poidsKg ? couleurs.accent : couleurs.texteFaible}
        />
        <Bouton
          titre={reglages.poidsKg ? 'Modifier le poids' : 'Renseigner mon poids'}
          variante="fantome"
          onPress={() => navigation.navigate('Recompenses')}
          style={{ marginTop: espace.s, marginBottom: espace.m }}
        />
        <Bascule
          titre="Sons pendant la séance"
          description="Décompte des trois dernières secondes et signal au changement d'exercice. Ils se mêlent à ta musique sans la couper."
          actif={reglages.sons}
          onChange={(sons) => majReglages({ sons })}
        />
      </Panneau>

      <TitreSection>Historique</TitreSection>
      {journal.length === 0 ? (
        <EtatVide
          emoji="📖"
          titre="Rien pour l'instant"
          texte="Ta première séance apparaîtra ici. Et la deuxième. Et la centième."
        />
      ) : (
        <View style={{ gap: espace.s }}>
          {journal.map((entree) => (
            <LigneJournal key={entree.id} entree={entree} />
          ))}
        </View>
      )}

      <TitreSection>Zone dangereuse</TitreSection>
      <Bouton titre="Tout effacer" variante="danger" onPress={confirmerRemiseAZero} />
      <Text style={styles.noteDonnees}>
        Tout est enregistré uniquement sur ce téléphone. Aucun compte, aucun serveur.
      </Text>
    </ScrollView>
  );
}

function LigneJournal({ entree }: { entree: EntreeJournal }) {
  const date = new Date(entree.date);
  const quand = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.entree}>
      <Text style={styles.entreeEmoji}>
        {entree.defi ? '⚡' : entree.type === 'boss' ? '👹' : entree.type === 'aventure' ? '🗺️' : '🎲'}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.entreeTitre} numberOfLines={1}>
          {entree.titre}
        </Text>
        <Text style={styles.entreeMeta}>
          {quand} · {Math.round(entree.dureeSec / 60)} min
          {entree.score ? ` · ${entree.score}` : ''}
          {entree.ratio < 0.99 ? ` · ${Math.round(entree.ratio * 100)} %` : ''}
        </Text>
      </View>
      {entree.record ? (
        <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
          RECORD
        </Puce>
      ) : null}
      <Text style={styles.entreeXp}>+{entree.xp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },

  notePlusTard: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    marginTop: espace.m,
    lineHeight: 16,
  },

  entree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingVertical: espace.m,
    paddingHorizontal: espace.l,
  },
  entreeEmoji: { fontSize: 20 },
  entreeTitre: { ...texte.corps, color: couleurs.texte, fontWeight: '700' },
  entreeMeta: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 3 },
  entreeXp: { ...texte.petit, color: couleurs.or, fontWeight: '800' },

  noteDonnees: {
    ...texte.minuscule,
    color: couleurs.texteFaible,
    textAlign: 'center',
    marginTop: espace.m,
    lineHeight: 16,
  },
});
