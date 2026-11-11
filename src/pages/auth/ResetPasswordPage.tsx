import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '../../contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import {
  Button,
  Input,
  Form,
  Alert
} from '../../components/ui/StandardComponents';
import { AuthLayout, BackToLoginLink, PASSWORD_HINT } from '../../components/layouts/AuthLayout';
import { Lock, ShieldCheck } from 'lucide-react';
import { strongPasswordSchema } from '../../validators/userSchema';

const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, 'Confirme a nova senha'),
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
        // A API valida `newPassword` (resetPasswordSchema); com `password` voltava 400.
        body: JSON.stringify({ token, newPassword: data.password }),
      });

      // D17 (aprovada em 02/11/2026): a redefinição encerra as sessões abertas em outros aparelhos.
      addNotification({ 
        type: 'success', 
        title: 'Senha atualizada', 
        message: 'Senha alterada. Por segurança, saímos das suas outras sessões. Faça login para continuar.' 
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
    <AuthLayout
      icon={<ShieldCheck className="h-6 w-6" />}
      title="Redefinir senha"
      subtitle="Defina uma nova senha para sua conta."
      footer={<BackToLoginLink />}
    >
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nova Senha"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          {...register('password')}
          error={errors.password?.message}
          description={PASSWORD_HINT}
          placeholder="Crie uma senha"
        />

        <Input
          label="Confirmar Senha"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
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
      </Form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
