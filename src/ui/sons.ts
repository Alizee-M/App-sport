import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

/* ----------------------------------------------------------------------
 * Les repères sonores de la séance.
 *
 * Sans eux, il faut regarder l'écran en permanence pour savoir quand
 * changer d'exercice — ce qui est impossible en pleine planche. Les sons
 * se mélangent volontairement à la musique de l'utilisateur au lieu de
 * l'interrompre : on ne coupe pas la playlist de quelqu'un pour un bip.
 * -------------------------------------------------------------------- */

const BIP = require('../../assets/sons/bip.wav');
const DEPART = require('../../assets/sons/depart.wav');
const REPOS = require('../../assets/sons/repos.wav');
const FIN = require('../../assets/sons/fin.wav');

export type Signal = 'bip' | 'depart' | 'repos' | 'fin';

export function useSonsSeance(actif: boolean) {
  const bip = useAudioPlayer(BIP);
  const depart = useAudioPlayer(DEPART);
  const repos = useAudioPlayer(REPOS);
  const fin = useAudioPlayer(FIN);

  useEffect(() => {
    setAudioModeAsync({
      // Les bips passent même téléphone en silencieux : beaucoup de gens
      // le laissent ainsi en permanence, et un décompte muet pendant une
      // planche ne sert à rien. Le réglage de l'app permet de les couper.
      playsInSilentMode: true,
      // La musique en cours n'est pas interrompue : on se glisse par-dessus.
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  const lecteurs = useRef({ bip, depart, repos, fin });
  lecteurs.current = { bip, depart, repos, fin };

  return useCallback(
    (signal: Signal) => {
      if (!actif) return;
      const lecteur = lecteurs.current[signal];
      if (!lecteur) return;
      try {
        // On rembobine : un signal peut être redemandé avant la fin du
        // précédent, et une lecture déjà terminée ne repartirait pas.
        lecteur.seekTo(0).catch(() => {});
        lecteur.play();
      } catch {
        // Un bip raté ne doit jamais interrompre une séance.
      }
    },
    [actif],
  );
}
