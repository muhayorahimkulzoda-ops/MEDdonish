'use client';

import { StudentsTable } from '../../../components/StudentsTable';
import { t } from '../../../lib/i18n';

export default function UsersPage() {
  return <StudentsTable title={t('admin.nav.students.account')} mode="accounts" />;
}
