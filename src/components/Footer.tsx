// src/components/Footer.tsx

import { useState } from 'react';
import { MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/StandardComponents';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';
import ThemedLogo from './ui/ThemedLogo';
import { getWhatsAppPhone, openWhatsApp } from '../utils/whatsapp';
import { useModal } from './modals/ModalContext';
import { newsletterService } from '../services/newsletterService';

export const Footer = () => {
  const { logoUrl, companyName } = useSettings();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { openModal } = useModal();

  // Ocultar footer nas páginas admin ou colaborador
  const path = window.location.pathname;
  const isAdminPage = path.startsWith('/admin');
  const isCollaboratorPage = path.startsWith('/collaborator');
  if (isAdminPage || isCollaboratorPage) return null;

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await newsletterService.subscribe(email);
      setIsSubscribed(true);
      setEmail('');
      openModal('alert', {
        title: 'Sucesso!',
        message: 'Você foi inscrito na nossa newsletter. Fique atento ao seu e-mail!',
        type: 'success'
      });
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error: any) {
      console.error('Newsletter error:', error);
      openModal('alert', {
        title: 'Atenção',
        message: error.response?.data?.error || 'Erro ao realizar inscrição. Tente novamente.',
        type: 'warning'
      });
    } finally {
      setLoading(false);
    }
  };

  const footerSections = [
    {
      title: 'Produtos',
      links: [
        { name: 'Equipamentos de Som', href: '/equipamentos?category=sound' },
        { name: 'Equipamentos de Luz', href: '/equipamentos?category=lighting' },
        { name: 'Kits Completos', href: '/kits' },
        { name: 'Acessórios', href: '/equipamentos?category=accessories' },
      ]
    },
    {
      title: 'Empresa',
      links: [
        { name: 'Sobre Nós', href: '/sobre' },
        { name: 'Nossa História', href: '/sobre#history' },
        { name: 'Equipe', href: '/sobre#team' },
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
        { name: 'Suporte Técnico', href: '/ajuda' },
        { name: 'Garantia', href: '/garantia' },
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Termos de Uso', href: '/termos' },
        { name: 'Política de Privacidade', href: '/privacidade' },
        { name: 'Política de Cookies', href: '/cookies' },
        { name: 'LGPD', href: '/lgpd' },
        { name: 'Licenças', href: '/licencas' },
      ]
    }
  ];

  const handleOpenFooterWhatsApp = () => {
    openWhatsApp(getWhatsAppPhone(), 'Olá! Gostaria de saber mais sobre locação de equipamentos.');
  };

  const handleSocialClick = (e: React.MouseEvent, social: { name: string; href: string }) => {
    if (!social.href) {
      e.preventDefault();
      openModal('alert', {
        title: 'Em breve!',
        message: `Estamos preparando conteúdos incríveis para o nosso canal no ${social.name}. Fique ligado!`,
        type: 'info',
        confirmText: 'Entendi'
      });
    }
  };

  const socialLinks = [
    { 
      name: 'Instagram', 
      href: 'https://www.instagram.com/x_producoeseventos', 
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12.017 0C8.396 0 7.931.013 6.714.058 5.498.103 4.677.301 3.958.585a6.022 6.022 0 0 0-2.188 1.424A6.022 6.022 0 0 0 .346 3.998c-.284.72-.482 1.54-.527 2.756C-.026 7.97-.013 8.435-.013 12.056c0 3.621.013 4.086.058 5.303.045 1.216.243 2.036.527 2.756.284.721.665 1.356 1.424 2.188a6.022 6.022 0 0 0 2.188 1.424c.72.284 1.54.482 2.756.527 1.217.045 1.682.058 5.303.058 3.621 0 4.086-.013 5.303-.058 1.216-.045 2.036-.243 2.756-.527a6.022 6.022 0 0 0 2.188-1.424 6.022 6.022 0 0 0 1.424-2.188c.284-.72.482-1.54.527-2.756.045-1.217.058-1.682.058-5.303 0-3.621-.013-4.086-.058-5.303-.045-1.216-.243-2.036-.527-2.756a6.022 6.022 0 0 0-1.424-2.188A6.022 6.022 0 0 0 18.973.585c-.72-.284-1.54-.482-2.756-.527C15 .013 14.535 0 12.017 0zm0 2.145c3.438 0 3.86.014 5.22.059 1.359.062 2.1.289 2.593.48.653.254 1.12.558 1.609 1.047.49.489.793.956 1.047 1.609.191.493.418 1.234.48 2.593.045 1.36.059 1.782.059 5.22 0 3.438-.014 3.86-.059 5.22-.062 1.359-.289 2.1-.48 2.593a4.339 4.339 0 0 1-1.047 1.609c-.489.49-.956.793-1.609 1.047-.493.191-1.234.418-2.593.48-1.36.045-1.782.059-5.22.059-3.438 0-3.86-.014-5.22-.059-1.359-.062-2.1-.289-2.593-.48a4.339 4.339 0 0 1-1.609-1.047 4.339 4.339 0 0 1-1.047-1.609c-.191-.493-.418-1.234-.48-2.593-.045-1.36-.059-1.782-.059-5.22 0-3.438.014-3.86.059-5.22.062-1.359.289-2.1.48-2.593.254-.653.558-1.12 1.047-1.609.489-.49.956-.793 1.609-1.047.493-.191 1.234-.418 2.593-.48 1.36-.045 1.782-.059 5.22-.059z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M12.017 15.957a3.901 3.901 0 1 1 0-7.803 3.901 3.901 0 0 1 0 7.803zm0-10.16a6.259 6.259 0 1 0 0 12.518 6.259 6.259 0 0 0 0-12.518zm9.813-1.25a1.46 1.46 0 1 1-2.921 0 1.46 1.46 0 0 1 2.921 0z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'Facebook', 
      href: 'https://www.facebook.com/XProducoeseEventos/?locale=pt_BR', 
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
      )
    },
    { 
      name: 'YouTube', 
      href: '', 
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    { 
      name: 'LinkedIn', 
      href: '', 
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    { 
      name: 'WhatsApp', 
      href: '#',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.051 3.488"/>
        </svg>
      )
    },
  ];

  return (
    <footer className="bg-card border-t border-border/50 mt-auto">
      {/* Newsletter Section */}
      <div className="border-b border-border/30">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Fique por dentro das novidades
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Receba ofertas exclusivas, dicas de eventos e lançamentos de novos equipamentos
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="flex-1 px-4 py-3 rounded-full border border-border bg-background/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                required
              />
              {/* Button do design system */}
              <Button
                type="submit"
                variant={isSubscribed ? 'success' : 'primary'}
                size="lg"
                disabled={isSubscribed || loading}
                className="rounded-full font-medium whitespace-nowrap px-8 py-3"
              >
                {loading ? 'Enviando...' : isSubscribed ? '✅ Inscrito!' : 'Inscrever'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              {logoUrl ? (
                // Quando há logo carregado, mostrar apenas o logo (persistente do Cloudinary)
                <ThemedLogo
                  src={logoUrl}
                  title={companyName || 'Logo'}
                  className="h-12 w-auto text-foreground"
                />
              ) : (
                // Fallback: ícone + nome quando não há logo
                <>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">X</span>
                  </div>
                  <span className="text-2xl font-bold heading-elegant">
                    {companyName}
                  </span>
                </>
              )}
            </div>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Transformamos suas ideias em eventos inesquecíveis. 
              Equipamentos de qualidade profissional e atendimento excepcional desde 2015.
            </p>
            
      {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 text-muted-foreground">
        <MapPinIcon className="w-5 h-5 text-primary" aria-hidden="true" />
                <span>Rua flor d'agua 407 Jardim Alvorada Belo Horizonte MG</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
        <PhoneIcon className="w-5 h-5 text-primary" aria-hidden="true" />
                <span>(31) 98925-2272</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
        <EnvelopeIcon className="w-5 h-5 text-primary" aria-hidden="true" />
                <span>suporte@xproducoeseventos.com.br</span>
              </div>
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
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 hover:translate-x-1 transform inline-block"
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
                © {new Date().getFullYear()} X Produçoes e Eventos.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
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
                  social.name === 'WhatsApp' ? (
                    <button
                      key={social.name}
                      onClick={handleOpenFooterWhatsApp}
                      title={social.name}
                      className="icon-btn"
                      aria-label="Abrir WhatsApp"
                    >
                      {social.icon}
                    </button>
                  ) : (
                    <a
                      key={social.name}
                      href={social.href || '#'}
                      target={social.href ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      title={social.name}
                      className="icon-btn"
                      onClick={(e) => handleSocialClick(e, social)}
                    >
                      {social.icon}
                    </a>
                  )
                ))}
              </div>
            </div>

            {/* Certifications/Badges */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="text-success">🔒</span>
                <span>SSL Seguro</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="text-primary">⚡</span>
                <span>Entrega Rápida</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
