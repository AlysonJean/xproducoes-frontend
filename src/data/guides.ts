export interface Guide {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  readTime: string;
  content: string; // Markdown
  tags: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'como-escolher-som-casamento',
    title: 'Como Escolher o Som Ideal para seu Casamento: Guia Completo',
    excerpt: 'Descubra a potência correta, tipos de caixas e o que não pode faltar na sonorização da sua festa.',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1920',
    author: {
      name: 'Carlos Som',
      role: 'Engenheiro de Áudio',
      avatar: 'https://i.pravatar.cc/150?u=carlos'
    },
    date: '2024-02-01',
    readTime: '5 min',
    tags: ['Casamento', 'Som', 'Dicas'],
    content: `
## O Segredo de uma Festa Animada

Muitos noivos se preocupam com a decoração e o buffet, mas esquecem que **o som é o coração da festa**. Um sistema mal dimensionado pode deixar os convidados surdos ou, pior, impedir que a música empolgue a pista.

### 1. Entenda o Tamanho do Local

Para um salão fechado de 200m², você precisa de menos potência do que para um sítio aberto. Em locais abertos, o som se dispersa, exigindo **subwoofers** mais potentes.

*   **Até 100 pessoas:** 2 Caixas Ativas de 15" + 1 Subwoofer.
*   **Até 300 pessoas:** Sistema de PA completo com 4 graves.

### 2. A Importância do Grave (Subwoofer)

Não economize nos graves. São eles que fazem as pessoas "sentirem" a música. Sem um bom subwoofer, a música fica "magra" e a pista não decola.

### 3. Microfones para a Cerimônia

Nada pior do que o microfone falhar na hora do "Sim". Opte sempre por microfones UHF (frequência ultra alta) que não sofrem interferência de rádios ou celulares.

> **Dica de Ouro:** Sempre tenha um microfone com fio de backup. Baterias acabam, cabos não.

Na X-Produções, todos os nossos kits de casamento já incluem redundância para garantir zero falhas.
    `
  },
  {
    slug: 'iluminacao-cenica-diferenca',
    title: 'Por que a Iluminação Cênica Muda Tudo?',
    excerpt: 'Veja como transformar um salão simples em um ambiente luxuoso apenas usando luzes.',
    coverImage: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&q=80&w=1920',
    author: {
      name: 'Ana Luz',
      role: 'Lighting Designer',
      avatar: 'https://i.pravatar.cc/150?u=ana'
    },
    date: '2024-01-28',
    readTime: '3 min',
    tags: ['Decoração', 'Iluminação', 'Tendências'],
    content: `
## Pintando com a Luz

A iluminação cênica (ou decorativa) serve para valorizar a arquitetura do local e criar aconchego.

### O Poder do PAR LED

Os refletores PAR LED são os coringas. Eles podem:
1.  **Colorir Paredes:** Lavar paredes brancas com a cor da sua decoração.
2.  **Destacar Colunas:** Criar profundidade no salão.
3.  **Valorizar a Mesa do Bolo:** O ponto focal da festa precisa de destaque.

### Quente vs. Fria

*   **Âmbar (Quente):** Cria sensação de luxo e conforto. Ideal para jantares.
*   **Azul/Roxo (Frio):** Traz modernidade e energia. Ótimo para a pista de dança.

Não subestime o poder de um bom projeto de luz!
    `
  }
];
