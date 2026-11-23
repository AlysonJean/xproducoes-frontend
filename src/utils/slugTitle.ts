// Onda 2 da auditoria de 19/11 (F5-04): o detalhe de kit, equipamento e serviço sai do servidor no "carregando" (o SSR
// não busca dados), e o HTML levava só "Kits | X Produções", sem descrição. Até os dados chegarem, o título vem do
// endereço ("kit-festa-500" → "Kit Festa 500"), mais útil na prévia do WhatsApp e no primeiro HTML que o Google lê.
// O endereço não tem acentos; o título certo entra quando a página carrega.
export function titleFromSlug(slug: string | undefined): string {
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => (/^\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}
