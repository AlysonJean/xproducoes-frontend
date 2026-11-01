import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, MailX, Loader2 } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { buttonVariants } from '../../components/ui/StandardComponents';
import { AuthLayout } from '../../components/layouts/AuthLayout';

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

  const content: Record<Status, { icon: React.ReactNode; tone: 'primary' | 'destructive'; title: string; text: string }> = {
    verifying: {
      icon: <Loader2 className="h-6 w-6 animate-spin" />,
      tone: 'primary',
      title: 'Confirmando seu e-mail...',
      text: 'Só um instante.',
    },
    verified: {
      icon: <MailCheck className="h-6 w-6" />,
      tone: 'primary',
      title: 'E-mail confirmado!',
      text: 'Sua conta está pronta. Entre para acompanhar seus orçamentos e reservas.',
    },
    invalid: {
      icon: <MailX className="h-6 w-6" />,
      tone: 'destructive',
      title: 'Não foi possível confirmar',
      text: 'Este link é inválido ou expirou (ele vale por 24 horas). Entre na sua conta para receber um novo link, ou fale com a gente pelo WhatsApp.',
    },
    missing: {
      icon: <MailX className="h-6 w-6" />,
      tone: 'destructive',
      title: 'Link de verificação incompleto',
      text: 'Abra o link exatamente como chegou no seu e-mail.',
    },
  };
  const { icon, tone, title, text } = content[status];

  return (
    <AuthLayout icon={icon} iconTone={tone} title={title}>
      <p
        className="text-center text-sm text-muted-foreground"
        role={status === 'invalid' || status === 'missing' ? 'alert' : 'status'}
      >
        {text}
      </p>
      {status !== 'verifying' && (
        <Link to="/login" className={buttonVariants({ fullWidth: true })}>
          Entrar
        </Link>
      )}
    </AuthLayout>
  );
};

export default VerifyEmailPage;
