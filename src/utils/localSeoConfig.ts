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

export const TARGET_SERVICES: ServiceContent[] = [
  { 
    slug: 'aluguel-som', 
    name: 'Aluguel de Som', 
    keywords: ['caixas de som', 'microfones', 'sonorização', 'mesa de som'],
    description: 'Sonorização profissional para casamentos, festas e eventos corporativos.',
    longDescription: `
## Som Profissional para Seu Evento

A qualidade do som é o que define a energia da sua festa. Na **X-Produções**, oferecemos sistemas de som de alta fidelidade que garantem que cada palavra do discurso e cada batida da música sejam ouvidas com clareza.

### O que incluímos no pacote básico?
*   **Caixas Ativas de Alta Potência:** Marcas como JBL, Yamaha ou RCF.
*   **Mesa de Som:** Digital ou analógica, conforme a necessidade da banda ou DJ.
*   **Microfones Sem Fio:** Tecnologia UHF para evitar interferências.
*   **Técnico de Som:** Profissional para montagem e operação durante o evento (opcional).

Nossos equipamentos são revisados semanalmente para garantir **zero falhas** no seu grande dia.
    `,
    benefits: [
      "Equipamentos de marcas líderes (JBL, Yamaha)",
      "Técnicos disponíveis durante todo o evento",
      "Montagem estética e sem cabos aparentes",
      "Backup de equipamentos no local"
    ],
    faq: [
      {
        question: "O som é suficiente para quantas pessoas?",
        answer: "Temos kits dimensionados para eventos desde 50 até 5.000 pessoas. Nossa equipe calcula a potência necessária baseada no local e público."
      },
      {
        question: "Vocês fornecem DJ?",
        answer: "Trabalhamos com parceiros DJs renomados em BH, mas o foco principal é a locação dos equipamentos de som e luz."
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
*   **Pista de Dança:** Moving Heads, Lasers e Strobo para agitar.
*   **Cênica:** Refletores PAR LED para colorir paredes, colunas e mesas de bolo.
*   **Efeitos:** Máquina de fumaça, sputnik e globo espelhado.

Trabalhamos com projetos personalizados de iluminação arquitetural para valorizar o local do seu evento.
    `,
    benefits: [
      "Projetos personalizados em 3D",
      "Equipamentos LED de baixo consumo",
      "Variedade de cores e efeitos",
      "Instalação segura e certificada"
    ],
    faq: [
      {
        question: "Preciso de energia trifásica?",
        answer: "Para kits básicos não. Apenas para grandes estruturas de painel de LED e iluminação pesada. Nossa equipe técnica avalia o local antes."
      }
    ]
  },
  { 
    slug: 'aluguel-painel-led', 
    name: 'Aluguel de Painel de LED', 
    keywords: ['painel led p3', 'telão led', 'video wall'],
    description: 'Painéis de LED de alta definição (P3, P5) para impacto visual garantido.'
  },
  { 
    slug: 'aluguel-palco-estrutura', 
    name: 'Aluguel de Palco e Estrutura', 
    keywords: ['box truss', 'palco praticável', 'backdrop', 'tendas'],
    description: 'Estruturas de alumínio Box Truss Q30 e palcos seguros para qualquer porte.'
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
