# Design System — X Produções

Padrão único para todas as telas: site público, área do cliente, painel do colaborador, painel admin,
mural social e telão. Revisado na auditoria ponta a ponta de nov/2026 (valores de contraste medidos).

## 1. Cores: só tokens

Os tokens ficam em `src/styles/themes/theme-variables.css`, com um bloco para o tema claro (`:root`) e outro para o escuro (`.dark`). O tema é aplicado pela classe `dark` no `<html>`. Nunca use cor fixa onde existe token.

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `background` / `foreground` | fundo da página, texto principal | branco / grafite | quase preto / branco |
| `card` / `card-foreground` | superfícies (cards, painéis, modais) | branco | um tom acima do fundo |
| `muted` / `muted-foreground` | fundo suave; texto secundário (5,7:1) | cinza claro / cinza | grafite / cinza azulado |
| `border` / `input` / `ring` | bordas, borda de campo, anel de foco | — | — |
| `primary` / `primary-foreground` | **marca**: ações principais, links, destaques | azul petróleo #003049 / branco | prata / quase preto |
| `secondary` | ação alternativa sólida | verde | grafite |
| `accent` | hover sutil (`hover:bg-accent hover:text-accent-foreground`) | azul claro | laranja |
| `destructive` | erro, excluir (4,8:1) | #dc2626 | #dc2626 |
| `success` | sucesso, pago, confirmado | verde | verde-esmeralda |
| `warning` | pendente, atenção (5,05:1) | âmbar escuro | ouro |
| `info` | informativo, "em breve" (5,95:1) | azul céu escuro | azul céu |

Regras:
- **Par fundo + texto sempre do mesmo token.** Use `bg-primary text-primary-foreground`, `bg-destructive text-destructive-foreground` etc.
  - Nunca `bg-primary text-white`: no tema escuro o primary é prata, e o texto branco some.
- **Fundo suave de status:** `bg-{status}/10 text-{status} border-{status}/20`.
  - Exemplos: `bg-success/10 text-success`, `bg-warning/10 text-warning`.
- **Nunca** `text-{status}-foreground` sobre um fundo `/10`, porque essa cor foi feita para ir sobre o fundo **sólido** do status.
- **Não existem**, não use: `bg-surface`, `text-danger`, `text-tertiary` e a escala `primary-50…950`.
- **Não use** como cor da marca ou do painel: índigo, roxo, rosa ou teal. Use `primary`.
- **Gráficos:** `hsl(var(--primary))`, `hsl(var(--success))` etc., ou os tokens `chart-1…5`. Nunca hex fixo.

### Mapa de substituição

| Era | Vira |
|---|---|
| `bg-white` | `bg-card` (superfície) · `bg-background` (página) · `bg-popover` (menu) |
| `bg-gray-50/100`, `bg-slate-50/100`, `bg-zinc-800/900` | `bg-muted` |
| `text-gray-900/800/700`, `text-black`, `text-slate-900` | `text-foreground` |
| `text-gray-600/500/400/300`, `text-slate-500/600` | `text-muted-foreground` |
| `border-gray-*`, `border-slate-*`, `border-white/20` | `border-border` (campos: `border-input`) |
| `blue-*`, `indigo-*`, `purple-*`, `sky-*` como marca | `primary` (`bg-primary/10 text-primary`, `bg-primary text-primary-foreground`) |
| `blue-*`, `sky-*` informativo | `info` |
| `green-*`, `emerald-*`, `teal-*` (sucesso, pago) | `success` |
| `amber-*`, `yellow-*`, `orange-*` (atenção, pendente, estrela) | `warning` |
| `red-*`, `rose-*`, `*-danger` | `destructive` |
| `text-white` sobre um token | `text-{token}-foreground` |
| `bg-surface`, `from-surface` | `bg-background` / `bg-card` / `bg-muted`; sobre foto: `from-black/70` |
| `text-tertiary`, `text-secondary` (como cor de texto) | `text-muted-foreground` |
| `focus:ring-blue-500`, `focus:ring-primary`, `focus:outline-none` sem anel | `focus-visible:ring-2 focus-visible:ring-ring` |
| `text-[8px]`, `text-[9px]`, `text-[10px]` | `text-xs` no mínimo (`text-sm` para conteúdo) |
| `rounded-[32px]`, `rounded-[40px]`… | `rounded-3xl` (escala: `rounded-sm/md/lg/xl/2xl/3xl`) |
| `bg-black bg-opacity-50` (não existe no Tailwind v4) | `bg-black/50` (ou use o `<Modal>`) |
| `R$ ${valor.toFixed(2)}` | `formatPrice(valor)` |

**Exceções legítimas** (podem manter cor fixa):
- Texto **sobre foto**, hero escuro ou lightbox: `text-white` com gradiente `from-black/70`.
- **Telão (TVPage) e slides do mural**: modo apresentação escuro fixo (`bg-black text-white`, `text-white/70`), mas **consistente dentro da tela**, sem misturar tokens do tema.
- **Marcas de terceiros**: Google, Facebook, WhatsApp (#25D366), Instagram.
- Moldura branca do QR Code (`bg-white`).
- Scrims de imagem (`bg-black/40`, `bg-black/60`).

## 2. Componentes: use o padrão

Importe de `src/components/ui/StandardComponents.tsx`:

| Precisa de | Use | Não faça |
|---|---|---|
| botão | `<Button variant size isLoading leftIcon>` | `<button className="bg-primary …">` |
| link com cara de botão | `<Link className={buttonVariants({ variant: 'outline', size: 'sm' })}>` | copiar as classes do botão |
| campo | `<Input label error description leftIcon>`, `<Select label options>`, `<Textarea label>`, `<Checkbox label>` | `<input className="border rounded …">` com `<label>` solto |
| selo de status | `<Badge variant="success\|warning\|destructive\|info\|primary\|ghost\|outline">` | span colorido à mão; enum cru ("CONFIRMED") |
| aviso, erro, sucesso | `<Alert variant="error\|warning\|success\|info" title action>` | div `bg-red-50 text-red-700` |
| janela | `<Modal title>` / `<ConfirmModal>` | `fixed inset-0` à mão, `confirm()`/`alert()` nativos |
| card | `<Card>`, `<SimpleCard title>`, `<StatsCard>` | div `bg-white rounded-xl shadow` |
| carregando (página/seção) | `<BrandLoader label="Carregando reservas…">` | texto solto "Carregando…" |
| carregando (botão/inline) | `isLoading` do Button, ou `<Loader2 className="animate-spin">` | spinner `border-b-2` à mão |
| esqueleto | `<Skeleton>`, `<CardSkeleton>`, `<ListSkeleton>` | `animate-pulse` à mão |
| paginação | `<Pagination>` | botões "Anterior/Próxima" de enfeite |

- **Variantes de Button:** primary, secondary, outline, ghost, destructive, success, warning, info.
- **Tamanhos:** xs (32px), sm (40px), md (48px), lg (56px), xl (64px), icon (40px). Input e Select usam as mesmas alturas.
- **Status de domínio:** use os módulos compartilhados, nunca uma lista local.
  - Reserva, entrega e pagamento: `src/utils/bookingStatus.ts`, com `BOOKING_STATUS_OPTIONS`, `bookingStatusLabel`, `bookingStatusVariant`, `DELIVERY_STATUS_OPTIONS` e `PAYMENT_STATUS_OPTIONS`.
  - Funções de colaborador: `src/utils/collaboratorRoles.ts`, que espelha o enum do backend.

## 3. Estrutura de página

- **Público:** `PageLayout` com título, breadcrumbs e SEO. O PageLayout já renderiza o `<h1>`, então a página não deve ter outro.
- **Admin:** `AdminLayout title breadcrumbs`. Título e breadcrumb constantes, sem trocar quando os dados chegam. Breadcrumbs com `href`.
- **Colaborador:** `CollaboratorLayout title breadcrumbs`.
- **Um único `<h1>` por página.** Os níveis descem sem pular (h1 → h2 → h3).
- **Estados obrigatórios em toda tela que busca dados:**
  - carregando: `BrandLoader`/`Skeleton` dentro do layout;
  - erro: `<Alert variant="error" action={<Button size="sm">Tentar de novo</Button>}>`;
  - vazio: mensagem clara.
  - Erro de API nunca pode aparecer como "nenhum item".
- Tabelas dentro de `overflow-x-auto`. Linhas flex que podem estourar a 375px levam `flex-wrap` ou `flex-col sm:flex-row`.

## 4. Acessibilidade (mínimo)

- **Todo controle interativo tem foco visível** (`focus-visible:ring-2 focus-visible:ring-ring`). Os componentes padrão já têm.
- **Botão só com ícone tem `aria-label`** (por exemplo, "Editar {nome}"). Botão de alternar (favoritar, aba, filtro) tem `aria-pressed` ou `aria-selected`.
- **Nada de `<div onClick>`:** use `<button type="button">` ou `<Link>`.
- **Ações não podem aparecer só no hover** (`opacity-0 group-hover:opacity-100`), porque somem no toque e no teclado. Use `md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100`.
- **Todo campo tem rótulo:** prop `label` dos componentes, ou `aria-label`.
- **Texto:** nunca abaixo de 12px (`text-xs`). Conteúdo legível (e-mail, telefone, preço, status) em `text-sm`.
- **Alvo de toque:** 44px ou mais no celular.

## 5. Texto

- Português do Brasil em toda a interface. Proibido o pt-PT ("registado", "equipa", "a carregar") e o inglês ("Draft", "Live", "Submit").
- Sem jargão inventado ("Purga", "Terminal", "Protocolo", "Abortar"). Use "Excluir", "Cancelar", "Buscar".
- **Nada de dado falso na tela:** KPI fixo, "tempo real" que não é, avatar de banco de imagens, CNPJ 00.000.000. Se não há dado real, não mostre o card.
- **Nada de botão morto:** sem `onClick` ou destino, o botão não aparece.

## 6. CSS global

- `src/index.css`: Tailwind v4 + `tw-animate-css` (`animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-*`) + utilitários próprios.
- Regra base: `border` sem cor usa `--border`.
- `--radius` (0,5rem) é a base de `rounded-sm/md/lg`.
- Classes dinâmicas (`` bg-${cor}/10 ``, `` grid-cols-${n} ``) **não funcionam**, porque o Tailwind só gera classes escritas por inteiro no código. Use mapas de classes completas.
