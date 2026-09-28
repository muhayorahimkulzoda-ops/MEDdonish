export const OFFER_INCLUDES = [
  'lesson.video',
  'lesson.pdf',
  'lesson.test',
  'lesson.cases',
  'lesson.clinical',
] as const;

export const RECOMMENDED_PLAN = 'year_1';

export const YEAR3_BUNDLE_SLUGS = ['pathophysiology-y3', 'pathanatomy-y3', 'pharmacology-y3'] as const;

export function isYear3Slug(slug: string) {
  return (YEAR3_BUNDLE_SLUGS as readonly string[]).includes(slug);
}

export function storeSku(planCode: string, env: NodeJS.ProcessEnv = process.env) {
  const key = planCode.toUpperCase();
  return {
    googleSku: env[`STORE_GOOGLE_SKU_${key}`] ?? `meddonish.${planCode}`,
    appleProductId: env[`STORE_APPLE_SKU_${key}`] ?? `meddonish.${planCode}`,
  };
}

type OfferCourse = {
  id: string;
  slug: string;
  translations: { language: string; title: string; description?: string | null }[];
  prices: { amountMinor: number; currency: string; plan: { code: string; durationDays: number } }[];
};

export function buildOffer(
  input: { courses: OfferCourse[]; plans: { code: string; durationDays: number }[] },
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    grantsAccess: false,
    recommendedPlan: RECOMMENDED_PLAN,
    includes: [...OFFER_INCLUDES],
    legal: {
      privacy: '/privacy',
      terms: '/terms',
      accountDeletion: '/account-deletion',
    },
    store: {
      grantsAccess: false,
      sources: ['GOOGLE_PLAY', 'APPLE_IAP'] as const,
      plans: input.plans.map((plan) => ({
        planCode: plan.code,
        durationDays: plan.durationDays,
        ...storeSku(plan.code, env),
      })),
    },
    courses: input.courses.map((course) => ({
      id: course.id,
      slug: course.slug,
      translations: course.translations.map((row) => ({
        language: row.language,
        title: row.title,
        description: row.description ?? '',
      })),
      prices: [...course.prices]
        .sort((a, b) => a.plan.durationDays - b.plan.durationDays)
        .map((price) => ({
          planCode: price.plan.code,
          durationDays: price.plan.durationDays,
          amountMinor: price.amountMinor,
          currency: price.currency,
          recommended: price.plan.code === RECOMMENDED_PLAN,
        })),
    })),
  };
}

export function year3BundleFromOffer(courses: ReturnType<typeof buildOffer>['courses']) {
  const items = YEAR3_BUNDLE_SLUGS.map((slug) => courses.find((course) => course.slug === slug)).filter(
    (course): course is NonNullable<typeof course> => Boolean(course),
  );
  if (!items[0]) return null;
  return {
    checkoutCourseId: items[0].id,
    checkoutSlug: items[0].slug,
    titles: items.map((course) => ({
      slug: course.slug,
      translations: course.translations,
    })),
    prices: items[0].prices,
  };
}
