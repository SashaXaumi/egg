import { iconURL } from '../utils';

const now = Date.now();

export class Tool {
  id: string;
  url: string;
  title: string;
  iconUrl = '';
  description?: string;
  displayIconOnly = false;
  iconCssClasses = '';
  newUntil = 0;
  majorUpdateUntil = 0;
  updateUntil = 0;
  whatsNew?: string;

  constructor({
    id,
    url,
    title,
    iconUrl,
    description,
    displayIconOnly,
    iconCssClasses,
    newUntil,
    majorUpdateUntil,
    updateUntil,
    whatsNew,
  }: {
    id: string;
    url?: string;
    title: string;
    iconUrl?: string;
    description?: string;
    displayIconOnly?: boolean;
    iconCssClasses?: string;
    newUntil?: number;
    majorUpdateUntil?: number;
    updateUntil?: number;
    whatsNew?: string;
  }) {
    this.id = id;
    this.url = url || `https://ferret.netlify.app/${this.id}/`;
    this.title = title;
    this.iconUrl = iconUrl || '';
    this.description = description;
    this.displayIconOnly = displayIconOnly || false;
    this.iconCssClasses = iconCssClasses || '';
    this.newUntil = newUntil || 0;
    this.majorUpdateUntil = majorUpdateUntil || 0;
    this.updateUntil = updateUntil || 0;
    this.whatsNew = whatsNew;
  }

  get isNew(): boolean {
    return now < this.newUntil;
  }

  get isMajorUpdate(): boolean {
    return now < this.majorUpdateUntil;
  }

  get isUpdate(): boolean {
    return now < this.updateUntil;
  }

  get isHighlight(): boolean {
    return this.isNew || this.isMajorUpdate || this.isUpdate;
  }
}

export const tools = [
  new Tool({
    id: 'eicoop',
    url: 'https://ferret.netlify.app/',
    title: 'CoopTracker',
    iconUrl: iconURL('wasmegg/eicoop.svg'),
    description: 'Coop tracker and contract master list',
    displayIconOnly: true,
    iconCssClasses: 'h-6 -ml-0.5 -mr-1 -top-0.5',
    majorUpdateUntil: 1624607856000,
    updateUntil: 1638811910000,
    whatsNew: 'Grade detection works again',
  }),
];

export const idToTool = new Map<string, Tool>(tools.map(t => [t.id, t]));

export const newTools = tools.filter(tool => tool.isNew);
export const majorUpdateTools = tools.filter(tool => !tool.isNew && tool.isMajorUpdate);
export const updateTools = tools.filter(tool => !tool.isNew && !tool.isMajorUpdate && tool.isUpdate);

// This is the signature of the what's new section of a particular build. We
// generate a signature so that a user can hide what's new and won't be bothered
// until something changes.
export const updateSignature = generateUpdateSignature();

function generateUpdateSignature(): string {
  let s = '';
  for (const tool of tools) {
    if (tool.newUntil || tool.majorUpdateUntil || tool.updateUntil) {
      s += `${tool}:${tool.newUntil}:${tool.majorUpdateUntil}:${tool.updateUntil}`;
    }
  }
  return hashFNV1a32bit(s).toString(16);
}

// https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
// https://datatracker.ietf.org/doc/html/draft-eastlake-fnv-17
function hashFNV1a32bit(s: string): number {
  const prime = 0x01000193;
  const offsetBasis = 0x811c9dc5;
  const uint32max = 0x100000000;
  let hash = offsetBasis;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, prime);
  }
  return (hash + uint32max) % uint32max;
}
