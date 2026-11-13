// Aceite online (13/11/2026): CPF e CNPJ de quem contrata, conferidos no site antes de mandar ao servidor, com a mesma
// conta dos dígitos verificadores que o servidor refaz (POST /proposals/contract/prepare). Aqui só a conta: quem decide
// é o servidor, que devolve o erro do campo (fieldErrors) se discordar.
// CNPJ alfanumérico (Receita Federal, IN RFB 2.229/2024, desde julho de 2026): as 12 primeiras posições podem ter
// letras; cada caractere vale o código ASCII menos 48 ("0" = 0, "A" = 17) e os 2 dígitos verificadores continuam
// numéricos, com os mesmos pesos. O CNPJ só de números segue a mesma conta.

/** Só os números (telefone, CEP, CPF). */
export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** O documento sem pontuação, em maiúsculas (o CNPJ alfanumérico tem letras). É o que vai ao servidor. */
export const normalizeDocument = (value: string): string => value.toUpperCase().replace(/[^0-9A-Z]/g, '');

const allSame = (value: string) => /^(.)\1*$/.test(value);

function cpfCheckDigit(digits: string, firstWeight: number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) sum += Number(digits[i]) * (firstWeight - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** CPF com 11 números e os 2 dígitos verificadores certos (nada de "111.111.111-11"). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || allSame(cpf)) return false;
  return cpfCheckDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) && cpfCheckDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function cnpjCheckDigit(chars: string): number {
  const weights = chars.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < chars.length; i += 1) sum += (chars.charCodeAt(i) - 48) * weights[i];
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** CNPJ com 14 posições (12 números ou letras + 2 dígitos verificadores) e os verificadores certos. */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDocument(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || allSame(cnpj)) return false;
  return cnpjCheckDigit(cnpj.slice(0, 12)) === Number(cnpj[12]) && cnpjCheckDigit(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

/** "12345678909" → "123.456.789-09"; incompleto, volta como veio. */
export function formatCpf(value: string): string {
  const cpf = onlyDigits(value);
  return cpf.length === 11 ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}` : value;
}

/** "55343824000156" → "55.343.824/0001-56" (também o alfanumérico); incompleto, volta como veio. */
export function formatCnpj(value: string): string {
  const cnpj = normalizeDocument(value);
  return cnpj.length === 14
    ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
    : value;
}

/** CPF (11) ou CNPJ (14) com a pontuação; outro tamanho volta como veio. */
export function formatDocument(value: string): string {
  const doc = normalizeDocument(value);
  if (doc.length === 11) return formatCpf(doc);
  if (doc.length === 14) return formatCnpj(doc);
  return value;
}

// O documento com o meio à mostra e as pontas escondidas: "***.456.789-**" (CPF) e "12.345.***" + "/****-90" (CNPJ).
// Na ficha do painel, o completo só aparece a pedido.
export function maskDocument(value: string): string {
  const doc = normalizeDocument(value);
  if (doc.length === 11) return `***.${doc.slice(3, 6)}.${doc.slice(6, 9)}-**`;
  if (doc.length === 14) return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.***/****-${doc.slice(12)}`;
  return doc.length > 4 ? `${'*'.repeat(doc.length - 4)}${doc.slice(-4)}` : '****';
}
