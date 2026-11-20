// Decisão de Alyson (20/11/2026), selo de assinatura com atualização automática: o rodapé mostra o selo da X Soluções
// Digitais, um web component (<x-selo>, tipo em src/x-selo.d.ts) que vem do repositório público
// AlysonJean/x-solucoes-digitais pelo jsDelivr. O endereço acompanha o main: uma mudança no selo.js chega a este site
// sem publicar o site de novo.
//
// Atualização automática de verdade: o jsDelivr manda o navegador guardar o arquivo por 7 dias
// (Cache-Control max-age=604800) e guarda a cópia dele por até 12 horas (s-maxage=43200; menos quando o repositório do
// selo limpa o cache). Com o endereço fixo, quem já visitou o site ficaria até uma semana com o selo antigo. Por isso o
// endereço leva a hora (?h=, horas inteiras desde 1970, em UTC): a cada hora o navegador pede o arquivo de novo (cerca
// de 3 KB). O jsDelivr ignora o parâmetro no cache dele (conferido em 20/11/2026: mesma cópia, mesmo Age), então todos
// os visitantes dividem a mesma cópia. A hora é calculada no navegador, e não no servidor, porque o HTML das páginas
// fica guardado na Vercel por até 1 dia (s-maxage=3600 com stale-while-revalidate=86400, vercel.json).
//
// O script é pedido pelo rodapé (src/components/Footer.tsx), e não no <head> de toda página: o painel e a área do
// colaborador, que não têm rodapé, não carregam código de fora quando abertos direto. Sem referrer: o jsDelivr não
// recebe o endereço da página. Sem o script (fora do ar ou bloqueado), o rodapé mostra o link de dentro da tag.

export const SELO_SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/AlysonJean/x-solucoes-digitais@main/selo/selo.js';

const HORA_MS = 60 * 60 * 1000;

/** Endereço do script com a hora atual, para o navegador buscar a versão nova a cada hora. */
export function seloScriptSrc(agora: number = Date.now()): string {
  return `${SELO_SCRIPT_URL}?h=${Math.floor(agora / HORA_MS)}`;
}

/** Pede o script do selo uma vez por página (navegar entre páginas não pede de novo). */
export function carregarSeloAssinatura(doc: Document = document, agora: number = Date.now()): void {
  if (doc.defaultView?.customElements?.get('x-selo')) return;
  if (doc.querySelector('script[data-selo-assinatura]')) return;
  const script = doc.createElement('script');
  script.src = seloScriptSrc(agora);
  script.async = true;
  script.setAttribute('referrerpolicy', 'no-referrer');
  script.dataset.seloAssinatura = '';
  doc.head.appendChild(script);
}
