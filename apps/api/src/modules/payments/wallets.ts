export type PublicPayMethod = {
  id: 'dushanbe_city' | 'alif' | 'eskhata';
  kind: 'phone' | 'card';
  account: string;
  cardNumber: string;
  holderName: string;
  details: string;
};

function parseDetails(raw?: string) {
  if (!raw?.trim()) return { account: '', holder: '' };
  const [left, right] = raw.split('|').map((part) => part.trim());
  if (right) return { account: left, holder: right };
  if (/\d{4}/.test(left)) return { account: left, holder: '' };
  return { account: '', holder: left };
}

export function formatPayPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('992') ? digits.slice(3) : digits;
  if (local.length === 9) {
    return `+992-${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7)}`;
  }
  if (local.length === 7) {
    return `+992-${local.slice(0, 3)}-${local.slice(3, 5)}-${local.slice(5)}`;
  }
  return raw.trim();
}

function wallet(input: {
  id: PublicPayMethod['id'];
  kind: PublicPayMethod['kind'];
  accountEnv?: string;
  detailsEnv?: string;
  holder: string;
}): PublicPayMethod {
  const parsed = parseDetails(input.detailsEnv);
  const rawAccount = (input.accountEnv ?? parsed.account).trim();
  const account = input.kind === 'phone' ? formatPayPhone(rawAccount) : rawAccount;
  const holderName = (input.holder || parsed.holder).trim();
  return {
    id: input.id,
    kind: input.kind,
    account,
    cardNumber: account,
    holderName,
    details: [account, holderName].filter(Boolean).join('\n') || input.detailsEnv?.trim() || input.id,
  };
}

function usableAccount(raw?: string) {
  const value = raw?.trim() ?? '';
  if (!value) return undefined;
  const compact = value.replace(/[\s-]/g, '');
  if (/^0+$/.test(compact)) return undefined;
  return value;
}

export function publicPaymentMethods() {
  const holder = process.env.PAY_CARD_HOLDER?.trim() || 'Рахимқулзода Мухайё';
  const phone =
    usableAccount(process.env.PAY_DUSHANBE_CITY_PHONE) ??
    usableAccount(process.env.PAY_ALIF_PHONE) ??
    '+9929395505';
  return {
    grantsAccess: false,
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_PAYMENT_CHAT_ID),
    methods: [
      wallet({
        id: 'dushanbe_city',
        kind: 'phone',
        accountEnv: usableAccount(process.env.PAY_DUSHANBE_CITY_PHONE) ?? phone,
        detailsEnv: process.env.PAY_DUSHANBE_CITY_DETAILS,
        holder,
      }),
      wallet({
        id: 'alif',
        kind: 'phone',
        accountEnv: usableAccount(process.env.PAY_ALIF_PHONE) ?? usableAccount(process.env.PAY_ALIF_CARD) ?? phone,
        detailsEnv: process.env.PAY_ALIF_DETAILS,
        holder,
      }),
      wallet({
        id: 'eskhata',
        kind: 'phone',
        accountEnv: usableAccount(process.env.PAY_ESKHATA_PHONE) ?? usableAccount(process.env.PAY_ESKHATA_CARD) ?? phone,
        detailsEnv: process.env.PAY_ESKHATA_DETAILS,
        holder,
      }),
    ] satisfies PublicPayMethod[],
  };
}
