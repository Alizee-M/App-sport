import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { couleurs, espace, rayon, texte } from '../theme';
import { Jauge, Panneau, Puce, TitreSection } from '../composants/base';
import { useJeu } from '../../etat/magasin';
import { niveauDepuisXp } from '../../moteur/progression';
import { ZONES, avancement, noeudCourant, zoneDebloquee, type Noeud, type Zone } from '../../moteur/aventure';
import { LIBELLE_FOCUS, LIBELLE_INTENSITE } from '../../moteur/types';
import type { ParamsPile } from '../navigation';

/**
 * La carte d'aventure.
 *
 * Elle sert surtout à répondre à « pourquoi je m'entraîne ce soir » :
 * il y a une étape juste devant, avec un nom, et un boss au bout.
 */
export default function Aventure() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ParamsPile>>();

  const noeudsTermines = useJeu((e) => e.noeudsTermines);
  const xpTotal = useJeu((e) => e.xpTotal);

  const niveau = niveauDepuisXp(xpTotal).niveau;
  const etat = avancement(noeudsTermines);
  const courant = noeudCourant(noeudsTermines);

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
      <Text style={styles.titre}>Les portails</Text>
      <Text style={styles.sousTitre}>
        {etat.faits} salles nettoyées sur {etat.total}
      </Text>
      <Text style={styles.explication}>
        Les donjons sont classés du rang E au rang S, comme toi. Tu peux en tenter un
        au-dessus de ton rang : c'est déconseillé, jamais interdit.
      </Text>
      <View style={{ marginTop: espace.m }}>
        <Jauge progression={etat.progression} couleur={couleurs.succes} />
      </View>

      {ZONES.map((zone) => {
        const ouverte = zoneDebloquee(zone, noeudsTermines);
        const finie = zone.noeuds.every((n) => noeudsTermines.includes(n.id));

        return (
          <View key={zone.id}>
            <TitreSection
              action={
                <Puce couleur={zone.couleur} fond={`${zone.couleur}22`}>
                  {`RANG ${zone.rang}`}
                </Puce>
              }
            >
              {`${zone.emoji} ${zone.nom}`}
            </TitreSection>

            {!ouverte ? (
              <Panneau style={styles.zoneFermee}>
                <Text style={styles.texteFerme}>
                  🔒 Le portail précédent doit être refermé avant que celui-ci s'ouvre.
                </Text>
              </Panneau>
            ) : (
              <>
                <Text style={styles.introZone}>{zone.intro}</Text>
                {finie ? (
                  <View style={styles.bandeauFinie}>
                    <Text style={styles.texteFinie}>✅ Portail refermé</Text>
                  </View>
                ) : null}

                <View style={{ gap: espace.s, marginTop: espace.m }}>
                  {zone.noeuds.map((noeud) => (
                    <LigneNoeud
                      key={noeud.id}
                      noeud={noeud}
                      zone={zone}
                      termine={noeudsTermines.includes(noeud.id)}
                      courant={courant?.id === noeud.id}
                      niveau={niveau}
                      onPress={() => navigation.navigate('Tirage', { noeudId: noeud.id })}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        );
      })}

      {!courant ? (
        <Panneau style={{ marginTop: espace.xl }} couleurBordure={couleurs.or}>
          <Text style={styles.finAventure}>
            🏅 Tous les portails sont refermés, jusqu'au rang S. Les séances libres, les
            voies de compétence et les défis, eux, continuent de compter.
          </Text>
        </Panneau>
      ) : null}
    </ScrollView>
  );
}

function LigneNoeud({
  noeud,
  zone,
  termine,
  courant,
  niveau,
  onPress,
}: {
  noeud: Noeud;
  zone: Zone;
  termine: boolean;
  courant: boolean;
  niveau: number;
  onPress: () => void;
}) {
  const estBoss = noeud.type === 'boss';
  const jouable = courant;

  const exigences = [
    `${noeud.exigence.dureeMin} min`,
    LIBELLE_INTENSITE[noeud.exigence.intensiteMin],
    noeud.exigence.focus ? LIBELLE_FOCUS[noeud.exigence.focus] : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !jouable }}
      disabled={!jouable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.noeud,
        termine && styles.noeudTermine,
        courant && { borderColor: zone.couleur, borderWidth: 2 },
        estBoss && !termine && styles.noeudBoss,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.noeudEmoji, termine && { opacity: 0.5 }]}>
        {termine ? '✅' : noeud.emoji}
      </Text>

      <View style={{ flex: 1 }}>
        <View style={styles.noeudEntete}>
          <Text
            style={[
              styles.noeudNom,
              termine && styles.noeudNomTermine,
              estBoss && !termine && { color: couleurs.or },
            ]}
            numberOfLines={2}
          >
            {noeud.nom}
          </Text>
          {estBoss && !termine ? (
            <Puce couleur={couleurs.or} fond="rgba(255,200,87,0.15)">
              BOSS
            </Puce>
          ) : null}
        </View>

        {!termine ? (
          <>
            <Text style={styles.noeudExigence}>{exigences.join(' · ')}</Text>
            {courant ? (
              <Text style={[styles.noeudAppel, { color: zone.couleur }]}>
                {niveau < zone.niveauConseille
                  ? `Donjon de rang ${zone.rang}, conseillé à partir du niveau ${zone.niveauConseille}. Tu peux entrer quand même.`
                  : 'Touche pour tirer la séance de cette salle.'}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  titre: { ...texte.titre, color: couleurs.texte },
  sousTitre: { ...texte.petit, color: couleurs.texteDoux, marginTop: espace.xs },
  explication: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: espace.s, lineHeight: 16 },

  introZone: { ...texte.petit, color: couleurs.texteDoux, fontStyle: 'italic', lineHeight: 19 },
  zoneFermee: { alignItems: 'center' },
  texteFerme: { ...texte.petit, color: couleurs.texteFaible },

  bandeauFinie: {
    marginTop: espace.m,
    backgroundColor: 'rgba(61,220,151,0.12)',
    borderRadius: rayon.s,
    paddingVertical: espace.s,
    paddingHorizontal: espace.m,
    alignSelf: 'flex-start',
  },
  texteFinie: { ...texte.minuscule, color: couleurs.succes },

  noeud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.m,
  },
  noeudTermine: { opacity: 0.6 },
  noeudBoss: { backgroundColor: 'rgba(255,200,87,0.06)' },
  noeudEmoji: { fontSize: 26 },
  noeudEntete: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  noeudNom: { ...texte.corps, color: couleurs.texte, fontWeight: '700', flexShrink: 1 },
  noeudNomTermine: { textDecorationLine: 'line-through', color: couleurs.texteFaible },
  noeudExigence: { ...texte.minuscule, color: couleurs.texteFaible, marginTop: 3 },
  noeudAppel: { ...texte.minuscule, marginTop: 5, lineHeight: 16 },

  finAventure: { ...texte.corps, color: couleurs.texte, lineHeight: 22, textAlign: 'center' },
});
