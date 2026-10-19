import type { EventDef } from '../ctx';
import { STORY } from './story';
import { LIFE } from './life';
import { CAREER } from './career';
import { GLOBAL } from './global';
import { FATE } from './fate';
import { REGION_GENRE } from './flavor_region_genre';
import { PERSON } from './flavor_person';
import { DRAFT } from './draft';
import { BAND_CRISIS } from './bandcrisis';
import { CAREER_END } from './careerend';
import { FAMILY_MONEY } from './family_money';
import { COUNTRY_EVENTS } from './country';
import { HISTORY_EVENTS } from './history';
import { ACT_EVENTS } from './acts';
import { ERA_EVENTS } from './era';
import { CARD_EVENTS } from './cards';
import { BREAKOUT_EVENTS } from './breakout';
import { WANT_EVENTS } from './wants';
import { NAMING_EVENTS } from './naming';
import { SURGERY_EVENTS } from './surgery';

export const EVENTS: EventDef[] = [...STORY, ...LIFE, ...CAREER, ...GLOBAL, ...FATE, ...REGION_GENRE, ...PERSON, ...DRAFT, ...BAND_CRISIS, ...CAREER_END, ...FAMILY_MONEY, ...COUNTRY_EVENTS, ...HISTORY_EVENTS, ...ACT_EVENTS, ...ERA_EVENTS, ...CARD_EVENTS, ...BREAKOUT_EVENTS, ...WANT_EVENTS, ...NAMING_EVENTS, ...SURGERY_EVENTS];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string) => byId.get(id);
