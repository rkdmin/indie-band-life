import { useCallback, useEffect, useState } from 'react';
import type { CountryId } from './sim/data/countries';
import type { GameState } from './sim/types';
import { newGame, popCine, type NewGameOptions } from './sim/engine';
import { pickLegacy } from './sim/legacy';
import { loadGame, loadMeta, recordLife, saveGame, type Meta } from './ui/save';
import { Title, rollOptions, type BornSettings } from './ui/Title';
import { BirthCert } from './ui/BirthCert';
import { Life } from './ui/Life';
import { Ending } from './ui/Ending';
import { Collection } from './ui/Collection';
import { Cinematic } from './ui/Cinematic';
import { stopSong, unlock } from './audio/player';
import { useBackButton } from './platform';

type Screen = 'title' | 'cert' | 'life' | 'collection';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [meta, setMeta] = useState<Meta>(() => loadMeta());
  const [lastOpts, setLastOpts] = useState<{ o: NewGameOptions; pace: number; set: BornSettings } | null>(null);

  // 화면이 바뀌면 맨 위에서 시작한다 — 아래쪽 버튼을 누르고 넘어가면 다음 화면이 중간부터 보이던 문제
  const ended = game?.phase === 'ending';
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, game?.id, ended]);
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // 첫 터치에서 오디오 잠금 해제 (모바일 자동재생 정책)
  useEffect(() => {
    const h = () => unlock();
    window.addEventListener('pointerdown', h, { once: true });
    try {
      if (localStorage.getItem('ibl.calm') === '1') document.documentElement.classList.add('calm');
    } catch {
      /* 무시 */
    }
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  const update = useCallback((s: GameState) => {
    setGame(s);
    saveGame(s);
    if (s.phase === 'ending') setMeta((m) => recordLife(m, s));
  }, []);

  const born = (o: NewGameOptions, pace: number, set: BornSettings) => {
    const s = newGame(o);
    s.flags.pace = pace;
    // 지난 인생들이 이번 인생에 끼어든다 (라디오·선배 밴드·라이벌 — sim/legacy.ts). 출생은 바꾸지 않는다
    s.legacy = pickLegacy(meta.lives.map((l) => l.legacy));
    setLastOpts({ o, pace, set });
    update(s);
    setScreen('cert');
  };

  const quit = () => {
    stopSong();
    setScreen('title');
  };

  const newLife = () => {
    saveGame(null);
    setGame(null);
    stopSong();
    setScreen('title');
  };

  useBackButton(() => setScreen('title'), screen === 'cert' || screen === 'collection');

  if (screen === 'collection') return <Collection meta={meta} onBack={() => setScreen('title')} />;
  if (screen === 'cert' && game)
    return (
      <BirthCert
        s={game}
        onStart={() => setScreen('life')}
        onReroll={() => {
          if (!lastOpts) return setScreen('title');
          // 같은 설정으로 다른 운명 — 무작위로 둔 것(해·나라·성별·이름)도 다시 굴린다
          born(rollOptions(lastOpts.set), lastOpts.pace, lastOpts.set);
        }}
      />
    );
  if (screen === 'life' && game) {
    if (game.phase === 'ending') {
      // 마지막 무대 연출을 보여 준 뒤 부고
      const last = game.cine[0];
      if (last)
        return (
          <Cinematic
            scene={last.scene}
            people={[{ look: game.player.look, gender: game.player.gender, age: game.player.deathAge ?? 80, mood: 70 }]}
            crowd={0.2}
            seed={game.seed}
            kicker={last.kicker}
            title={last.title}
            sub={`${last.sub}\n\n조명이 천천히 꺼졌다.`}
            onDone={() => update(popCine(game))}
          />
        );
      return <Ending state={game} meta={meta} onNewLife={newLife} onQuit={quit} onSameFate={() => born({ name: game.player.name, gender: game.player.gender, birthYear: game.player.birthYear, country: game.player.country as NewGameOptions['country'], seed: game.seed }, Number(game.flags.pace) || 1, { era: 'any', country: (game.player.country ?? 'KR') as CountryId, gender: game.player.gender, name: null, birthYear: game.player.birthYear })} />;
    }
    return <Life state={game} onChange={update} meta={meta} onQuit={quit} onNewLife={newLife} />;
  }
  return (
    <Title
      meta={meta}
      canContinue={!!game}
      continueLabel={game ? (game.phase === 'ending' ? `${game.player.name}의 라이너 노트 보기` : `${game.player.name} · ${Math.max(0, Math.floor(game.time - game.player.birthYear))}세`) : ''}
      onContinue={() => setScreen('life')}
      onBorn={born}
      onCollection={() => setScreen('collection')}
    />
  );
}
