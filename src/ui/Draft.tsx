import type { ReactNode } from 'react';
// 멤버 고르기 카드. 인연과 우연이 섞인 후보 3~4장 중 한 명에게 영입을 제안한다 (제안하면 d20 영입 판정).

import { genreLabel } from '../sim/data/era/genres';
import type { GameState } from '../sim/types';
import { Portrait } from '../art/Portrait';
import { INST_LABEL } from '../sim/data/world';
import { TRAIT_LABEL, careerLabel, npcAge } from '../sim/npc';
import { sfx } from '../audio/player';
import { charmWord, describe, npcAppearance } from '../sim/appearance';
import { useArmed } from './useArmed';

export function MemberDraft({ s, onChoose, cut }: { s: GameState; onChoose: (i: number) => void; cut?: ReactNode }) {
  const ev = s.active!;
  const band = s.band;
  const n = Number(ev.vars?.n ?? 0);
  const cards = Array.from({ length: n }, (_, i) => ({ i, npc: s.npcs[ev.vars?.[`c${i}`] as string], ch: ev.choices[i] })).filter((x) => x.npc);
  const passIdx = ev.choices.length - 1;
  const armed = useArmed(ev.id, 350);
  return (
    <div className="draft-back">
      <div className="draft" role="dialog" aria-modal="true" aria-label={ev.title}>
        {cut && <div className="draft-cut">{cut}</div>}
        <div className="draft-head">
          <span className="k">{ev.vars?.src === 'walkin' ? 'WALK-IN' : 'MEMBER DRAFT'}</span>
          <h2>{ev.title}</h2>
          <p>{ev.text}</p>
        </div>
        <div className="draft-cards">
          {cards.map(({ i, npc, ch }, k) => {
            const known = npc.affinity >= 25 || npc.metAge < Math.floor(s.time - s.player.birthYear) - 1;
            const fit = band && npc.genre === band.genre;
            const odds = ch.odds;
            const pct = odds ? Math.round(odds.p * 100) : 0;
            return (
              <button key={npc.id} className={`mcard ${known ? 'known' : 'stranger'}`} style={{ animationDelay: `${k * 0.12}s` }} disabled={ch.disabled} onClick={() => { if (!armed) return; sfx('tap'); onChoose(i); }}>
                <span className="mcard-tag">{known ? '인연' : '우연'}</span>
                <span className="mcard-face">
                  <Portrait person={{ look: npc.look, gender: npc.gender, age: npcAge(s, npc), mood: 50 + npc.affinity / 2, app: npcAppearance(npc, s.player.country), style: npc.genre }} />
                </span>
                <span className="mcard-name">{npc.name}</span>
                <span className="mcard-inst">
                  {INST_LABEL[npc.inst]} <b>{Math.round(npc.skill)}</b>
                </span>
                <span className="mcard-bar"><i style={{ width: `${npc.skill}%` }} /></span>
                <span className="mcard-row">
                  {npc.traits.map((t) => (
                    <span key={t} className="chip">{TRAIT_LABEL[t]}</span>
                  ))}
                </span>
                <span className={`mcard-fit ${fit ? 'good' : 'bad'}`}>
                  {genreLabel(npc.genre, s.time, s.player.country)} {fit ? '· 장르 궁합 ◎' : `· 우리는 ${band ? genreLabel(band.genre, s.time, s.player.country) : ''}`}
                </span>
                <span className="mcard-look">{describe(npcAppearance(npc, s.player.country), npcAge(s, npc), npc.gender)}</span>
                <span className="mcard-job">{npcAge(s, npc)}세 · {careerLabel(npc, npcAge(s, npc))} · {charmWord(npcAppearance(npc, s.player.country).charm)}</span>
                <span className="mcard-how">
                  {npc.metAge}살 · {npc.metAt}
                  {npc.affinity >= 25 && <> · 친밀도 {Math.round(npc.affinity)}</>}
                </span>
                {npc.memories[0] && <span className="mcard-mem">“{npc.memories[0]}”</span>}
                {odds && (
                  <span className="mcard-odds">
                    영입 판정 <b>{pct}%</b> · 난이도 {odds.dc} · d20{odds.mod >= 0 ? '+' : ''}{odds.mod}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="draft-foot">
          <button className="linkbtn" onClick={() => armed && onChoose(passIdx)}>{ev.choices[passIdx]?.label}</button>
        </div>
      </div>
    </div>
  );
}
