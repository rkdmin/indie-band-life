import type { EventDef } from '../ctx';
import { STORY } from './story';
import { LIFE } from './life';
import { CAREER } from './career';
import { GLOBAL } from './global';

export const EVENTS: EventDef[] = [...STORY, ...LIFE, ...CAREER, ...GLOBAL];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string) => byId.get(id);
