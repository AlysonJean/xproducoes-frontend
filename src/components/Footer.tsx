// src/components/Footer.tsx

import { MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { Link, useLocation } from 'react-router-dom';
import ThemedLogo from './ui/ThemedLogo';
import { getWhatsAppPhone, openWhatsApp } from '../utils/whatsapp';
import {
  COMPANY_ADDRESS_LINE,
  COMPANY_CITY_LINE,
  COMPANY_CNPJ,
  COMPANY_LEGAL_NAME,
  EXPERIENCE_SINCE,
  INSTAGRAM_URL,
  SUPPORT_EMAIL,
  formatPhoneDisplay,
} from '../data/site';
import { GoogleReviewLink } from './ui/GoogleReviewLink';
import { RESERVATION_POLICY_PATH, RESERVATION_POLICY_PUBLISHED } from '../data/reservationPolicy';

// P5 (aprovada em 02/11/2026): o ano do "©" é o de Brasília. Era new Date().getFullYear(), no fuso de quem desenha: o
// servidor do site (Vercel, em UTC) virava o ano às 21:00 de 31/12 e o navegador à meia-noite local. Das 21:00 à
// meia-noite o HTML chegava com o ano seguinte, e o React, ao assumir a página, achava o texto diferente do que ele
// mesmo desenhava (erro de hidratação, com a página toda redesenhada no navegador). Com o fuso fixo, servidor e
// navegador calculam o mesmo ano. O suppressHydrationWarning do <span> do ano cobre só a virada em si: o HTML guardado
// no cache da Vercel, feito antes da meia-noite de 31/12 e aberto depois, mantém o ano do HTML até a próxima carga,
// sem erro.
const COPYRIGHT_YEAR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' });

// Achado (auditoria do design system): os links "Equipamentos de Som/Luz/Acessórios" mandavam
// `?category=sound|lighting|accessories`, mas a página de equipamentos filtra por `categoryId`
// (ID do banco) — o filtro era ignorado e os três links abriam a mesma lista. Sem um mapeamento
// confiável para os IDs reais, a seção aponta para as páginas que existem.
const footerSections = [
  {
    title: 'Produtos',
    links: [
      { name: 'Equipamentos', href: '/equipamentos' },
      { name: 'Kits Completos', href: '/kits' },
      { name: 'Serviços', href: '/servicos' },
      { name: 'Portfólio', href: '/portfolio' },
    ]
  },
  {
    title: 'Empresa',
    links: [
      { name: 'Sobre Nós', href: '/sobre' },
      { name: 'Carreiras', href: '/carreiras' },
      { name: 'Imprensa', href: '/imprensa' },
    ]
  },
  {
    title: 'Suporte',
    links: [
      { name: 'Central de Ajuda', href: '/ajuda' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Contato', href: '/contato' },
      { name: 'Garantia', href: '/garantia' },
    ]
  },
  {
    title: 'Legal',
    links: [
      { name: 'Termos de Uso', href: '/termos' },
      // P17 (aprovada em 02/11/2026): a política de reserva e cancelamento só ganha o link quando publicada (chave em
      // src/data/reservationPolicy.ts); antes disso é um rascunho sem link no site.
      ...(RESERVATION_POLICY_PUBLISHED ? [{ name: 'Reserva e Cancelamento', href: RESERVATION_POLICY_PATH }] : []),
      { name: 'Política de Privacidade', href: '/privacidade' },
      { name: 'Política de Cookies', href: '/cookies' },
      { name: 'LGPD', href: '/lgpd' },
      { name: 'Licenças', href: '/licencas' },
    ]
  }
];

// Achado: YouTube e LinkedIn não têm perfil (href vazio) e abriam um aviso "Em breve!" —
// botões mortos, removidos. Voltam para a lista quando os perfis existirem.
const socialLinks = [
  {
    name: 'Instagram',
    href: INSTAGRAM_URL,
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12.017 0C8.396 0 7.931.013 6.714.058 5.498.103 4.677.301 3.958.585a6.022 6.022 0 0 0-2.188 1.424A6.022 6.022 0 0 0 .346 3.998c-.284.72-.482 1.54-.527 2.756C-.026 7.97-.013 8.435-.013 12.056c0 3.621.013 4.086.058 5.303.045 1.216.243 2.036.527 2.756.284.721.665 1.356 1.424 2.188a6.022 6.022 0 0 0 2.188 1.424c.72.284 1.54.482 2.756.527 1.217.045 1.682.058 5.303.058 3.621 0 4.086-.013 5.303-.058 1.216-.045 2.036-.243 2.756-.527a6.022 6.022 0 0 0 2.188-1.424 6.022 6.022 0 0 0 1.424-2.188c.284-.72.482-1.54.527-2.756.045-1.217.058-1.682.058-5.303 0-3.621-.013-4.086-.058-5.303-.045-1.216-.243-2.036-.527-2.756a6.022 6.022 0 0 0-1.424-2.188A6.022 6.022 0 0 0 18.973.585c-.72-.284-1.54-.482-2.756-.527C15 .013 14.535 0 12.017 0zm0 2.145c3.438 0 3.86.014 5.22.059 1.359.062 2.1.289 2.593.48.653.254 1.12.558 1.609 1.047.49.489.793.956 1.047 1.609.191.493.418 1.234.48 2.593.045 1.36.059 1.782.059 5.22 0 3.438-.014 3.86-.059 5.22-.062 1.359-.289 2.1-.48 2.593a4.339 4.339 0 0 1-1.047 1.609c-.489.49-.956.793-1.609 1.047-.493.191-1.234.418-2.593.48-1.36.045-1.782.059-5.22.059-3.438 0-3.86-.014-5.22-.059-1.359-.062-2.1-.289-2.593-.48a4.339 4.339 0 0 1-1.609-1.047 4.339 4.339 0 0 1-1.047-1.609c-.191-.493-.418-1.234-.48-2.593-.045-1.36-.059-1.782-.059-5.22 0-3.438.014-3.86.059-5.22.062-1.359.289-2.1.48-2.593.254-.653.558-1.12 1.047-1.609.489-.49.956-.793 1.609-1.047.493-.191 1.234-.418 2.593-.48 1.36-.045 1.782-.059 5.22-.059z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M12.017 15.957a3.901 3.901 0 1 1 0-7.803 3.901 3.901 0 0 1 0 7.803zm0-10.16a6.259 6.259 0 1 0 0 12.518 6.259 6.259 0 0 0 0-12.518zm9.813-1.25a1.46 1.46 0 1 1-2.921 0 1.46 1.46 0 0 1 2.921 0z" clipRule="evenodd" />
      </svg>
    )
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/XProducoeseEventos/?locale=pt_BR',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
      </svg>
    )
  },
];

const whatsAppIcon = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.051 3.488"/>
  </svg>
);

const socialButtonClass =
  'touch-target rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const Footer = () => {
  const { companyName, googleReviewUrl } = useSettings();

  const { pathname } = useLocation();

  // Ocultar footer nas páginas admin ou colaborador
  const isAdminPage = pathname.startsWith('/admin');
  // O portal do colaborador vive em /colaborador/*; /collaborator/* são redirects legados.
  const isCollaboratorPage = pathname.startsWith('/colaborador') || pathname.startsWith('/collaborator');
  if (isAdminPage || isCollaboratorPage) return null;

  const whatsAppPhone = getWhatsAppPhone();

  const handleOpenFooterWhatsApp = () => {
    openWhatsApp(whatsAppPhone, 'Olá! Gostaria de saber mais sobre locação de equipamentos.');
  };

  return (
    <footer className="bg-card border-t border-border/50 mt-auto">
      {/* D8c (aprovada em 02/11/2026), pergunta 5: saiu o formulário "Fique por dentro das novidades". Ninguém envia
          newsletter, e a inscrição gravava o e-mail numa lista sem envio e sem como sair. */}

      {/* Main Footer Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">

          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <ThemedLogo
                title={companyName || 'Logo'}
                className="h-12 w-auto"
              />
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed">
              Transformamos suas ideias em eventos inesquecíveis.
              Equipamentos profissionais e atendimento próximo. {EXPERIENCE_SINCE}.
            </p>

            {/* Contato (dados de src/data/site.ts; telefone = WhatsApp do site) */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3 text-muted-foreground">
                <MapPinIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span>{COMPANY_ADDRESS_LINE} — {COMPANY_CITY_LINE}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <PhoneIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                <a href={`tel:+${whatsAppPhone}`} className="hover:text-primary transition-colors">
                  {formatPhoneDisplay(whatsAppPhone)}
                </a>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <EnvelopeIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary transition-colors break-all">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              {/* P20: só aparece com o link do Perfil da Empresa no Google (GOOGLE_REVIEW_LINK no servidor). */}
              <GoogleReviewLink url={googleReviewUrl} />
            </div>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 hover:translate-x-1 transform inline-block py-2"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-border/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">

            {/* Copyright */}
            <div className="text-center lg:text-left">
              <p className="text-sm text-muted-foreground">
                © <span suppressHydrationWarning>{COPYRIGHT_YEAR.format(new Date())}</span> {COMPANY_LEGAL_NAME}. CNPJ: {COMPANY_CNPJ}
              </p>
              {/* Achado (Lighthouse/axe-core contra produção real): a opacidade /70 aqui
                  reduzia o contraste de text-muted-foreground — removida. */}
              <p className="text-xs text-muted-foreground mt-1">
                Desenvolvido com ❤️ por Alyson Jean (31) 97580-8477
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground hidden lg:block">
                Nos siga:
              </span>
              <div className="flex items-center space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={social.name}
                    aria-label={`${social.name} (abre em nova aba)`}
                    className={socialButtonClass}
                  >
                    {social.icon}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={handleOpenFooterWhatsApp}
                  title="WhatsApp"
                  className={socialButtonClass}
                  aria-label="Abrir WhatsApp"
                >
                  {whatsAppIcon}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
