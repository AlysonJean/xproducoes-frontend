export const TARGET_CITIES = [
  { slug: 'belo-horizonte', name: 'Belo Horizonte', uf: 'MG', demonym: 'belo-horizontino' },
  { slug: 'nova-lima', name: 'Nova Lima', uf: 'MG', demonym: 'nova-limense' },
  { slug: 'contagem', name: 'Contagem', uf: 'MG', demonym: 'contagense' },
  { slug: 'betim', name: 'Betim', uf: 'MG', demonym: 'betinense' },
  { slug: 'lagoa-santa', name: 'Lagoa Santa', uf: 'MG', demonym: 'lagoa-santense' }
];

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ServiceContent {
  slug: string;
  name: string;
  keywords: string[];
  description: string;
  longDescription?: string;
  benefits?: string[];
  features?: string[];
  faq?: FAQItem[];
}

// Textos conferidos com o catálogo publicado em 09/11/2026 (decisões do dono do mesmo dia): sem marcas que não estão
// no estoque (JBL, Yamaha, RCF) e sem citar marcas; sem laser/strobo, "5.000 pessoas", "Box Truss Q30", equipamento
// reserva no local nem "sem cabos aparentes"; painel de LED fica sob consulta (parceiro), sem P3/P5 nem "impacto
// garantido"; projeto de luz em 3D e microfone sem fio UHF confirmados pelo dono.
export const TARGET_SERVICES: ServiceContent[] = [
  { 
    slug: 'aluguel-som', 
    name: 'Aluguel de Som', 
    keywords: ['caixas de som', 'microfones', 'sonorização', 'mesa de som'],
    description: 'Sonorização profissional para casamentos, festas e eventos corporativos.',
    longDescription: `
## Som Profissional para Seu Evento

A qualidade do som é o que define a energia da sua festa. Na **X Produções**, você encontra caixas ativas, subwoofers, mesas de som e microfones profissionais para que cada palavra do discurso e cada música sejam ouvidas com clareza.

### O que incluímos no pacote básico?
*   **Caixas Ativas e Subwoofers:** caixas de 15" e subwoofers ativos, dimensionados para o local.
*   **Mesa de Som:** Digital ou analógica, conforme a necessidade da banda ou DJ.
*   **Microfones Sem Fio:** Tecnologia UHF para evitar interferências.
*   **Técnico de Som:** Profissional para montagem e operação durante o evento (opcional).

Nossos equipamentos são revisados antes de cada evento.
    `,
    benefits: [
      "Caixas ativas, mesas digitais e microfones profissionais",
      "Técnicos disponíveis durante todo o evento",
      "Montagem organizada pela equipe técnica"
    ],
    faq: [
      {
        question: "O som é suficiente para quantas pessoas?",
        answer: "Depende do local e do número de convidados. Informe esses dados no pedido de orçamento e a equipe indica as caixas e a potência para o seu evento."
      },
      {
        question: "Vocês fornecem DJ?",
        answer: "Sim. O DJ Profissional está entre os nossos serviços e pode ser contratado junto com o som."
      }
    ]
  },
  { 
    slug: 'aluguel-iluminacao', 
    name: 'Aluguel de Iluminação', 
    keywords: ['moving head', 'par led', 'fumaça', 'luz cênica'],
    description: 'Iluminação cênica e para pista de dança que transforma seu evento.',
    longDescription: `
## Iluminação que Cria Atmosfera

Transforme um salão comum em um ambiente mágico. A iluminação não é apenas decoração; é a alma da festa.

### Nossas Soluções
*   **Pista de Dança:** Moving Heads e Mini Moving Spider para agitar.
*   **Cênica:** Refletores PAR LED para colorir paredes, colunas e mesas de bolo.
*   **Efeitos:** Máquina de fumaça, sputnik e globo espelhado.

Trabalhamos com projetos personalizados de iluminação arquitetural para valorizar o local do seu evento.
    `,
    benefits: [
      "Projetos personalizados em 3D",
      "Equipamentos LED de baixo consumo",
      "Variedade de cores e efeitos",
      "Instalação feita pela equipe técnica"
    ],
    faq: [
      {
        question: "Preciso de energia trifásica?",
        answer: "Para os kits do catálogo, não. Painel de LED e montagens maiores podem precisar; nossa equipe técnica avalia o local antes."
      }
    ]
  },
  { 
    slug: 'aluguel-painel-led', 
    name: 'Aluguel de Painel de LED', 
    keywords: ['painel de led', 'telão de led', 'video wall'],
    description: 'Painel de LED sob consulta, conforme a data e o tamanho do espaço do evento.'
  },
  { 
    slug: 'aluguel-palco-estrutura', 
    name: 'Aluguel de Palco e Estrutura', 
    keywords: ['box truss', 'palco praticável', 'backdrop', 'tendas'],
    description: 'Box truss, traves, tablado modular, tendas e backdrop para montar o espaço do seu evento.'
  }
];

export function getCityBySlug(slug: string) {
  return TARGET_CITIES.find(c => c.slug === slug);
}

export function getServiceBySlug(slug: string) {
  return TARGET_SERVICES.find(s => s.slug === slug);
}

// Achado: a rota original (/:serviceSlug-:citySlug) nunca funcionou — React Router não
// suporta dois parâmetros dinâmicos separados por um caractere literal dentro do mesmo
// segmento de URL (confirmado: matchPath retorna null até para o caso mais simples, "/x-y"
// contra "/:a-:b"). As ~20 páginas de SEO local (serviço x cidade) eram inacessíveis por
// qualquer URL desde que foram criadas. Corrigido usando um único segmento dinâmico
// (/:seoSlug) e desambiguando aqui: como nenhum slug de serviço é prefixo de outro, a busca
// é determinística.
export function parseServiceCitySlug(combinedSlug: string): { service: ServiceContent; city: (typeof TARGET_CITIES)[number] } | null {
  for (const service of TARGET_SERVICES) {
    const prefix = `${service.slug}-`;
    if (combinedSlug.startsWith(prefix)) {
      const citySlug = combinedSlug.slice(prefix.length);
      const city = TARGET_CITIES.find(c => c.slug === citySlug);
      if (city) return { service, city };
    }
  }
  return null;
}
