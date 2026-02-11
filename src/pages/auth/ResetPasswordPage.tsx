import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { 
  Button, 
  Card, 
  Input, 
  Form, 
  Alert 
} from '../../components/ui/StandardComponents';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'A confirmação deve ter pelo menos 8 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const query = new URLSearchParams(location.search);
  const token = query.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setError('O token de redefinição não foi encontrado na URL.');
      addNotification({ 
        type: 'error', 
        title: 'Token ausente', 
        message: 'O token de redefinição não foi encontrado na URL.' 
      });
    }
  }, [token, addNotification]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      addNotification({ 
        type: 'success', 
        title: 'Senha atualizada', 
        message: 'Sua senha foi redefinida com sucesso. Faça login para continuar.' 
      });
      navigate('/login');
    } catch (err: unknown) {
      const errorResponse = err as { message?: string };
      const msg = errorResponse.message || 'Falha ao redefinir senha.';
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
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Redefinir Senha</h2>
          <p className="mt-2 text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Nova Senha"
            type="password"
            showPasswordToggle
            leftIcon={<Lock className="h-4 w-4" />}
            {...register('password')}
            error={errors.password?.message}
            placeholder="Mínimo 8 caracteres"
          />

          <Input
            label="Confirmar Senha"
            type="password"
            showPasswordToggle
            leftIcon={<Lock className="h-4 w-4" />}
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            placeholder="Digite a senha novamente"
          />

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            disabled={!token || loading}
          >
            Redefinir senha
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

export default ResetPasswordPage;
