import React from 'react';
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
  Camp: '🏕️',
  Aventure: '🗺️',
  Defis: '⚡',
  Journal: '📖',
};

const LIBELLES: Record<keyof ParamsOnglets, string> = {
  Camp: 'Camp',
  Aventure: 'Carte',
  Defis: 'Défis',
  Journal: 'Journal',
};

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
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarLabel: LIBELLES[route.name],
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{ICONES[route.name]}</Text>
        ),
      })}
    >
      <Onglets.Screen name="Camp" component={Camp} />
      <Onglets.Screen name="Aventure" component={Aventure} />
      <Onglets.Screen name="Defis" component={Defis} />
      <Onglets.Screen name="Journal" component={Journal} />
    </Onglets.Navigator>
  );
}

export default function App() {
  // On attend la relecture du stockage : sans ça, l'app afficherait une
  // fraction de seconde un héros de niveau 1 avant de retrouver le vrai.
  const hydrate = useJeu((e) => e.hydrate);

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
        </Pile.Navigator>
      </NavigationContainer>
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
});
