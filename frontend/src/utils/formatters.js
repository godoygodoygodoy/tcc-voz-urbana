export const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

export const formatBrazilianPhone = (value) => {
  const digits = normalizeDigits(value).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  const subscriberLength = digits.length > 10 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 2 + subscriberLength)}-${digits.slice(2 + subscriberLength)}`;
};

export const formatCep = (value) => {
  const digits = normalizeDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

