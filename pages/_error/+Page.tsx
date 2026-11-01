import { buttonVariants } from '../../src/components/ui/Button'

// Achados (auditoria do design system): sem <h1> (o código era um h2 e o título um h3), cor da marca
// errada (azul/vermelho fixos do Tailwind, `text-white`) e o botão "Tentar Novamente" que só
// levava para a home. Agora: um único h1, tokens do tema e rótulos que dizem o que o botão faz.
export function Page({ is404 }: { is404: boolean }) {
  if (is404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-background px-4 sm:px-6 lg:px-8">
        <p suppressHydrationWarning className="text-9xl font-extrabold text-primary" aria-hidden="true">404</p>
        <h1 suppressHydrationWarning className="mt-4 text-3xl font-bold text-foreground tracking-tight sm:text-5xl text-center">Página não encontrada</h1>
        <p className="mt-2 text-base text-muted-foreground max-w-lg text-center">
            Desculpe, não conseguimos encontrar a página que você está procurando. Talvez ela tenha sido movida ou excluída.
        </p>
        <div className="mt-10">
          <a href="/" className={buttonVariants({ size: 'md' })}>
            Voltar para a home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-background px-4 sm:px-6 lg:px-8">
      <p suppressHydrationWarning className="text-9xl font-extrabold text-destructive" aria-hidden="true">500</p>
      <h1 suppressHydrationWarning className="mt-4 text-3xl font-bold text-foreground tracking-tight sm:text-5xl text-center">Erro interno</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-lg text-center">
          Algo deu errado no nosso servidor. Estamos trabalhando para corrigir isso.
      </p>
      <div className="mt-10">
          <a href="/" className={buttonVariants({ size: 'md' })}>
            Voltar para a home
          </a>
      </div>
    </div>
  );
}
