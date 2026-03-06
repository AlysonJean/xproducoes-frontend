import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';

const schema = z
  .object({
    token: z.string().min(10, 'Token inválido'),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirmação necessária'),
  })
  .refine((s) => s.password === s.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export const CompleteRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
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
    try {
      await api.post('/auth/complete-registration', {
        token: values.token,
        password: values.password,
      });
      addNotification({ type: 'success', title: 'Registro completo', message: 'Sua conta foi ativada. Faça login.' });
      // redireciona para login após sucesso
      navigate('/login?registered=1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      addNotification({ type: 'error', title: 'Erro', message: err?.response?.data?.message || 'Erro ao completar registro' });
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-medium mb-4">Completar Registro</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Token</label>
          <input
            {...register('token')}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="Cole aqui o token do convite"
          />
          {errors.token && <p className="text-sm text-red-600">{errors.token.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Senha</label>
          <input
            type="password"
            {...register('password')}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="Nova senha"
          />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Confirme a senha</label>
          <input
            type="password"
            {...register('confirmPassword')}
            className="mt-1 block w-full border rounded px-3 py-2"
            placeholder="Confirmar senha"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Completar Registro
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompleteRegistrationPage;
