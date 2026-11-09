import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { ContactPage } from '../pages/ContactPage';
import { SEO } from '../components/SEO';
import { TARGET_SERVICES, getServiceBySlug } from '../utils/localSeoConfig';
import { COMPANY_INFO, generateLocalBusinessSchema } from '../utils/schemaGenerator';
import { GOOGLE_MAPS_URL, INSTAGRAM_URL, OPENING_HOURS_LABEL, OPENING_HOURS_SCHEMA } from '../data/site';

// Lote 14b (decisões do dono de 09/11/2026, com o catálogo publicado e o Perfil da Empresa no Google em mãos):
// horário de atendimento igual ao do Perfil (todos os dias, 24 horas); um LocalBusiness só no JSON-LD, com o nome, o
// CEP e o Perfil no Google; textos das páginas de serviço sem o que não está no estoque, e painel de LED sob consulta.

const clearHead = () =>
  document.head.querySelectorAll('meta, script[type="application/ld+json"], link[rel="canonical"]').forEach((el) => el.remove());

describe('Lote 14b — horário de atendimento', () => {
  afterEach(() => {
    cleanup();
    clearHead();
  });

  it('o horário é o mesmo do Perfil no Google: todos os dias, das 00:00 às 23:59', () => {
    expect(OPENING_HOURS_LABEL).toBe('Todos os dias, 24 horas');
    expect(OPENING_HOURS_SCHEMA.dayOfWeek).toEqual([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ]);
    expect(OPENING_HOURS_SCHEMA.opens).toBe('00:00');
    expect(OPENING_HOURS_SCHEMA.closes).toBe('23:59');
  });

  it('página de Contato: "Todos os dias, 24 horas", sem o horário antigo; painel de LED sob consulta na descrição', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ContactPage />
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getAllByText('Todos os dias, 24 horas')).toHaveLength(2);
    expect(screen.getByText('Atendimento pelo WhatsApp')).toBeInTheDocument();
    expect(screen.queryByText(/Plantão/)).not.toBeInTheDocument();
    expect(screen.queryByText(/9h às/)).not.toBeInTheDocument();
    expect(screen.queryByText('Segunda a Sexta')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
        'painel de LED (sob consulta)'
      )
    );
  });
});

describe('Lote 14b — JSON-LD da empresa', () => {
  afterEach(() => {
    cleanup();
    clearHead();
  });

  it('nome do Perfil no Google, CEP confirmado, horário 24h e o Perfil no sameAs', () => {
    const lb = generateLocalBusinessSchema();
    expect(lb.name).toBe('X Produções e Eventos');
    expect(lb.alternateName).toBe('X Produções');
    expect(lb.address.postalCode).toBe('30810-310');
    expect(lb.openingHoursSpecification).toEqual([OPENING_HOURS_SCHEMA]);
    expect(COMPANY_INFO.sameAs).toEqual([INSTAGRAM_URL, GOOGLE_MAPS_URL]);
    expect(GOOGLE_MAPS_URL).toBe('https://maps.google.com/?cid=1473271925537970059');
    expect(COMPANY_INFO.description).toContain('painel de LED sob consulta');
  });

  it('o <SEO> manda o mesmo LocalBusiness do PageLayout (antes eram duas empresas, com outro @id e seg–sex)', async () => {
    render(
      <HelmetProvider>
        <SEO title="Página de teste" />
      </HelmetProvider>
    );
    await waitFor(() => expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull());
    const ld = JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent || '[]');
    const localBusiness = Array.isArray(ld) ? ld[0] : ld;
    expect(localBusiness).toEqual(JSON.parse(JSON.stringify(generateLocalBusinessSchema())));
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Aluguel de som, iluminação e estruturas para eventos em Belo Horizonte e região, com painel de LED sob consulta.'
    );
  });
});

describe('Lote 14b — páginas de serviço × cidade conferidas com o catálogo', () => {
  const textos = JSON.stringify(TARGET_SERVICES);

  it.each([
    'JBL', 'Yamaha', 'RCF', 'marcas líderes', 'Lasers', 'Strobo', 'Q30', 'qualquer porte', '5.000', 'P3, P5', 'garantido',
    'garantem', 'Backup de equipamentos', 'sem cabos aparentes', 'parceiros DJs', 'X-Produções',
  ])('"%s" não aparece', (frase) => {
    expect(textos).not.toContain(frase);
  });

  it('painel de LED sob consulta, sem a resolução P3 nas palavras-chave', () => {
    const led = getServiceBySlug('aluguel-painel-led');
    expect(led?.description).toBe('Painel de LED sob consulta, conforme a data e o tamanho do espaço do evento.');
    expect(led?.keywords).toEqual(['painel de led', 'telão de led', 'video wall']);
  });

  it('o que o dono confirmou continua: projeto de luz em 3D e microfone sem fio UHF', () => {
    expect(getServiceBySlug('aluguel-iluminacao')?.benefits).toContain('Projetos personalizados em 3D');
    expect(getServiceBySlug('aluguel-som')?.longDescription).toContain('Tecnologia UHF');
  });

  it('DJ: o serviço DJ Profissional está no catálogo; estruturas: os itens cadastrados', () => {
    const dj = getServiceBySlug('aluguel-som')?.faq?.find((f) => f.question === 'Vocês fornecem DJ?');
    expect(dj?.answer).toBe('Sim. O DJ Profissional está entre os nossos serviços e pode ser contratado junto com o som.');
    expect(getServiceBySlug('aluguel-palco-estrutura')?.description).toBe(
      'Box truss, traves, tablado modular, tendas e backdrop para montar o espaço do seu evento.'
    );
    expect(getServiceBySlug('aluguel-som')?.benefits).toEqual([
      'Caixas ativas, mesas digitais e microfones profissionais',
      'Técnicos disponíveis durante todo o evento',
      'Montagem organizada pela equipe técnica',
    ]);
  });
});

// Varre o código do site (fora dos testes e dos comentários): o que não está no estoque e o horário antigo não voltam.
const SRC = join(process.cwd(), 'src');
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
const codeLines = (path: string) =>
  readFileSync(path, 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(line));

describe('Lote 14b — o que não está no estoque não volta ao código do site', () => {
  const files = sourceFiles(SRC);

  it.each([
    'JBL', 'Yamaha', 'Lasers', 'Q30', '5.000 pessoas', 'P3, P5', 'painéis de LED', 'Plantão FDS', '9h às 18h',
    'alta performance', 'som, luz e LED', 'impacto visual garantido',
  ])('"%s" não aparece', (frase) => {
    const achados = files.flatMap((path) => codeLines(path).filter((line) => line.includes(frase)).map(() => path));
    expect(achados).toEqual([]);
  });
});
