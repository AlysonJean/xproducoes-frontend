# 🎯 Sistema de Recomendações - PrepareC

## 📋 Visão Geral

O sistema de recomendações do PrepareC foi implementado para melhorar significativamente a experiência do usuário e aumentar as conversões através de sugestões personalizadas e inteligentes de produtos.

## ✨ Tipos de Recomendações

### 1. **Personalizadas** (`personalized`)

- **O que são**: Recomendações baseadas no histórico e preferências do usuário
- **Onde usar**: Dashboard principal do cliente
- **Como funciona**: Analisa reservas anteriores, favoritos e comportamento de navegação
- **Ícone**: Sparkles ✨
- **Cor**: Primary

### 2. **Similares** (`similar`)

- **O que são**: Produtos similares ao que o usuário está visualizando
- **Onde usar**: Páginas de detalhes de equipamentos/kits
- **Como funciona**: Baseado em categoria, preço e características
- **Ícone**: Package 📦
- **Cor**: Info

### 3. **Frequentemente Reservados Juntos** (`frequently-bought`)

- **O que são**: Itens que outros clientes reservaram junto
- **Onde usar**: Páginas de detalhes, carrinho
- **Como funciona**: Análise de padrões de co-ocorrência em reservas
- **Ícone**: Users 👥
- **Cor**: Success

### 4. **Tendências** (`trending`)

- **O que são**: Os mais populares no momento
- **Onde usar**: Dashboard, homepage
- **Como funciona**: Baseado em número de visualizações e reservas recentes
- **Ícone**: TrendingUp 📈
- **Cor**: Warning

### 5. **Novidades** (`new`)

- **O que são**: Produtos recém-adicionados ao catálogo
- **Onde usar**: Dashboard, seção de novidades
- **Como funciona**: Ordenação por data de cadastro
- **Ícone**: Zap ⚡
- **Cor**: Secondary

### 6. **Sazonais** (`seasonal`)

- **O que são**: Produtos relevantes para a época do ano
- **Onde usar**: Campanhas específicas, homepage
- **Como funciona**: Tags sazonais e relevância temporal
- **Ícone**: Award 🏆
- **Cor**: Primary

## 🔧 Como Usar

### Componente RecommendationSection

```tsx
import { RecommendationSection } from '@/components/ui/RecommendationSection';

<RecommendationSection
  type="personalized"
  items={recommendations}
  maxItems={4}
  loading={loading}
  viewAllLink="/equipamentos"
  viewAllText="Ver Mais"
  columns={{ sm: 1, md: 2, lg: 4 }}
/>
```

### Hook useRecommendations

```tsx
import { useRecommendations } from '@/hooks/useRecommendations';

// Uso básico
const { recommendations, loading, error, refetch } = useRecommendations({
  type: 'personalized',
  limit: 8
});

// Recomendações similares
const similar = useRecommendations({
  type: 'similar',
  itemId: equipmentId,
  itemType: 'equipment',
  limit: 4
});

// Frequentemente comprados juntos
const frequentlyBought = useRecommendations({
  type: 'frequently-bought',
  itemId: equipmentId,
  itemType: 'equipment',
  limit: 4
});
```

### Hook useMultipleRecommendations

Para carregar múltiplas seções de uma vez:

```tsx
import { useMultipleRecommendations } from '@/hooks/useRecommendations';

const { personalized, trending, newItems, loading, refetchAll } = useMultipleRecommendations();

// Usar cada seção independentemente
<RecommendationSection type="personalized" items={personalized.recommendations} />
<RecommendationSection type="trending" items={trending.recommendations} />
<RecommendationSection type="new" items={newItems.recommendations} />
```

## 🎨 Props do RecommendationSection

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `type` | `RecommendationType` | obrigatório | Tipo de recomendação |
| `items` | `RecommendationItem[]` | obrigatório | Array de itens |
| `title` | `string` | auto | Título da seção (usa padrão do tipo se não fornecido) |
| `subtitle` | `string` | auto | Subtítulo da seção |
| `maxItems` | `number` | 4 | Número máximo de itens visíveis |
| `showNavigation` | `boolean` | true | Mostrar botões anterior/próximo |
| `loading` | `boolean` | false | Estado de carregamento |
| `emptyMessage` | `string` | padrão | Mensagem quando não há itens |
| `viewAllLink` | `string` | - | Link para ver todos |
| `viewAllText` | `string` | "Ver Todos" | Texto do botão ver todos |
| `columns` | `object` | `{sm:1, md:2, lg:4}` | Grid responsivo |
| `onItemClick` | `function` | - | Callback ao clicar em item |
| `onViewAll` | `function` | - | Callback ao clicar em ver todos |

## 📡 API Endpoints

Todos os endpoints de recomendação foram adicionados ao `recommendationAPI`:

```typescript
// Backend endpoints esperados
GET /api/recommendations/personalized?limit=8
GET /api/recommendations/similar/:type/:id?limit=4
GET /api/recommendations/frequently-bought/:type/:id?limit=4
GET /api/recommendations/trending?limit=8&category=:category
GET /api/recommendations/new?limit=8&category=:category
GET /api/recommendations/seasonal?limit=8
GET /api/recommendations/based-on-favorites?limit=8
POST /api/recommendations/complementary { items: [], limit: 4 }
GET /api/recommendations/category/:categoryId?limit=8
GET /api/recommendations/budget?min=x&max=y&limit=8
```

## 🚀 Implementações Atuais

### 1. Dashboard do Cliente (`ClientDashboardPage.tsx`)

- ✅ Recomendações Personalizadas
- ✅ Tendências
- ✅ Novidades

### 2. Página de Detalhes de Equipamento (`EquipmentDetailPage.tsx`)

- ✅ Produtos Similares
- ✅ Frequentemente Reservados Juntos

## 🎯 Próximas Implementações Sugeridas

### Alta Prioridade

1. **Página de Carrinho**: Recomendações complementares
2. **Página de Favoritos**: Similares aos favoritos
3. **Após Completar Reserva**: "Você também pode gostar"
4. **Homepage**: Seção de trending + sazonais

### Média Prioridade

5. **Página de Categoria**: Mais populares da categoria
2. **Busca**: Sugestões baseadas na busca
3. **Perfil do Usuário**: Histórico personalizado
4. **Email Marketing**: Recomendações por email

### Baixa Prioridade

9. **Pop-ups de Exit Intent**: Última chance com recomendações
2. **Notificações Push**: Novidades personalizadas

## 💡 Dicas de Otimização

### Performance

- As recomendações são carregadas de forma assíncrona
- Usa skeleton loading para melhor UX
- Cache no lado do cliente pode ser implementado

### UX

- Limite de 4-8 itens por seção para não sobrecarregar
- Use navegação (prev/next) para mais itens
- Empty states claros quando não há recomendações
- Loading states informativos

### SEO

- Links internos para melhor crawling
- Alt texts descritivos nas imagens
- Structured data para produtos recomendados

## 📊 Métricas Sugeridas

Track estas métricas para otimizar o sistema:

1. **Click-Through Rate (CTR)**: % de cliques nas recomendações
2. **Conversion Rate**: % de recomendações que viram reservas
3. **Average Order Value**: Aumento no valor médio por recomendações
4. **Engagement Time**: Tempo gasto na seção de recomendações
5. **A/B Testing**: Diferentes algoritmos e layouts

## 🔮 Futuras Melhorias

### Machine Learning

- Algoritmos de collaborative filtering
- Content-based filtering
- Hybrid approach

### Personalização Avançada

- Levar em conta horário do dia
- Dispositivo usado (mobile vs desktop)
- Localização geográfica
- Histórico de cliques (não só compras)

### Social Proof

- "X pessoas estão vendo isto agora"
- "Reservado X vezes esta semana"
- Reviews inline nas recomendações

### Gamificação

- Badges para descobrir todos os itens de uma categoria
- Pontos por explorar recomendações

## 🐛 Troubleshooting

### Recomendações não aparecem

1. Verificar se o endpoint da API está funcionando
2. Checar console para erros de rede
3. Validar que `items.length > 0`
4. Confirmar que o backend retorna dados no formato correto

### Performance lenta

1. Implementar cache no frontend
2. Reduzir `limit` de itens
3. Implementar lazy loading
4. Otimizar imagens das recomendações

### Dados não personalizados

1. Verificar se usuário está autenticado
2. Confirmar que há histórico suficiente
3. Implementar fallback para trending/new

## 📝 Changelog

### v1.0.0 (2026-02-03)

- ✅ Componente `RecommendationSection` criado
- ✅ Hook `useRecommendations` implementado
- ✅ Hook `useMultipleRecommendations` para múltiplas seções
- ✅ 6 tipos de recomendações suportados
- ✅ API endpoints definidos
- ✅ Integração no Dashboard do Cliente
- ✅ Integração na Página de Detalhes de Equipamento
- ✅ UI responsiva e acessível
- ✅ Estados de loading e empty

## 🤝 Contribuindo

Para adicionar novos tipos de recomendações:

1. Adicione o tipo em `RecommendationType`
2. Configure visual/ícone em `getRecommendationConfig()`
3. Implemente endpoint na API
4. Adicione caso no switch do hook `useRecommendations`
5. Documente aqui no README

## 📚 Recursos Adicionais

- [Amazon's Recommendation Engine](https://www.cs.umd.edu/~samir/498/Amazon-Recommendations.pdf)
- [Netflix Recommendation Algorithm](https://research.netflix.com/research-area/recommendations)
- [Best Practices for E-commerce Recommendations](https://www.optimizely.com/optimization-glossary/product-recommendations/)

---

**Desenvolvido com ❤️ para melhorar a experiência do usuário no PrepareC**
