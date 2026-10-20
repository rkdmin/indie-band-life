import { useCallback, useEffect, useState } from 'react';
import { fateName } from './sim/fatecode';
import type { CountryId } from './sim/data/countries';
import { applyMoneyOf } from './sim/money';
import { setMoneyDisplay } from './sim/korean';
import type { GameState } from './sim/types';
import { newGame, popCine, type NewGameOptions } from './sim/engine';
import { loadGame, loadMeta, recordLife, saveGame, type Meta } from './ui/save';
import { Title } from './ui/Title';
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
  // 돈 표시는 지금 보고 있는 인생의 나라 돈으로 (한국은 원화) — 그리기 전에 맞춘다
  if (game) applyMoneyOf(game);
  else setMoneyDisplay(null);
  const [lastOpts, setLastOpts] = useState<{ o: NewGameOptions; pace: number } | null>(null);

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

  const born = (o: NewGameOptions, pace: number) => {
    const s = newGame(o);
    s.flags.pace = pace;
    setLastOpts({ o, pace });
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
          // 같은 설정으로 다른 운명 — 새 시드를 정하고, 직접 지은 이름이 아니면 이름도 새 운명에서 (운명 코드와 맞게)
          const o = lastOpts.o;
          const seed = ((Date.now() ^ (Math.random() * 1e9)) >>> 0) % 0x7fffffff || 1;
          const fate = (sd: number) => ({ country: (o.country ?? 'KR') as CountryId, birthYear: o.birthYear, gender: o.gender, seed: sd });
          const auto = o.seed !== undefined && o.name === fateName(fate(o.seed));
          born({ ...o, seed, name: auto ? fateName(fate(seed)) : o.name }, lastOpts.pace);
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
      return <Ending state={game} meta={meta} onNewLife={newLife} onQuit={quit} onSameFate={() => born({ name: game.player.name, gender: game.player.gender, birthYear: game.player.birthYear, country: game.player.country as NewGameOptions['country'], seed: game.seed }, Number(game.flags.pace) || 1)} />;
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
