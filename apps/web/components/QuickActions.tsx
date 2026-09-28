'use client';

import {
  Bone,
  BookOpen,
  Calculator,
  ClipboardList,
  FileQuestion,
  Pill,
  Sparkles,
  PlayCircle,
} from 'lucide-react';
import type { MessageKey } from '@meddonish/localization';
import { t } from '../lib/i18n';
import { MedicalCategoryCard } from './MedicalCategoryCard';
import { SectionHeader } from './SectionHeader';

const ACTIONS: { href: string; titleKey: MessageKey; icon: typeof Bone }[] = [
  { href: '/anatomy', titleKey: 'qa.anatomy', icon: Bone },
  { href: '/courses/anatomy-osteo', titleKey: 'qa.lectures', icon: BookOpen },
  { href: '/courses/anatomy-osteo', titleKey: 'qa.video', icon: PlayCircle },
  { href: '/courses', titleKey: 'qa.tests', icon: FileQuestion },
  { href: '/clinical#drugs', titleKey: 'qa.drugs', icon: Pill },
  { href: '/clinical#calculators', titleKey: 'qa.calculators', icon: Calculator },
  { href: '/clinical#cases', titleKey: 'qa.cases', icon: ClipboardList },
  { href: '/ai', titleKey: 'qa.ai', icon: Sparkles },
];

export function QuickActions() {
  return (
    <section className="md-block">
      <SectionHeader title={t('home.quickActions')} />
      <div className="md-quick-grid">
        {ACTIONS.map((item) => (
          <MedicalCategoryCard key={item.titleKey} href={item.href} title={t(item.titleKey)} icon={item.icon} />
        ))}
      </div>
    </section>
  );
}
