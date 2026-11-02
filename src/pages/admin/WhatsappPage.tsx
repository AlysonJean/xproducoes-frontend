
import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { apiFetch } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshCw, LogOut, MessageSquare, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Alert, Button, Card, ConfirmModal } from '../../components/ui/StandardComponents';

// A página ficava fora do AdminLayout (sem sidebar nem breadcrumb) e usava cores fixas de tema claro
// (bg-white, text-gray-800) — no tema escuro o título "Escaneie o QR Code" ficava branco sobre branco.
const PAGE_TITLE = 'WhatsApp';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'WhatsApp' }];

export default function WhatsappPage() {
  const [status, setStatus] = useState<{ isReady: boolean; qrCode: string | null }>({ isReady: false, qrCode: null });
  const [loading, setLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const { addNotification } = useNotifications();

  const fetchStatus = useCallback(async () => {
    try {
      // Cast the response since apiFetch returns Promise<unknown> or Promise<any>
      const data = await apiFetch('/whatsapp/status') as { isReady: boolean; qrCode: string | null };
      setStatus(data);
      setStatusError(null);
    } catch {
      // Antes o erro era silenciado e a tela ficava em "Carregando QR Code..." para sempre.
      // O polling continua tentando; o aviso some quando uma consulta der certo.
      setStatusError('Não foi possível consultar o serviço do WhatsApp.');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Polling a cada 30s (otimizado para Free Tier Neon: 1.200 → 120 requests/hora).
    // Achado (auditoria ponta a ponta): seguia com a aba escondida — /whatsapp/status passa por
    // authenticateWithDB (lê o banco). Pausa com a aba escondida e, ao voltar, consulta na hora.
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchStatus();
    }, 30000);
    const onVisibilityChange = () => {
      if (!document.hidden) fetchStatus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchStatus]);

  const handleRestart = async () => {
    try {
      setLoading(true);
      await apiFetch('/whatsapp/restart', { method: 'POST' });
      addNotification({ type: 'success', title: 'Sucesso', message: 'Serviço reiniciado. Aguarde novo QR Code.' });
      setStatus({ isReady: false, qrCode: null });
    } catch {
        addNotification({ type: 'error', title: 'Erro', message: 'Falha ao reiniciar serviço.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(false);
    try {
      setLoading(true);
      await apiFetch('/whatsapp/logout', { method: 'POST' });
      addNotification({ type: 'success', title: 'Sucesso', message: 'Desconectado.' });
      setStatus({ isReady: false, qrCode: null });
    } catch {
        addNotification({ type: 'error', title: 'Erro', message: 'Falha ao desconectar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Conexão do WhatsApp</h2>
              <p className="text-sm text-muted-foreground">Número usado para enviar as notificações automáticas.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={loading}
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Reiniciar serviço
          </Button>
        </div>

        {statusError && (
          <Alert
            variant="error"
            title="Erro ao consultar o status"
            description={statusError}
            action={<Button size="sm" variant="outline" onClick={fetchStatus}>Tentar de novo</Button>}
          />
        )}

        <Card className="p-8 text-center">
          {status.isReady ? (
              <div className="py-12">
                  <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={40} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">WhatsApp conectado</h3>
                  <p className="text-muted-foreground mb-6">O serviço está pronto para enviar notificações.</p>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    disabled={loading}
                    leftIcon={<LogOut className="h-4 w-4" />}
                  >
                    Desconectar
                  </Button>
              </div>
          ) : (
              <div className="py-8">
                  <h3 className="text-lg font-medium text-foreground mb-6">Escaneie o QR Code para conectar</h3>

                  {status.qrCode ? (
                      // Moldura branca do QR Code: exceção do guia (o leitor precisa de contraste fixo).
                      <div className="inline-block p-4 bg-white border-2 border-border rounded-lg shadow-sm">
                          <QRCode value={status.qrCode} size={256} />
                      </div>
                  ) : (
                      <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center mx-auto text-muted-foreground flex-col gap-2" role="status">
                          {statusError ? (
                            <span className="text-sm px-4">QR Code indisponível enquanto o serviço não responde.</span>
                          ) : (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin mx-auto" aria-hidden="true" />
                              <span className="text-sm">{loading ? 'Reiniciando…' : 'Carregando QR Code…'}</span>
                            </>
                          )}
                      </div>
                  )}

                  <p className="mt-6 text-sm text-muted-foreground max-w-md mx-auto">
                      Abra o WhatsApp no seu celular, vá em Aparelhos conectados &gt; Conectar aparelho e aponte a câmera.
                  </p>
              </div>
          )}
        </Card>
      </div>

      {/* Era um confirm() nativo do navegador. */}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Desconectar o WhatsApp?"
        message="As notificações automáticas param até você escanear um novo QR Code."
        variant="danger"
        confirmText="Desconectar"
        cancelText="Cancelar"
      />
    </AdminLayout>
  );
}
