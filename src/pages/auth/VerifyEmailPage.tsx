import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, MailX, Loader2 } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Card } from '../../components/ui/StandardComponents';

// Destino do link do e-mail de verificação, que o backend monta como
// `${FRONTEND_URL}/verify-email?token=...` (cadastro e reenvio). A página não existia — o link
// caía na 404 —, então quem se cadastrava nunca conseguia confirmar o e-mail.
type Status = 'verifying' | 'verified' | 'invalid' | 'missing';

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');

  useEffect(() => {
    if (!token) return;
    let active = true;
    const verify = async () => {
      try {
        await apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (active) setStatus('verified');
      } catch {
        if (active) setStatus('invalid');
      }
    };
    void verify();
    return () => { active = false; };
  }, [token]);

  const content: Record<Status, { icon: React.ReactNode; title: string; text: string }> = {
    verifying: {
      icon: <Loader2 className="h-6 w-6 text-primary animate-spin" />,
      title: 'Confirmando seu e-mail...',
      text: 'Só um instante.',
    },
    verified: {
      icon: <MailCheck className="h-6 w-6 text-primary" />,
      title: 'E-mail confirmado!',
      text: 'Sua conta está pronta. Entre para acompanhar seus orçamentos e reservas.',
    },
    invalid: {
      icon: <MailX className="h-6 w-6 text-destructive" />,
      title: 'Não foi possível confirmar',
      text: 'Este link é inválido ou expirou (ele vale por 24 horas). Entre na sua conta para receber um novo link, ou fale com a gente pelo WhatsApp.',
    },
    missing: {
      icon: <MailX className="h-6 w-6 text-destructive" />,
      title: 'Link de verificação incompleto',
      text: 'Abra o link exatamente como chegou no seu e-mail.',
    },
  };
  const { icon, title, text } = content[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 shadow-2xl space-y-6 text-center">
        <div className="mx-auto h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">{icon}</div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground" role={status === 'invalid' || status === 'missing' ? 'alert' : undefined}>{text}</p>
        {status !== 'verifying' && (
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Entrar
          </Link>
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
