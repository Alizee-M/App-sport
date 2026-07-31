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

## Le Système

L'app se présente comme un « Système » qui t'a sélectionné : rangs **E → S**
au lieu de niveaux nus, fenêtres bleutées, notifications qui s'imposent aux
moments qui comptent. Hommage au genre, pas copie — aucun nom, personnage
ni visuel d'une œuvre existante n'est repris.

- **Quête journalière** tirée par jour calendaire, identique toute la
  journée. L'honorer renforce l'enchaînement ; l'ignorer coûte de l'XP et
  brise la série. La sanction est plafonnée à trois jours et ne fait
  **jamais perdre un rang** : une app qui punit durement fabrique de
  l'évitement, on n'ouvre plus l'app pour ne pas voir la sanction.
- **Points d'attribut** à répartir soi-même à chaque montée de niveau.
  Investir dans une stat rend les séances de cette spécialité plus
  rémunératrices, jusqu'à +30 %.
- **Quêtes de récompense** : tu choisis ce que tu veux débloquer — une
  part de pizza, un burger, une raclette — et le Système calcule l'effort
  réel que ça demande.

### Les calories sont calculées, pas inventées

Méthode MET (*Compendium of Physical Activities*), avec un MET attribué à
chaque exercice selon sa famille et sa difficulté, repos compris :

```
kcal = MET × 3,5 × poids(kg) / 200 × minutes
```

Deux règles que le code applique strictement :

**Sans poids renseigné, aucune calorie n'est affichée.** On ne devine pas,
on demande — et tant qu'on n'a pas la réponse, on n'invente rien.

**Le vrai chiffre, même quand il déplaît.** Une séance de 20 minutes
intense brûle environ 105 kcal pour 70 kg. Un burger en vaut 503. Donc
**un burger, c'est cinq séances**, et l'app l'annonce ainsi : la quête
s'accumule sur plusieurs séances au lieu de prétendre qu'une seule suffit.
Annoncer l'inverse serait mentir d'un facteur cinq.

L'estimation reste juste à ±20-30 % près — c'est la limite de la méthode,
et l'app le dit. Enfin, une récompense se **débloque**, elle ne se
*rembourse* pas : l'app ne dit jamais quoi manger et ne parle jamais de
poids à perdre.

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

### 🤸 Les voies de compétence
Le tirage au sort empêche l'ennui, mais il ne mène nulle part en
particulier. Une **voie** donne une direction : un geste difficile nommé —
tenir en équilibre sur les mains, une pompe sur un bras, un pistol squat,
un L-sit — découpé en paliers qui se franchissent dans l'ordre.

Ce n'est pas un tableau de bord. Tant qu'une voie est active, **le tirage
programme réellement l'exercice du palier en cours** : il sort dans plus de
neuf séances sur dix, et il échappe au filtre de difficulté (on travaille
le geste que la voie impose, même s'il est plus facile que le niveau
atteint). Les exercices de soutien de la voie sont favorisés sans être
imposés.

Un palier ne se valide pas d'un clic. L'app **compte le volume réellement
effectué**, séance après séance ; le test ne s'ouvre qu'une fois la
pratique accumulée (par exemple 300 pompes pike avant d'essayer le poirier
tête au mur). Le test lui-même se valide sur parole — aucun téléphone ne
peut vérifier un équilibre — mais on ne peut pas sauter les marches.

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

Un bouton **+15 s de repos** reste disponible pendant chaque récupération,
autant de fois que nécessaire : une séance plus dure que prévu ne doit pas
obliger à tout arrêter. Ça ne coûte ni XP ni progression.

Le **repos s'ajuste à l'exercice qu'on vient de terminer** : on ne souffle
pas aussi longtemps après des extensions de mollets qu'après des burpees.
Il est redistribué à l'intérieur du bloc plutôt qu'ajouté, si bien que la
séance tient toujours dans le temps annoncé.

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
vérification des types ou les 130 tests échouent : ce qui est publié a donc
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

npm test          # 130 tests sur le moteur de jeu
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
  calories.ts          MET, dépense réelle, catalogue de récompenses
  systeme.ts           rangs E→S, points d'attribut, quête journalière
  competences.ts       voies, paliers, volume pratiqué, pilotage du tirage
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
tests/               130 tests node:test
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
- l'échauffement prépare toujours au moins une zone qui va travailler ;
- le repos qui suit un exercice difficile n'est jamais plus court que
  celui d'un exercice facile du même bloc, et ajuster les repos ne fait
  pas dériver la durée de la séance ;
- les paliers d'une voie vont bien du plus facile au plus difficile, une
  voie active fait sortir son exercice dans au moins 85 % des tirages, et
  cette priorité ne casse aucune contrainte de niveau, matériel ou bruit.
