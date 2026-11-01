// Dados institucionais exibidos no site público — fonte única para rodapé, contato, páginas
// legais, SEO e afins. Achado (auditoria do design system, nov/2026): estes valores estavam
// copiados à mão em ~12 arquivos, com divergências (dois domínios de e-mail, endereço com
// grafias diferentes, telefone do desenvolvedor exibido como WhatsApp comercial).

export const SITE_NAME = 'X Produções';
export const COMPANY_LEGAL_NAME = 'X Produções e Eventos';
export const COMPANY_CNPJ = '55.343.824/0001-56';
export const COMPANY_ADDRESS_LINE = "Rua Flor d'Água, 407, Jardim Alvorada";
export const COMPANY_CITY_LINE = 'Belo Horizonte - MG';

export const INSTAGRAM_URL = 'https://www.instagram.com/x_producoeseventos';
export const INSTAGRAM_HANDLE = '@x_producoeseventos';

// PENDÊNCIA (confirmar com o dono antes de unificar): há dois domínios de e-mail em uso.
// - SUPPORT_EMAIL (rodapé, contato, carreiras, imprensa, ajuda) usa @xproducoeseventos.com.br.
// - O domínio do site, o backend (backend/src/templates/emailTemplates.ts) e as páginas legais
//   (privacidade, termos, LGPD) usam @xproducoeseeventos.com.br — com "ee".
// Os valores foram mantidos como estavam em cada tela; quando o domínio certo for confirmado,
// deixe só uma constante aqui.
export const SUPPORT_EMAIL = 'suporte@xproducoeseventos.com.br';
export const LEGAL_SUPPORT_EMAIL = 'suporte@xproducoeseeventos.com.br';
export const PRIVACY_CONTACT_EMAIL = 'contato@xproducoeseeventos.com.br';

/** Título da aba: "Página | X Produções", sem duplicar o sufixo quando a página já o traz. */
export function buildPageTitle(title: string): string {
  const normalized = title.toLowerCase().replace(/-/g, ' ');
  if (normalized.includes(SITE_NAME.toLowerCase())) return title;
  return `${title} | ${SITE_NAME}`;
}

/** Formata os dígitos de um telefone brasileiro (com ou sem DDI 55) como "(31) 98925-2272". */
export function formatPhoneDisplay(digits: string): string {
  let local = digits.replace(/\D/g, '');
  if (local.length >= 12 && local.startsWith('55')) local = local.slice(2);
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}
