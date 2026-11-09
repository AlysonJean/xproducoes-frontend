import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { apiFetch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORT_EMAIL } from '../data/site';

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

// D8c (aprovada em 02/11/2026), parte 2: "Excluir minha conta" pede a senha, fica bloqueado para a equipe e adiado se
// houver reserva futura confirmada ou pagamento pendente. Achado: o modal prometia "remover permanentemente", não
// pedia senha nem dizia o que fica guardado, e a conta da equipe também se excluía. O texto abaixo é o mesmo da
// Política de Privacidade (seção "Exclusão da conta"): mudou a regra, mudam os dois.
const STAFF_ROLES = ['ADMIN', 'MANAGER', 'OPERATOR'];

const ACCOUNT_DELETION_RULES = [
  'Se você tem uma reserva confirmada cujo evento ainda não terminou, uma reserva contratada com pagamento pendente ou um comprovante de pagamento que a equipe ainda não conferiu, a exclusão fica adiada até o fim do evento ou até o pagamento ser acertado. Até lá, a conta continua funcionando, e você pode cancelar o pedido aqui.',
  'Para colaboradores, a exclusão fica adiada enquanto houver escala ativa num evento futuro ou pagamento pendente.',
  'Conta de cliente sem nenhuma reserva: é apagada por completo.',
  'Nos outros casos, a conta é anonimizada: saem nome, e-mail, telefone, endereço, foto, preferências, notificações, favoritos, carrinho, login social e sessões.',
  'A avaliação fica só com as estrelas, sem o comentário e as fotos. Pedidos que nunca foram contratados são cancelados, e os anexos e as mensagens deles são apagados.',
  'Reservas contratadas ou pagas guardam só o que a contabilidade precisa: data, itens, valores, situação, cupom, comprovante de pagamento e o chat da reserva. Elas ficam por 5 anos contados de 1º de janeiro do ano seguinte ao evento, sem o nome, o e-mail e o telefone.',
  'O código da reserva leva até 5 letras do início do nome do cliente e continua nesse registro.',
  'As cópias de segurança somem em até 90 dias.',
];

const PASSWORD_REQUIRED = 'Digite a senha da sua conta.';

interface DeletionResult {
  outcome: 'deleted' | 'postponed';
  message?: string;
}

const statusOf = (err: unknown) => (err as { status?: number } | null)?.status;
const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const dateBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// A conta saiu: os cookies da sessão já foram apagados pelo servidor. Só o estado do site muda (sem ir para o login),
// para a pessoa ver a confirmação na própria página.
const signOutHere = () => window.dispatchEvent(new Event('auth:logout'));

export const LGPDPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Pedido de exclusão adiado de antes (uma leitura ao abrir a página, sem repetir).
  useEffect(() => {
    if (!isAuthenticated || isStaff) return;
    let active = true;
    apiFetch<{ requestedAt: string | null }>('/users/me/deletion-request')
      .then((data) => {
        if (active) setDeletionRequestedAt(data?.requestedAt ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAuthenticated, isStaff]);

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const data = await apiFetch('/users/me/data-export');
      downloadJson(data, 'meus-dados.json');
      setFeedback({ type: 'success', message: 'Seus dados foram baixados com sucesso.' });
    } catch (err) {
      setFeedback({ type: 'error', message: messageOf(err, 'Não foi possível exportar seus dados.') });
    } finally {
      setIsExporting(false);
    }
  };

  const openModal = () => {
    setPassword('');
    setPasswordError(undefined);
    setModalNotice(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!isDeleting) setModalOpen(false);
  };

  const handleRequestDeletion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setPasswordError(PASSWORD_REQUIRED);
      return;
    }
    setIsDeleting(true);
    setPasswordError(undefined);
    setModalNotice(null);
    try {
      const result = await apiFetch<DeletionResult>('/users/me/request-deletion', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setModalOpen(false);
      if (result?.outcome === 'postponed') {
        setDeletionRequestedAt(new Date().toISOString());
        setFeedback({ type: 'success', message: result.message || 'Seu pedido foi registrado. A exclusão da conta fica adiada.' });
      } else {
        setFeedback({ type: 'success', message: 'Sua conta foi excluída. Você saiu da conta neste aparelho.' });
        signOutHere();
      }
    } catch (err) {
      const status = statusOf(err);
      if (status === 401) {
        setPasswordError(messageOf(err, 'Senha incorreta. Nada foi excluído.'));
      } else if (status === 403) {
        setModalOpen(false);
        setFeedback({ type: 'error', message: messageOf(err, `Contas da equipe não se excluem pelo site. Escreva para ${SUPPORT_EMAIL}.`) });
      } else {
        setModalNotice({ type: 'error', message: messageOf(err, 'Não foi possível processar a exclusão.') });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendLink = async () => {
    setIsSendingLink(true);
    setModalNotice(null);
    try {
      await apiFetch('/users/me/request-deletion/email', { method: 'POST' });
      setModalNotice({
        type: 'success',
        message: 'Enviamos um link para o e-mail da sua conta. Ele vale por 1 hora e funciona uma vez só: abra o link e confirme a exclusão.',
      });
    } catch (err) {
      setModalNotice({ type: 'error', message: messageOf(err, 'Não foi possível enviar o link agora.') });
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    try {
      await apiFetch('/users/me/cancel-deletion', { method: 'POST' });
      setDeletionRequestedAt(null);
      setFeedback({ type: 'success', message: 'Pedido de exclusão cancelado. A conta continua ativa.' });
    } catch (err) {
      setFeedback({ type: 'error', message: messageOf(err, 'Não foi possível cancelar o pedido agora.') });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <PageLayout title="LGPD" description="Informações sobre tratamento de dados">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
        {/* Achados: havia um 2º <h1> "LGPD" (o PageLayout já renderiza o título) e um parágrafo de
            enchimento ("melhores práticas observadas em grandes empresas") — removidos. */}
        <div>
          <p className="text-muted-foreground">
            Informamos como tratamos dados pessoais, direitos dos titulares e canais de contato para solicitações.
            Para dúvidas fora do que pode ser feito diretamente aqui, envie email para{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
              {SUPPORT_EMAIL}
            </a>
            .
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
            <h2 className="text-lg font-semibold text-foreground">Exercer seus direitos</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleExport} isLoading={isExporting} variant="outline">
                Baixar meus dados
              </Button>
              {!isStaff && !deletionRequestedAt && (
                <Button onClick={openModal} variant="destructive">
                  Excluir minha conta
                </Button>
              )}
            </div>

            {isStaff && (
              <p className="text-sm text-muted-foreground">
                Contas da equipe (administrador, gerente e operador) não se excluem pelo site: escreva para{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            )}

            {deletionRequestedAt && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3" role="status">
                <p className="text-sm text-foreground">
                  Você pediu a exclusão da conta em {dateBR(deletionRequestedAt)}. Ela fica adiada até o fim do evento
                  confirmado ou até o pagamento pendente ser acertado. Até lá, a conta continua funcionando.
                </p>
                <Button onClick={handleCancelDeletion} isLoading={isCancelling} variant="outline">
                  Cancelar pedido de exclusão
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Faça login para baixar seus dados ou solicitar a exclusão da sua conta diretamente por aqui.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Excluir minha conta" size="lg">
        <form onSubmit={handleRequestDeletion} className="space-y-5" noValidate>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
            {ACCOUNT_DELETION_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <Input
            label="Senha da conta"
            type="password"
            name="password"
            autoComplete="current-password"
            showPasswordToggle
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
            error={passwordError}
          />

          <button
            type="button"
            onClick={handleSendLink}
            disabled={isSendingLink}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
          >
            Entro com o Google / não sei a senha: receber link por e-mail
          </button>

          {modalNotice && (
            <Alert variant={modalNotice.type === 'success' ? 'success' : 'error'} description={modalNotice.message} />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" isLoading={isDeleting}>
              Excluir minha conta
            </Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
};

export default LGPDPage;
