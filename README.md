# ⚔️ Héros de Salon

Application Android de sport à la maison, pensée contre un problème précis :
**les programmes maison, c'est toujours la même chose, et on s'ennuie.**

Ici, aucune séance n'est écrite à l'avance. Chaque séance est **tirée au
sort** à partir de ce dont tu disposes le jour même (temps, énergie,
matériel, voisins qui dorment), et le jeu s'agrandit à mesure que tu
progresses.

Tout fonctionne **hors ligne**, sans compte et sans serveur : les données
restent sur le téléphone.

---

## Ce qui empêche de s'ennuyer

Quatre mécaniques se combinent, chacune attaquant la lassitude par un
angle différent :

### 🎲 Le tirage
Le contenu de la séance est tiré au hasard, avec une mémoire : les
exercices faits récemment sont fortement défavorisés, ceux jamais tirés
sont favorisés. Deux séances de suite ne se ressemblent pas.

### 🃏 Les cartes « règles du jour »
Vingt cartes changent la *façon* de jouer les mêmes mouvements — tempo
escargot, pyramide, contre la montre, le sol est en lave… Chaque
contrainte acceptée paie en XP, donc c'est un choix, jamais une punition.
Une carte qui ne te plaît pas s'échange.

Chaque carte annonce qui l'applique. Les cartes **⚙️ auto** transforment
réellement la séance : les repos raccourcissent, un tour s'ajoute, le
dernier bloc se joue à l'envers, les répétitions montent tour après tour.
Les cartes **🤝 sur l'honneur** portent sur ta façon de bouger (tempo,
respiration, position des mains) : aucun logiciel ne peut les vérifier.
Cette distinction est affichée parce que sans elle, une carte promettant
un changement que l'écran contredit n'est pas une règle du jeu — c'est un
bug.

### 📈 La progression
La réserve d'exercices **grandit avec ton niveau**, et le bilan de séance
affiche le gain en clair : `47 → 55 exercices que le tirage peut sortir`.
On passe de **19 exercices possibles au niveau 1 à 70 au niveau 25**, et
chaque niveau intermédiaire en débloque au moins un — un palier qui ne
changerait rien au tirage ne serait qu'une félicitation creuse.

C'est la réponse de fond à « c'est toujours pareil » : au niveau 12, le
tirage ne peut littéralement plus produire les séances du niveau 2. Quatre
jauges (Force, Cardio, Souplesse, Gainage) montent selon ce que tu fais
réellement.

### 🗺️ L'aventure
Vingt-quatre étapes réparties en cinq zones, chacune close par un boss
(le Coussin Ancestral, le Réveil de 6h30, le Doute de Novembre…). Ça donne
une raison de s'entraîner *ce soir* plutôt qu'un jour prochain.

### ⚡ Et les défis, qui eux ne changent jamais
Huit épreuves chronométrées à score et record personnel. Ce sont les seuls
repères fixes de l'app : sans repère stable, impossible de constater qu'on
progresse.

Un **coach** commente l'effort du début à la fin. Il a du répondant, mais
il ne culpabilise jamais une absence : quand tu reviens après trois
semaines, il est simplement content.

### Pendant l'effort
Des **repères sonores** décomptent les trois dernières secondes et
signalent chaque changement d'exercice — indispensable quand on est en
planche, le nez au sol. Ils se mêlent à ta musique sans l'interrompre, et
se coupent depuis le Journal.

L'**échauffement et les étirements ciblent les zones réellement
sollicitées** : pas de mobilisation d'épaules avant une séance de jambes.

---

## Installer l'app sur ton téléphone

### ⬇️ [Télécharger la dernière version](https://github.com/Alizee-M/App-sport/releases/latest/download/heros-de-salon.apk)

Ouvre ce lien **depuis le téléphone**, puis l'APK une fois téléchargé.
Android demandera d'autoriser l'installation depuis cette source : c'est
la procédure normale hors Play Store, à accepter une seule fois.

Ce lien ne change jamais : il pointe toujours vers la dernière version
publiée, donc il peut être mis en favori. Les mises à jour s'installent
par-dessus la précédente, sans désinstaller et sans perdre la
progression.

**Comment les versions sont publiées.** Chaque arrivée de code sur `main`
déclenche la compilation. Le workflow refuse de produire un APK si la
vérification des types ou les 88 tests échouent : ce qui est publié a donc
toujours passé ces contrôles. Une release est alors créée
automatiquement, étiquetée avec la version de `app.json`. Republier la
même version met à jour l'APK au lieu d'empiler les entrées ; il suffit
de monter `expo.version` pour créer une nouvelle entrée dans l'historique.

Les builds des autres branches ne publient rien : leur APK reste
disponible en artefact dans l'onglet **Actions**, le temps de tester.

> L'APK est signé avec le keystore de développement fourni par le modèle
> Expo. Il est donc identique d'un build à l'autre, ce qui permet
> d'installer les mises à jour par-dessus sans désinstaller. En revanche,
> il ne conviendrait pas pour une publication sur le Play Store, qui
> demande un keystore personnel.

---

## Développer

```bash
npm install

npm test          # 88 tests sur le moteur de jeu
npm run typecheck # vérification TypeScript
npm start         # serveur de développement Expo
```

Pour compiler l'APK en local, il faut le SDK Android installé :

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

Icônes et sons sont générés par script, sans dépendance graphique ni
fichier audio à licencier :

```bash
node scripts/generer-icones.mjs
node scripts/generer-sons.mjs
```

---

## Organisation du code

Le **moteur de jeu** est du TypeScript pur, sans le moindre import React
Native. C'est délibéré : toute la logique qui décide du contenu d'une
séance est ainsi testable sous `node --test`, sans émulateur.

```
src/moteur/          logique pure, testée (aucune dépendance UI)
  types.ts             vocabulaire du jeu
  alea.ts              hasard reproductible (même graine → même séance)
  exercices.ts         catalogue de 84 exercices
  modificateurs.ts     les 20 cartes « règles du jour »
  seance.ts            le tirage : contraintes, pondérations, dosage
  deroulement.ts       la séance dépliée étape par étape
  progression.ts       XP, niveaux, stats, séries de jours, titres
  aventure.ts          zones, nœuds, boss
  defis.ts             épreuves chronométrées et records
  coach.ts             répliques selon le moment

src/ui/sons.ts       repères sonores de la séance

src/etat/magasin.ts  état persisté sur l'appareil (zustand + AsyncStorage)
src/ui/              thème, composants, écrans
tests/               88 tests node:test
```

### Ce que les tests vérifient

Les garde-fous du tirage passent avant tout le reste :

- une séance tient **toujours** dans le temps annoncé (±20 %) ;
- elle ne propose jamais un exercice au-dessus du niveau atteint, exigeant
  du matériel absent, ou bruyant en mode appartement ;
- une même graine redonne exactement la même séance, ce qui permet
  d'échanger une seule carte sans que le reste bouge ;
- l'historique récent fait bien reculer les exercices déjà faits ;
- une séance tirée pour une étape d'aventure valide toujours cette étape ;
- la durée annoncée égale **toujours** celle du déroulé réel, cartes du
  jour comprises — c'est l'invariant qui empêche l'affichage de mentir ;
- toute carte marquée « appliquée » modifie effectivement la séance, et
  aucune carte de comportement n'y touche ;
- un défi validé sans rien faire ne rapporte aucune XP et ne décroche
  aucun record ;
- l'échauffement prépare toujours au moins une zone qui va travailler.
