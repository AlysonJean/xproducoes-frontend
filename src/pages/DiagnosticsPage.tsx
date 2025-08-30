// frontend/src/pages/DiagnosticsPage.tsx

import { DiagnosticTool } from '../components/DiagnosticTool';

export const DiagnosticsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-6">Diagnóstico do Sistema</h1>

      <div className="mb-8">
        <p className="mb-4">
          Esta página oferece ferramentas de diagnóstico para identificar e resolver problemas no
          sistema. Se você está enfrentando dificuldades, pode usar estas ferramentas para verificar
          o status dos componentes e serviços.
        </p>
      </div>

      <DiagnosticTool />

      <div className="mt-12 bg-card p-6 rounded-lg shadow-lg border border-border">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Problemas Comuns</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg text-foreground">
              Erro 401 - Não Autorizado
            </h3>
            <p className="text-muted-foreground mb-2">
              Este erro ocorre quando sua sessão expirou ou você não está autenticado.
            </p>
            <p className="font-medium">Solução: Faça login novamente.</p>
          </div>

          <div>
            <h3 className="font-bold text-lg text-foreground">
              Erro 500 - Erro Interno do Servidor
            </h3>
            <p className="text-muted-foreground mb-2">
              Este erro indica um problema no servidor.
            </p>
            <p className="font-medium">
              Solução: Verifique a conexão com o servidor e tente novamente mais tarde.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg text-foreground">
              Problemas de Carregamento
            </h3>
            <p className="text-muted-foreground mb-2">
              Se os dados não estiverem carregando corretamente.
            </p>
            <p className="font-medium">
              Solução: Verifique sua conexão com a internet e limpe o cache do navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
