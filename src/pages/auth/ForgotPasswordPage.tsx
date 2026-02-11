import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '../../contexts/NotificationContext';
import { api } from '../../services/api';
import { 
  Button, 
  Card, 
  Input, 
  Form, 
  Alert 
} from '../../components/ui/StandardComponents';
import { KeyRound, ArrowLeft, Mail } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 shadow-2xl space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Esqueceu sua senha?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Insira seu e-mail e enviaremos instruções para redefinir sua senha.</p>
        </div>

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

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email"
            type="email"
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

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
