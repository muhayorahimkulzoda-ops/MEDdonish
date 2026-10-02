import type { MessageKey } from '@meddonish/localization';
import { t } from '../lib/i18n';

const labels: Record<string, MessageKey> = {
  draft: 'admin.draft',
  published: 'admin.published',
  archived: 'admin.archived',
};

export function StatusBadge({ status }: { status: string }) {
  const key = labels[status];
  return <span>{key ? t(key) : status}</span>;
}
