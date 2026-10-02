import View from './view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: 'preview' }];
}

export default function Page() {
  return <View />;
}
