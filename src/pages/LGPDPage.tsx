import React, { useState } from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const LGPDPage: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const data = await apiFetch('/users/me/data-export');
      downloadJson(data, 'meus-dados.json');
      setFeedback({ type: 'success', message: 'Seus dados foram baixados com sucesso.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Não foi possível exportar seus dados.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    setIsDeleting(true);
    try {
      await apiFetch('/users/me/request-deletion', { method: 'POST' });
      setConfirmOpen(false);
      logout();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Não foi possível processar a exclusão.' });
      setIsDeleting(false);
    }
  };

  return (
    <PageLayout title="LGPD" description="Informações sobre tratamento de dados">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">LGPD</h1>
          <p className="text-muted-foreground">
            Informamos como tratamos dados pessoais, direitos dos titulares e canais de contato para solicitações.
            Para dúvidas fora do que pode ser feito diretamente aqui, envie email para{' '}
            <strong>suporte@xproducoeseeventos.com.br</strong>.
          </p>
          <p className="text-muted-foreground mt-4">
            Nossa abordagem se inspira nas melhores práticas de privacidade observadas em grandes empresas:
            minimizamos dados, auditamos acessos e oferecemos caminhos claros para solicitações.
          </p>
        </div>

        {feedback && (
          <Alert
            variant={feedback.type === 'success' ? 'success' : 'error'}
            description={feedback.message}
            onClose={() => setFeedback(null)}
          />
        )}

        {isAuthenticated ? (
          <div className="border-t border-border pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Exercer seus direitos</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleExport} isLoading={isExporting} variant="outline">
                Baixar meus dados
              </Button>
              <Button onClick={() => setConfirmOpen(true)} variant="destructive">
                Solicitar exclusão da minha conta
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Faça login para baixar seus dados ou solicitar a exclusão da sua conta diretamente por aqui.
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRequestDeletion}
        title="Excluir meus dados"
        message="Isso vai remover permanentemente seus dados de identificação (nome, email, telefone, etc.) e encerrar sua sessão. Reservas já realizadas são mantidas de forma anônima para fins financeiros/legais. Esta ação não pode ser desfeita. Deseja continuar?"
        confirmText="Sim, excluir meus dados"
        variant="danger"
        isLoading={isDeleting}
      />
    </PageLayout>
  );
};

export default LGPDPage;
