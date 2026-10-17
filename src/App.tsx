import { useCallback, useEffect, useState } from 'react';
import type { GameState } from './sim/types';
import { newGame, type NewGameOptions } from './sim/engine';
import { loadGame, loadMeta, recordLife, saveGame, type Meta } from './ui/save';
import { Title } from './ui/Title';
import { Create } from './ui/Create';
import { Game } from './ui/Game';
import { Collection } from './ui/Collection';
import { stopSong, unlock } from './audio/player';

type Screen = 'title' | 'create' | 'game' | 'collection';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [meta, setMeta] = useState<Meta>(() => loadMeta());

  // 첫 터치에서 오디오 잠금 해제 (모바일 자동재생 정책)
  useEffect(() => {
    const h = () => unlock();
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  const update = useCallback((s: GameState) => {
    setGame(s);
    saveGame(s);
    if (s.phase === 'ending') setMeta((m) => recordLife(m, s));
  }, []);

  const start = (o: NewGameOptions) => {
    const s = newGame(o);
    update(s);
    setScreen('game');
  };

  const quit = () => {
    stopSong();
    setScreen('title');
  };

  const reset = () => {
    saveGame(null);
    setGame(null);
    stopSong();
    setScreen('create');
  };

  if (screen === 'create') return <Create onStart={start} onBack={() => setScreen('title')} meta={meta} />;
  if (screen === 'collection') return <Collection meta={meta} onBack={() => setScreen('title')} />;
  if (screen === 'game' && game) return <Game state={game} onChange={update} onQuit={quit} onNewLife={reset} meta={meta} />;
  return (
    <Title
      canContinue={!!game && game.phase !== 'ending'}
      continueLabel={game ? `${game.player.name} · ${Math.max(0, Math.floor(game.time - game.player.birthYear))}세` : ''}
      onContinue={() => setScreen('game')}
      onNew={() => setScreen('create')}
      onCollection={() => setScreen('collection')}
      lives={meta.lives.length}
    />
  );
}
