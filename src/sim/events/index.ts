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

export const EVENTS: EventDef[] = [...STORY, ...LIFE, ...CAREER, ...GLOBAL, ...FATE, ...REGION_GENRE, ...PERSON, ...DRAFT, ...BAND_CRISIS];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string) => byId.get(id);
