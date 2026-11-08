import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { settings } = vi.hoisted(() => ({ settings: { companyName: 'X Produções', googleReviewUrl: null as string | null } }));
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => settings }));
vi.mock('../components/modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../components/ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));

import { TrustStrip } from '../components/ui/TrustStrip';
import { Footer } from '../components/Footer';
import { GUIDES } from '../data/guides';
import { EXPERIENCE_SINCE } from '../data/site';

// P20 (aprovada em 02/11/2026) e decisões do dono de 08/11: selo de pagamento verdadeiro (PIX na conta da empresa),
// "Experiência em eventos desde 2015" de uma fonte só, guias assinados pela equipe, link de avaliação no Google só com
// o link do Perfil da Empresa, e nenhuma promessa absoluta no site.
describe('P20 — selos, rodapé e guias', () => {
  it('selos: PIX na conta da empresa e a experiência desde 2015; sem "Pagamento Seguro"', () => {
    render(<TrustStrip />);
    expect(screen.getByText('PIX direto na conta da empresa (CNPJ)')).toBeInTheDocument();
    expect(screen.getByText('Experiência em eventos desde 2015')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento Seguro')).not.toBeInTheDocument();
    expect(screen.queryByText('Desde 2015')).not.toBeInTheDocument();
  });

  it('rodapé: a mesma frase de experiência; o link de avaliação só aparece com o link do Google', () => {
    const { unmount } = render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(screen.getByText(/Experiência em eventos desde 2015\./)).toBeInTheDocument();
    expect(screen.queryByText(/atendimento excepcional/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Avalie a X Produções no Google/ })).not.toBeInTheDocument();
    unmount();

    settings.googleReviewUrl = 'https://g.page/r/xproducoes/review';
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Avalie a X Produções no Google/ });
    expect(link).toHaveAttribute('href', 'https://g.page/r/xproducoes/review');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    settings.googleReviewUrl = null;
  });

  it('guias assinados pela equipe, sem foto de banco de rostos', () => {
    for (const guide of GUIDES) {
      expect(guide.author).toEqual({ name: 'Equipe X Produções', role: 'Equipe técnica' });
    }
  });
});

// Varre o código do site (fora dos testes e dos comentários): as frases absolutas não voltam, e o "desde 2015" só
// existe na constante de data/site.ts.
const SRC = join(process.cwd(), 'src');
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
const codeLines = (path: string) =>
  readFileSync(path, 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(line));

const PROIBIDAS = [
  'zero falhas', 'Líder em aluguel', 'melhores marcas', 'Compatibilidade Garantida', 'sucesso absoluto', 'certificada',
  'Entrega Ágil', 'confiabilidade absoluta', 'Pagamento Seguro', 'Mais de 10 anos', 'tecnologia de ponta',
  'melhor custo-benefício', 'Qualidade comprovada', 'Referência em', 'Garantia de Qualidade', 'Qualidade Premium',
  'atendimento excepcional', 'Suporte técnico imediato',
];

describe('P20 — nenhuma promessa absoluta no código do site', () => {
  const files = sourceFiles(SRC);

  it.each(PROIBIDAS)('"%s" não aparece', (frase) => {
    const achados = files.flatMap((path) => codeLines(path).filter((line) => line.includes(frase)).map(() => path));
    expect(achados).toEqual([]);
  });

  it('"desde 2015" só na constante de data/site.ts', () => {
    expect(EXPERIENCE_SINCE).toBe('Experiência em eventos desde 2015');
    const achados = files.filter((path) => codeLines(path).some((line) => /desde 2015/i.test(line)));
    expect(achados.map((p) => p.replace(/\\/g, '/').replace(/^.*\/src\//, 'src/'))).toEqual(['src/data/site.ts']);
  });
});
