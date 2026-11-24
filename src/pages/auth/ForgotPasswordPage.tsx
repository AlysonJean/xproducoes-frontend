import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '../../contexts/NotificationContext';
import { api } from '../../services/api';
import {
  Button,
  Input,
  Form,
  Alert
} from '../../components/ui/StandardComponents';
import { AuthLayout, BackToLoginLink } from '../../components/layouts/AuthLayout';
import { KeyRound, Mail } from 'lucide-react';

const FORGOT_PASSWORD_SENT = 'Se houver uma conta com este e-mail, enviamos o link. Confira também o spam e se o e-mail está certo.';

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.post('/auth/request-password-reset', { email: data.email });

      setSuccess(true);
      // Onda 4 da auditoria de 19/11 (F8-14): o servidor responde igual com ou sem conta (contra a descoberta de contas); a tela
      // não afirma mais que o e-mail foi enviado.
      addNotification({ type: 'success', title: 'Pedido recebido', message: FORGOT_PASSWORD_SENT });
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      const msg = errorResponse.response?.data?.message || 'Erro ao enviar instruções. Verifique sua conexão e tente novamente.';
      setError(msg);
      addNotification({ 
        type: 'error', 
        title: 'Erro', 
        message: msg 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={<KeyRound className="h-6 w-6" />}
      title="Esqueceu sua senha?"
      subtitle="Insira seu e-mail e enviaremos instruções para redefinir sua senha."
      footer={<BackToLoginLink />}
    >
      {success && (
        <Alert variant="success">
          {FORGOT_PASSWORD_SENT}
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          {...register('email')}
          error={errors.email?.message}
          placeholder="seu@email.com"
        />

        <Button
          type="submit"
          fullWidth
          isLoading={loading}
        >
          Enviar instruções
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
