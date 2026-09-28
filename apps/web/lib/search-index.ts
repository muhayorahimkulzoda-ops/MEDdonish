import type { MessageKey } from '@meddonish/localization';

export type SearchItem = {
  href: string;
  titleKey: MessageKey;
  group: 'course' | 'anatomy' | 'clinical' | 'test' | 'ai';
};

export const SEARCH_INDEX: SearchItem[] = [
  { href: '/courses/anatomy-osteo', titleKey: 'home.track.anatomy', group: 'course' },
  { href: '/courses/pharmacology-y3', titleKey: 'home.track.pharma', group: 'course' },
  { href: '/courses/pathophysiology-y3', titleKey: 'home.track.pathphys', group: 'course' },
  { href: '/courses/pathanatomy-y3', titleKey: 'home.track.pathanat', group: 'course' },
  { href: '/anatomy', titleKey: 'anatomy.title', group: 'anatomy' },
  { href: '/clinical#diseases', titleKey: 'clinical.diseases', group: 'clinical' },
  { href: '/clinical#drugs', titleKey: 'clinical.drugs', group: 'clinical' },
  { href: '/clinical#cases', titleKey: 'clinical.cases', group: 'clinical' },
  { href: '/clinical#calculators', titleKey: 'clinical.calculators', group: 'clinical' },
  { href: '/clinical#guidelines', titleKey: 'clinical.guidelines', group: 'clinical' },
  { href: '/clinical#ddx', titleKey: 'clinical.ddx', group: 'clinical' },
  { href: '/courses', titleKey: 'nav.tests', group: 'test' },
  { href: '/ai', titleKey: 'ai.title', group: 'ai' },
];
