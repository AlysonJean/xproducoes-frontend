import { useState } from 'react';
import axios from 'axios';
import ReactGA from 'react-ga4';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '@/contexts/NotificationContext';
import { authAPI } from '../services/api';
import { userRegisterSchema } from '../validators/userSchema';
import { Helmet } from 'react-helmet-async';
import { AuthLayout, PASSWORD_HINT } from '../components/layouts/AuthLayout';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import {
  Button,
  Input,
  Form,
  Alert
} from '../components/ui/StandardComponents';
import { UserPlus, User, Mail, Phone, Lock } from 'lucide-react';

type RegisterFormData = z.infer<typeof userRegisterSchema>;

export const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setLoading(true);
    try {
      await authAPI.register({ ...data, bookingId: bookingId || undefined });
      
      ReactGA.event({
        category: "auth",
        action: "sign_up",
        label: "email_password"
      });

      addNotification({
        type: 'success',
        title: 'Conta criada!',
        message: 'Sua conta foi criada com sucesso. Faça login para continuar.'
      });
      navigate('/login');
    } catch (err: unknown) {
      let errorMessage = 'Falha ao criar conta. O e-mail pode já estar em uso.';
      if (err instanceof Error) {
        errorMessage = err.message;
        if (axios.isAxiosError(err) && err.response?.data) {
          errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        }
      }
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Erro no registro',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mantém o <title>/description que o PageLayout dava a esta rota (o h1 agora é do AuthLayout). */}
      <Helmet>
        <title>Criar Conta</title>
        <meta
          name="description"
          content="Preencha os dados abaixo para criar sua conta e aproveitar todos os benefícios."
        />
      </Helmet>
      <AuthLayout
        icon={<UserPlus className="h-6 w-6" />}
        // D6, parte 1 (02/11/2026): com ?bookingId= (vindo da página da proposta), a tela dizia "Rastrear meu
        // orçamento" e "Finalize seu cadastro para acompanhar a proposta". O cadastro não vincula proposta
        // (ver linkBookingsToUser no backend, sem chamador); o título agora é sempre o mesmo.
        title="Criar conta"
        subtitle="Junte-se à nossa comunidade"
        footer={
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        }
      >
        {/* Mesma ordem do login: social primeiro, depois o formulário por e-mail. Fora do <form>
            para o botão social nunca disparar o envio do cadastro. */}
        <GoogleAuthButton onSuccess={() => {
          addNotification({
            type: 'success',
            title: 'Sucesso',
            message: 'Autenticação realizada!'
          });
          navigate('/login');
        }} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-muted-foreground">Ou cadastre-se com e-mail</span>
          </div>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome completo"
            leftIcon={<User className="h-4 w-4" />}
            {...register('name')}
            error={errors.name?.message}
            placeholder="Ex.: João Silva"
            autoComplete="name"
          />

          <Input
            label="E-mail"
            type="email"
            leftIcon={<Mail className="h-4 w-4" />}
            {...register('email')}
            error={errors.email?.message}
            placeholder="Ex.: joao@exemplo.com"
            autoComplete="email"
          />

          <Input
            label="Telefone"
            type="tel"
            leftIcon={<Phone className="h-4 w-4" />}
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="Ex.: (11) 99999-9999"
            autoComplete="tel"
          />

          <Input
            label="Senha"
            type="password"
            showPasswordToggle
            leftIcon={<Lock className="h-4 w-4" />}
            {...register('password')}
            error={errors.password?.message}
            description={PASSWORD_HINT}
            placeholder="Crie uma senha"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Criar conta
          </Button>
        </Form>
      </AuthLayout>
    </>
  );
};

export default RegisterPage;
