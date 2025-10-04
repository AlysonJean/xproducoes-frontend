# 🎨 Sistema de Design Enterprise - Guia de Uso

## Visão Geral

Este sistema unifica todos os componentes de UI do projeto em um padrão enterprise consistente, baseado nas melhores práticas de shadcn/ui, Radix UI, Mantine e Ant Design.

## Principais Melhorias

### ✅ Componentes Refatorados

- **BaseModal** → Agora usa Modal padronizado
- **FormModal** → Integração com Form, FormActions e Button
- **ContactModal** → FormSection, Input, Textarea, Alert padronizados
- **ConfirmModal** → Button e Alert padronizados
- **BookingForm** → Form, FormSection, Input, Select, Textarea
- **EquipmentFormPage** → Formulário completo padronizado
- **LoginForm** → Input com validação e estados padronizados

### 🎯 Benefícios Implementados

1. **Consistência Visual**: Todos os componentes seguem o mesmo padrão de cores, tipografia e espaçamento
2. **Acessibilidade**: Labels automáticos, ARIA attributes, navegação por teclado
3. **Responsividade**: Grid system responsivo e componentes que se adaptam
4. **Estados Visuais**: Loading, error, success, disabled padronizados
5. **Validação**: Sistema unificado de exibição de erros
6. **Tipagem**: TypeScript completo com tipos bem definidos

## Como Usar

### Importação

```tsx
import { 
  Button, 
  Input, 
  Textarea, 
  Select, 
  Modal, 
  Alert, 
  Form, 
  FormSection, 
  FormActions 
} from '../components/ui/StandardComponents';
```

### Exemplos de Uso

#### 1. Formulário Completo

```tsx
<Form onSubmit={handleSubmit}>
  <FormSection 
    title="Informações Pessoais"
    description="Digite suas informações básicas"
  >
    <Input
      label="Nome"
      placeholder="Digite seu nome"
      error={errors.name}
      description="Nome que aparecerá no perfil"
    />
    
    <Select
      label="Categoria"
      options={[
        { value: '1', label: 'Opção 1' },
        { value: '2', label: 'Opção 2' }
      ]}
      error={errors.category}
    />
  </FormSection>

  <FormActions>
    <Button type="button" variant="outline">
      Cancelar
    </Button>
    <Button type="submit" variant="primary" isLoading={loading}>
      Salvar
    </Button>
  </FormActions>
</Form>
```

#### 2. Modal com Formulário

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Adicionar Item"
  size="lg"
>
  <FormSection>
    <Input
      label="Nome do Item"
      placeholder="Digite o nome"
    />
    
    <Textarea
      label="Descrição"
      placeholder="Descreva o item..."
      rows={4}
    />
  </FormSection>
  
  <div className="flex justify-end space-x-3 mt-6">
    <Button variant="outline" onClick={onClose}>
      Cancelar
    </Button>
    <Button variant="primary" onClick={handleSave}>
      Salvar
    </Button>
  </div>
</Modal>
```

#### 3. Alertas e Feedback

```tsx
<Alert 
  variant="success" 
  title="Sucesso!" 
  description="Item salvo com sucesso."
  onClose={dismissAlert}
/>

<Alert 
  variant="error" 
  title="Erro de Validação"
>
  <ul className="list-disc list-inside space-y-1">
    <li>Nome é obrigatório</li>
    <li>Email deve ser válido</li>
  </ul>
</Alert>
```

#### 4. Busca e Filtros

```tsx
<SearchAndFilters
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Buscar equipamentos..."
  resultsCount={results.length}
  itemLabel="equipamento"
  showClearFilters={hasFilters}
  onClearFilters={clearFilters}
  filters={
    <FilterSelect
      label="Categoria"
      value={selectedCategory}
      onChange={setSelectedCategory}
      options={categoryOptions}
    />
  }
/>
```

#### 5. Grid Responsivo

```tsx
<Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
  {items.map(item => (
    <div key={item.id} className="bg-card p-6 rounded-lg border">
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-muted-foreground">{item.description}</p>
    </div>
  ))}
</Grid>
```

## Variantes e Tamanhos

### Button Variants
- `primary` - Ação principal (azul)
- `secondary` - Ação secundária (cinza)
- `outline` - Botão com borda
- `ghost` - Botão transparente
- `destructive` - Ações perigosas (vermelho)
- `success` - Confirmações (verde)
- `warning` - Avisos (amarelo)

### Button Sizes
- `xs` - Extra pequeno (h-7)
- `sm` - Pequeno (h-8)
- `md` - Médio (h-9) - padrão
- `lg` - Grande (h-10)
- `xl` - Extra grande (h-12)

### Alert Variants
- `default` - Neutro
- `info` - Informativo (azul)
- `success` - Sucesso (verde)
- `warning` - Aviso (amarelo)
- `error` - Erro (vermelho)

### Modal Sizes
- `sm` - 384px max-width
- `md` - 512px max-width (padrão)
- `lg` - 768px max-width
- `xl` - 1024px max-width
- `full` - 95vw max-width

## Padrões de Cores

```css
/* Cores Principais */
--primary: hsl(221.2 83.2% 53.3%)
--primary-foreground: hsl(210 40% 98%)

/* Cores Secundárias */
--secondary: hsl(210 40% 96%)
--secondary-foreground: hsl(222.2 84% 4.9%)

/* Estados */
--destructive: hsl(0 84.2% 60.2%)
--success: hsl(142.1 76.2% 36.3%)
--warning: hsl(47.9 95.8% 53.1%)

/* Superfícies */
--background: hsl(0 0% 100%)
--card: hsl(0 0% 100%)
--border: hsl(214.3 31.8% 91.4%)

/* Texto */
--foreground: hsl(222.2 84% 4.9%)
--muted-foreground: hsl(215.4 16.3% 46.9%)
```

## Acessibilidade

Todos os componentes incluem:

- ✅ **Labels apropriados** - Associação correta com controles
- ✅ **ARIA attributes** - Semântica para screen readers
- ✅ **Navegação por teclado** - Tab, Enter, Escape funcionais
- ✅ **Indicadores visuais** - Focus, hover, estados claros
- ✅ **Contraste adequado** - WCAG AA compliance
- ✅ **Textos alternativos** - Ícones com sr-only labels

## Migração

Para migrar componentes existentes:

1. **Substitua imports**: Use `StandardComponents` ao invés de componentes individuais
2. **Atualize props**: Verifique se as props estão alinhadas com as interfaces
3. **Ajuste estilos**: Remova classes CSS customizadas desnecessárias
4. **Teste acessibilidade**: Verifique navegação por teclado e screen readers

## Exemplo Completo

Veja `StandardComponentsShowcase.tsx` para um exemplo completo demonstrando todos os componentes e suas variações.

---

**Desenvolvido para X Produçoes e Eventos** - Sistema de design enterprise unificado
