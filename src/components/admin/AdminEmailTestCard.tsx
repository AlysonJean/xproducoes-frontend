// D1 (decisão aprovada em 02/11/2026): os avisos ao dono (orçamento novo, contato, comprovante, chat
// do cliente) saem por e-mail para o ADMIN_EMAIL do servidor, sem esperar o envio. Se o SMTP recusa
// (hoje, 535 na caixa da GoDaddy), ninguém fica sabendo. Este cartão manda na hora um e-mail de teste
// e mostra o resultado: enviado, ou o motivo e o erro do servidor de e-mail.
import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Alert, Button, Card } from '@/components/ui/StandardComponents';
import { monitoringAPI, type EmailTestResult } from '../../services/monitoringService';

export const AdminEmailTestCard: React.FC = () => {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      setResult(await monitoringAPI.sendTestEmail());
    } catch {
      setResult({ success: false, message: 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.' });
    } finally {
      setSending(false);
    }
  };

  const detail = result?.error
    ? [result.error.responseCode, result.error.code, result.error.message].filter(Boolean).join(' · ')
    : null;

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0" aria-hidden="true">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">E-mail dos avisos</h3>
            <p className="text-sm text-muted-foreground">
              Orçamento novo, contato, comprovante e mensagens de clientes chegam por e-mail. Mande um teste para conferir.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={send} isLoading={sending} disabled={sending} className="shrink-0">
          Enviar e-mail de teste
        </Button>
      </div>

      {result && (
        <div aria-live="polite" data-testid="email-test-result">
          <Alert variant={result.success ? 'success' : 'error'} title={result.success ? 'E-mail enviado' : 'O e-mail não saiu'}>
            <p>{result.message}</p>
            {detail && <p className="mt-1 font-mono text-xs break-all">{detail}</p>}
          </Alert>
        </div>
      )}
    </Card>
  );
};

export default AdminEmailTestCard;
