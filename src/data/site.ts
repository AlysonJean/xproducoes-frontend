// Dados institucionais exibidos no site público — fonte única para rodapé, contato, páginas
// legais, SEO e afins. Achado (auditoria do design system, nov/2026): estes valores estavam
// copiados à mão em ~12 arquivos, com divergências (dois domínios de e-mail, endereço com
// grafias diferentes, telefone do desenvolvedor exibido como WhatsApp comercial).

export const SITE_NAME = 'X Produções';
// Nome comercial (o nome fantasia). O nome empresarial do CNPJ é COMPANY_REGISTERED_NAME, logo abaixo.
export const COMPANY_LEGAL_NAME = 'X Produções e Eventos';
export const COMPANY_CNPJ = '55.343.824/0001-56';
export const COMPANY_ADDRESS_LINE = "Rua Flor d'Água, 407, Jardim Alvorada";
export const COMPANY_CITY_LINE = 'Belo Horizonte - MG';
// Textos legais (13/11/2026): nome empresarial completo do CNPJ (MEI), confirmado por Alyson em 13/11/2026. Era a
// forma abreviada "55.343.824 ERNANE M. S." (Q7, a conferir). O Decreto 7.962/2013, art. 2º, pede o nome empresarial e
// o CNPJ em local visível do site: o rodapé, a política de privacidade e a política de reserva o mostram.
export const COMPANY_REGISTERED_NAME = '55.343.824 ERNANE MOURA DA SILVA';
// CEP do endereço do CNPJ, confirmado pelo dono em 06/11/2026 (o mesmo endereço acima, saída do frete).
export const COMPANY_POSTAL_CODE = '30810-310';
/** Endereço físico completo, com CEP, numa linha: rodapé, políticas e Termos (Decreto 7.962/2013, art. 2º, II). */
export const COMPANY_FULL_ADDRESS = `${COMPANY_ADDRESS_LINE}, ${COMPANY_CITY_LINE}, CEP ${COMPANY_POSTAL_CODE}`;

export const INSTAGRAM_URL = 'https://www.instagram.com/x_producoeseventos';
export const INSTAGRAM_HANDLE = '@x_producoeseventos';

// Domínio de e-mail confirmado pelo dono (nov/2026): @xproducoeseeventos.com.br — com "ee", o
// mesmo do site e do backend. Antes o rodapé, contato, carreiras, imprensa e ajuda mostravam
// @xproducoeseventos.com.br (com um "e" só), que não é o domínio da empresa.
export const SUPPORT_EMAIL = 'suporte@xproducoeseeventos.com.br';

// Textos legais (13/11/2026): prazo de resposta do atendimento (Decreto 7.962/2013, art. 4º, parágrafo único: a
// resposta ao consumidor sai em até 5 dias). O Contato dizia "Respondemos em até 24h", sem regra que o sustentasse.
export const SUPPORT_RESPONSE_LABEL = 'Atendimento: respondemos em até 5 dias';

// P20 (decisão do dono de 08/11/2026, a partir da resposta de 03/11): o selo, o rodapé e o contato diziam "Desde 2015"
// e "Mais de 10 anos de experiência", mas o CNPJ é de 2024. A frase fala da trajetória do dono, não da empresa. Uma
// fonte só: a próxima troca é aqui.
export const EXPERIENCE_SINCE = 'Experiência em eventos desde 2015';

// Horário de atendimento (decisão do dono de 09/11/2026): todos os dias, 24 horas, pelo WhatsApp, o mesmo do Perfil
// da Empresa no Google. Antes eram três: o contato dizia "seg–sex 9h–18h, sáb 9h–15h, domingo plantão", os dados para
// o Google diziam "seg–sex 9h–18h" e o Perfil dizia "Aberto 24 horas". Uma fonte só para o contato e o JSON-LD.
export const OPENING_HOURS_LABEL = 'Todos os dias, 24 horas';
export const OPENING_HOURS_SCHEMA = {
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  opens: '00:00',
  closes: '23:59',
};

// Perfil da Empresa no Google, pelo identificador do lugar no Maps (conferido em 09/11/2026). Vai no sameAs do JSON-LD.
export const GOOGLE_MAPS_URL = 'https://maps.google.com/?cid=1473271925537970059';

/** Título da aba: "Página | X Produções", sem duplicar o sufixo quando a página já o traz. */
export function buildPageTitle(title: string): string {
  const normalized = title.toLowerCase().replace(/-/g, ' ');
  if (normalized.includes(SITE_NAME.toLowerCase())) return title;
  return `${title} | ${SITE_NAME}`;
}

/** Formata os dígitos de um telefone brasileiro (com ou sem DDI 55) como "(31) 99976-0416". */
export function formatPhoneDisplay(digits: string): string {
  let local = digits.replace(/\D/g, '');
  if (local.length >= 12 && local.startsWith('55')) local = local.slice(2);
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}
