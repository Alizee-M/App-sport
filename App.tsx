import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { couleurs, texte } from './src/ui/theme';
import { useJeu } from './src/etat/magasin';
import type { ParamsOnglets, ParamsPile } from './src/ui/navigation';

import Camp from './src/ui/ecrans/Camp';
import Aventure from './src/ui/ecrans/Aventure';
import Defis from './src/ui/ecrans/Defis';
import Journal from './src/ui/ecrans/Journal';
import Tirage from './src/ui/ecrans/Tirage';
import Seance from './src/ui/ecrans/Seance';
import Bilan from './src/ui/ecrans/Bilan';
import Defi from './src/ui/ecrans/Defi';
import Recompenses from './src/ui/ecrans/Recompenses';
import Competences from './src/ui/ecrans/Competences';
import { Eveil } from './src/ui/composants/Eveil';
import { NotificationSysteme } from './src/ui/composants/systeme';

const Pile = createNativeStackNavigator<ParamsPile>();
const Onglets = createBottomTabNavigator<ParamsOnglets>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: couleurs.accent,
    background: couleurs.fond,
    card: couleurs.surface,
    text: couleurs.texte,
    border: couleurs.bordure,
  },
};

const ICONES: Record<keyof ParamsOnglets, string> = {
  Camp: '👤',
  Aventure: '🗺️',
  Tirer: '🎲',
  Defis: '⚡',
  Journal: '📖',
};

const LIBELLES: Record<keyof ParamsOnglets, string> = {
  Camp: 'Statut',
  Aventure: 'Donjons',
  Tirer: 'Séance',
  Defis: 'Défis',
  Journal: 'Journal',
};

/**
 * L'onglet central n'affiche jamais rien : son appui est détourné vers
 * l'écran de tirage. C'est le seul moyen d'avoir le bouton « lancer une
 * séance » à portée de pouce depuis les cinq écrans.
 */
function EcranJamaisAffiche() {
  return null;
}

/** Le dé, posé en relief au milieu de la barre. */
function PastilleTirage() {
  return (
    <View style={styles.pastille}>
      <Text style={styles.pastilleDe}>🎲</Text>
    </View>
  );
}

function BarreOnglets() {
  return (
    <Onglets.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: couleurs.accent,
        tabBarInactiveTintColor: couleurs.texteFaible,
        tabBarStyle: {
          backgroundColor: couleurs.surface,
          borderTopColor: couleurs.bordure,
          // La pastille du tirage occupe toute la hauteur utile : la barre
          // est un peu plus haute pour qu'elle ne déborde pas, plutôt que
          // remontée en négatif, ce qu'Android rogne selon les appareils.
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarLabel: LIBELLES[route.name],
        tabBarIcon: ({ focused }: { focused: boolean }) =>
          route.name === 'Tirer' ? (
            <PastilleTirage />
          ) : (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONES[route.name]}</Text>
          ),
      })}
    >
      <Onglets.Screen name="Camp" component={Camp} />
      <Onglets.Screen name="Aventure" component={Aventure} />
      <Onglets.Screen
        name="Tirer"
        component={EcranJamaisAffiche}
        options={{ tabBarLabel: 'Séance', tabBarActiveTintColor: couleurs.accent }}
        listeners={({ navigation }) => ({
          tabPress: (evenement) => {
            // Sans ça, l'onglet afficherait sa page vide avant de naviguer.
            evenement.preventDefault();
            navigation.getParent()?.navigate('Tirage');
          },
        })}
      />
      <Onglets.Screen name="Defis" component={Defis} />
      <Onglets.Screen name="Journal" component={Journal} />
    </Onglets.Navigator>
  );
}

export default function App() {
  // On attend la relecture du stockage : sans ça, l'app afficherait une
  // fraction de seconde un héros de niveau 1 avant de retrouver le vrai.
  const hydrate = useJeu((e) => e.hydrate);
  const eveille = useJeu((e) => e.eveille);
  const marquerEveille = useJeu((e) => e.marquerEveille);
  const verifierPenalites = useJeu((e) => e.verifierPenalites);
  const [penalite, setPenalite] = useState<{ joursManques: number; xpPerdue: number } | null>(null);

  /* Les quêtes journalières manquées se soldent à l'ouverture, une seule
   * fois par jour. La sanction est plafonnée côté moteur : revenir après
   * un mois ne doit pas coûter un mois. */
  useEffect(() => {
    if (!hydrate || !eveille) return;
    const sanction = verifierPenalites();
    if (sanction && sanction.xpPerdue > 0) setPenalite(sanction);
  }, [hydrate, eveille, verifierPenalites]);

  if (!hydrate) {
    return (
      <SafeAreaProvider>
        <View style={styles.chargement}>
          <Text style={styles.logo}>⚔️</Text>
          <Text style={styles.nom}>HÉROS DE SALON</Text>
          <ActivityIndicator color={couleurs.accent} style={{ marginTop: 24 }} />
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (!eveille) {
    return (
      <SafeAreaProvider>
        <Eveil onTermine={marquerEveille} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <Pile.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: couleurs.fond },
            animation: 'slide_from_right',
          }}
        >
          <Pile.Screen name="Onglets" component={BarreOnglets} />
          <Pile.Screen name="Tirage" component={Tirage} />
          <Pile.Screen
            name="Seance"
            component={Seance}
            options={{ gestureEnabled: false, animation: 'fade' }}
          />
          <Pile.Screen
            name="Bilan"
            component={Bilan}
            options={{ gestureEnabled: false, animation: 'fade' }}
          />
          <Pile.Screen name="Defi" component={Defi} />
          <Pile.Screen name="Recompenses" component={Recompenses} />
          <Pile.Screen name="Competences" component={Competences} />
        </Pile.Navigator>
      </NavigationContainer>

      <NotificationSysteme
        visible={penalite !== null}
        titre="Quête journalière manquée"
        lignes={
          penalite
            ? [
                `${penalite.joursManques} jour${penalite.joursManques > 1 ? 's' : ''} sans honorer la quête.`,
                `Pénalité : ${penalite.xpPerdue} XP et enchaînement brisé.`,
                'Ton rang, lui, reste acquis. On reprend aujourd\'hui.',
              ]
            : []
        }
        couleur={couleurs.danger}
        libelleBouton="Je reprends"
        onFermer={() => setPenalite(null)}
      />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  chargement: {
    flex: 1,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 56 },
  nom: { ...texte.section, color: couleurs.accent, marginTop: 16 },

  pastille: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.accent,
    shadowColor: couleurs.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  pastilleDe: { fontSize: 20 },
});
