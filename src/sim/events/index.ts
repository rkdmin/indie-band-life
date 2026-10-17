import type { EventDef } from '../ctx';
import { STORY } from './story';
import { LIFE } from './life';
import { CAREER } from './career';

export const EVENTS: EventDef[] = [...STORY, ...LIFE, ...CAREER];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const eventById = (id: string) => byId.get(id);
