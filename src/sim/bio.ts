// 한 사람의 일생을 부고 기사처럼 한 문단으로. 연대기에서 결정적 장면만 골라 이어 붙인다.

import type { GameState } from './types';
import { REGIONS, INST_LABEL, GENRE_INFO } from './data/world';
import { given, josa } from './korean';

const INCOME = { low: '넉넉하지 않은', mid: '평범한', high: '여유 있는' };
/** 조사만 떼어 낸다: pj('블루스', '은/는') → '는' */
const pj = (w: string, pair: Parameters<typeof josa>[1]) => josa(w, pair).slice(w.length);

export function biography(s: GameState): string {
  const p = s.player;
  const region = REGIONS.find((r) => r.id === p.region)!.label;
  const parts: string[] = [];
  parts.push(`${p.birthYear}년 ${region}의 ${INCOME[p.income]} 집에서 태어났습니다.`);
  if (p.mainInst) parts.push(`${INST_LABEL[p.mainInst]}${p.mainInst === 'vocal' ? '을' : '를'} 평생의 악기로 삼았습니다.`);
  const bands = [...s.pastBands, ...(s.band ? [s.band] : [])];
  if (bands.length) {
    const first = bands[0];
    const members = first.memberIds.map((id) => s.npcs[id]).filter(Boolean);
    const old = members.find((m) => m.metAge < 16);
    parts.push(
      `${first.formedYear - p.birthYear}세에 ${GENRE_INFO[first.genre].label} 밴드 〈${first.name}〉${josa(first.name, '을/를').slice(first.name.length)} 결성했습니다${old ? ` — ${old.metAge}살 때 ${old.metAt}에서 만난 ${given(old.name)}${pj(given(old.name), '과/와')} 함께였습니다` : ''}.`,
    );
    if (bands.length > 1) parts.push(`평생 ${bands.length}개의 밴드를 거쳤습니다.`);
  } else parts.push('끝내 밴드를 만들지는 않았습니다.');
  if (s.albums.length) {
    const hit = s.songs.find((x) => x.hit && !x.revival);
    parts.push(`${s.albums.length}장의 음반을 냈${hit ? `고, 〈${hit.title}〉${pj(hit.title, '은/는')} 차트 ${hit.peak}위까지 올랐` : ''}습니다.`);
  } else if (s.songs.length) parts.push(`${s.songs.length}곡을 썼지만 세상에 내놓지는 않았습니다.`);
  const rev = s.songs.find((x) => x.revival);
  if (rev) parts.push(`〈${rev.title}〉${pj(rev.title, '은/는')} 발매 몇 년 뒤 뒤늦게 역주행했습니다.`);
  if (s.flags.militaryBand) parts.push('군악대에서 복무했습니다.');
  else if (p.military === 'done') parts.push('군 복무를 마쳤습니다.');
  if (s.flags.married) parts.push('결혼해 가정을 꾸렸습니다.');
  if (s.flags.child) parts.push('아이를 키웠습니다.');
  if (s.flags.grandchild) parts.push('손주를 보았습니다.');
  if (p.job === 'producer' || s.flags.mentor) parts.push('후배들의 곡을 만지는 프로듀서로 일했습니다.');
  else if (p.job === 'office') parts.push('회사에 다니며 생계를 꾸렸습니다.');
  if (s.flags.bankrupt) parts.push('한때 빚에 쫓겨 바닥까지 떨어졌습니다.');
  if (s.flags.reunion) parts.push('오래전 흩어진 멤버들과 다시 무대에 섰습니다.');
  if (p.retired) parts.push('은퇴 공연을 끝으로 무대에서 내려왔습니다.');
  const close = Object.values(s.npcs)
    .filter((n) => n.role !== 'parent')
    .sort((a, b) => b.affinity - a.affinity)[0];
  if (close && close.affinity >= 40) parts.push(`가장 가까웠던 사람은 ${close.metAge}살 때 만난 ${josa(close.name, '이/')}${josa(close.name, '이/').length > close.name.length ? '었' : '였'}습니다.`);
  if (s.flags.careerEnd !== undefined) parts.push(`${s.flags.careerEnd}세에 음악 인생의 막을 내리고, 그 뒤로는 조용히 살았습니다.`);
  if (s.player.debt > 0) parts.push(`갚지 못한 빚 ${Math.round(s.player.debt / 10000).toLocaleString()}만원이 남았습니다.`);
  parts.push(`${p.deathAge ?? Math.floor(s.time - p.birthYear)}세에 세상을 떠났습니다.`);
  return parts.join(' ');
}
