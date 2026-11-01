import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Lock, UserCheck } from 'lucide-react';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { strongPasswordSchema } from '../../validators/userSchema';
import { Alert, Button, Form, Input } from '../../components/ui/StandardComponents';
import { AuthLayout, BackToLoginLink, PASSWORD_HINT } from '../../components/layouts/AuthLayout';

// Mesma regra de senha forte do cadastro, do convite, da redefinição e da troca de senha no perfil
// (antes: só 8+ caracteres aqui, 6+ no convite e no perfil).
const schema = z
  .object({
    token: z.string().min(10, 'Token inválido'),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((s) => s.password === s.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export const CompleteRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) setValue('token', token);
  }, [location.search, setValue]);

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await api.post('/auth/complete-registration', {
        token: values.token,
        password: values.password,
      });
      addNotification({ type: 'success', title: 'Registro completo', message: 'Sua conta foi ativada. Faça login.' });
      // redireciona para login após sucesso
      navigate('/login?registered=1');
    } catch (err: unknown) {
      logger.error('Erro', 'CompleteRegistrationPage', err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Erro ao completar registro'
        : 'Erro ao completar registro';
      setError(message);
      addNotification({ type: 'error', title: 'Erro', message });
    }
  }

  return (
    <AuthLayout
      icon={<UserCheck className="h-6 w-6" />}
      title="Completar registro"
      subtitle="Defina a senha da sua conta para ativá-la."
      footer={<BackToLoginLink />}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Token do convite"
          leftIcon={<KeyRound className="h-4 w-4" />}
          autoComplete="off"
          {...register('token')}
          placeholder="Cole aqui o token do convite"
          error={errors.token?.message}
        />

        <Input
          label="Senha"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          {...register('password')}
          placeholder="Crie uma senha"
          description={PASSWORD_HINT}
          error={errors.password?.message}
        />

        <Input
          label="Confirme a senha"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          {...register('confirmPassword')}
          placeholder="Digite a senha novamente"
          error={errors.confirmPassword?.message}
        />

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Completar registro
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default CompleteRegistrationPage;
