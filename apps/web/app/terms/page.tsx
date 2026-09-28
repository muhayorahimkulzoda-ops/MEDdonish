import { t } from '../../lib/i18n';
import { Shell } from '../../components/Shell';

export default function TermsPage() {
  return (
    <Shell>
      <article className="legal">
        <h1>{t('legal.terms')}</h1>
        <p>{t('legal.terms.intro')}</p>
        <p>{t('legal.terms.pay')}</p>
        <p>{t('legal.terms.device')}</p>
      </article>
    </Shell>
  );
}
