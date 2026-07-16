import { describe, it, expect } from 'vitest';
import { TARGET_CITIES, TARGET_SERVICES, parseServiceCitySlug } from '../localSeoConfig';

// Achado: a rota /:serviceSlug-:citySlug nunca funcionou — React Router não suporta dois
// parâmetros dinâmicos separados por um caractere literal dentro do mesmo segmento
// (confirmado via matchPath: retorna null até para o caso mais simples "/x-y" contra
// "/:a-:b"). As ~20 páginas de SEO local (serviço x cidade) eram inacessíveis desde que
// foram criadas. Corrigido com um único segmento dinâmico (/:seoSlug) desambiguado aqui.
describe('parseServiceCitySlug', () => {
  it('separa corretamente cada combinação real de serviço x cidade configurada', () => {
    for (const service of TARGET_SERVICES) {
      for (const city of TARGET_CITIES) {
        const combined = `${service.slug}-${city.slug}`;
        const result = parseServiceCitySlug(combined);
        expect(result).not.toBeNull();
        expect(result?.service.slug).toBe(service.slug);
        expect(result?.city.slug).toBe(city.slug);
      }
    }
  });

  it('retorna null para um slug que não corresponde a nenhuma combinação válida', () => {
    expect(parseServiceCitySlug('pagina-que-nao-existe')).toBeNull();
    expect(parseServiceCitySlug('aluguel-som')).toBeNull();
    expect(parseServiceCitySlug('')).toBeNull();
  });

  it('não confunde serviços cujo slug é prefixo de outro (aluguel-som vs. aluguel-som-x)', () => {
    // Garante que a busca por prefixo não pega o serviço errado quando um slug de cidade
    // começa com texto parecido a outro serviço.
    const result = parseServiceCitySlug('aluguel-som-belo-horizonte');
    expect(result?.service.slug).toBe('aluguel-som');
    expect(result?.city.slug).toBe('belo-horizonte');
  });
});
