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
      addNotification({ 
        type: 'success', 
        title: 'E-mail enviado', 
        message: 'Instruções enviadas para seu e-mail.' 
      });
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
          E-mail enviado com sucesso! Verifique sua caixa de entrada (e spam) para redefinir sua senha.
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
