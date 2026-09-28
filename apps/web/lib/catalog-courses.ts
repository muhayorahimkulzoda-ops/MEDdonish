import type { MessageKey } from '@meddonish/localization';

export const CATALOG_COURSES: {
  href: string;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  lectures: number;
  tests: number;
}[] = [
  {
    href: '/courses/anatomy-osteo',
    titleKey: 'home.track.anatomy',
    descriptionKey: 'course.anatomy.lead',
    lectures: 24,
    tests: 12,
  },
  {
    href: '/courses/pharmacology-y3',
    titleKey: 'home.track.pharma',
    descriptionKey: 'home.year3',
    lectures: 18,
    tests: 10,
  },
  {
    href: '/courses/pathophysiology-y3',
    titleKey: 'home.track.pathphys',
    descriptionKey: 'home.year3',
    lectures: 18,
    tests: 10,
  },
  {
    href: '/courses/pathanatomy-y3',
    titleKey: 'home.track.pathanat',
    descriptionKey: 'home.year3',
    lectures: 18,
    tests: 10,
  },
];
