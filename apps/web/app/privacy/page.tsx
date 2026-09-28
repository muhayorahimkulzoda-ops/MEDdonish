import { t } from '../../lib/i18n';
import { Shell } from '../../components/Shell';

export default function PrivacyPage() {
  return (
    <Shell>
      <article className="legal">
        <h1>{t('legal.privacy')}</h1>
        <p>{t('legal.privacy.intro')}</p>
        <p>{t('legal.privacy.data')}</p>
        <p>{t('legal.privacy.access')}</p>
        <p>{t('legal.privacy.delete')}</p>
        <p>{t('legal.privacy.export')}</p>
      </article>
    </Shell>
  );
}
