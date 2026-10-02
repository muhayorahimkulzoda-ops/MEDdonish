import View from './view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { slug: 'anatomy-osteo' },
    { slug: 'pharmacology-y3' },
    { slug: 'pathophysiology-y3' },
    { slug: 'pathanatomy-y3' },
  ];
}

export default function Page() {
  return <View />;
}
