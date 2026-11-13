import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageCircle } from 'lucide-react';
import { Card, buttonVariants } from '@/components/ui/StandardComponents';
import { buildWhatsAppUrl, getWhatsAppPhone } from '@/utils/whatsapp';
import {
  COMPANY_CNPJ,
  COMPANY_FULL_ADDRESS,
  COMPANY_LEGAL_NAME,
  COMPANY_REGISTERED_NAME,
  SITE_NAME,
  SUPPORT_EMAIL,
  buildPageTitle,
} from '@/data/site';

// P15 (aprovada em 02/11/2026), parte 1: a moldura das duas telas da proposta, a página do link seguro
// (/proposta#token=..., pages/PublicProposalPage.tsx) e o aviso do endereço antigo (/proposta/<número>,
// pages/ProposalViewPage.tsx). As duas usam o layout mínimo do App.tsx (sem o cabeçalho, o rodapé e o WhatsApp
// flutuante do site) e saem com noindex e no-referrer (aqui e no vercel.json).

/** Texto do WhatsApp de quem recebeu um link que não abriu: sem link nem código. */
export const PROPOSAL_HELP_TEXT = 'Olá! Recebi um link de proposta que não abriu. Pode me mandar um novo?';

// Cabeçalho do documento: direto pelo Helmet (sem o componente SEO, que põe canonical e og:url com o endereço da
// janela). O título faz o SSR usar este conjunto no lugar do bloco genérico (renderer/+onRenderHtml.tsx).
function ProposalHead() {
  return (
    <Helmet>
      <title>{buildPageTitle('Proposta')}</title>
      <meta name="robots" content="noindex,nofollow" />
      <meta name="referrer" content="no-referrer" />
    </Helmet>
  );
}

/** Botão do WhatsApp da empresa: um link comum para o wa.me, sem o evento de conversão do GA. */
export function WhatsAppLink({ text }: { text: string }) {
  return (
    <a
      href={buildWhatsAppUrl(getWhatsAppPhone(), text)}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: 'success', size: 'lg', fullWidth: true })}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Falar no WhatsApp
    </a>
  );
}

// Dados da empresa: só o que já está em src/data/site.ts. Aceite online (13/11/2026): a página onde o contrato é aceito
// mostra o nome empresarial do CNPJ e o endereço completo, com CEP (Decreto 7.962/2013, art. 2º, I e II).
function CompanyFooter() {
  return (
    <footer className="pt-8 text-center space-y-1 text-xs text-muted-foreground">
      <p className="font-semibold uppercase tracking-wider">{COMPANY_LEGAL_NAME}</p>
      <p>{COMPANY_REGISTERED_NAME} • CNPJ {COMPANY_CNPJ}</p>
      <p>{COMPANY_FULL_ADDRESS}</p>
      <p>{SUPPORT_EMAIL}</p>
    </footer>
  );
}

export function ProposalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <ProposalHead />
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-center text-2xl font-black uppercase tracking-tight text-foreground">{SITE_NAME}</p>
        {children}
        <CompanyFooter />
      </div>
    </div>
  );
}

export function NoticeCard({ message, whatsappText }: { message: string; whatsappText: string }) {
  return (
    <Card padding className="space-y-6 text-center">
      <h1 className="text-xl font-bold text-foreground">{message}</h1>
      <WhatsAppLink text={whatsappText} />
    </Card>
  );
}
