import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import FacebookAuthButton from '../components/ui/FacebookAuthButton';
import { getDashboardRoute } from '../utils/authUtils';
import {
  Button,
  Input,
  Checkbox,
  Form,
  Alert
} from '../components/ui/StandardComponents';
import { AuthLayout } from '../components/layouts/AuthLayout';
import { LogIn, User as UserIcon, Users } from 'lucide-react';
import { logger } from '../utils/logger';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'client' | 'collaborator'>('client');
  const { loginWithCredentials } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);
    try {
      const redirectTo = await loginWithCredentials?.({ 
        email: data.email, 
        password: data.password 
      });
      
      ReactGA.event({
        category: "auth",
        action: "login",
        label: "email_password"
      });

      addNotification({
        type: 'success',
        title: 'Login realizado!',
        message: 'Bem-vindo!',
      });

      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate('/painel');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha no login. Verifique as suas credenciais.';
      
      ReactGA.event({
        category: "auth",
        action: "login_error",
        label: errorMessage.substring(0, 50)
      });

      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Erro no login',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFACTORED: Social success - rely on cookie, not localStorage
  const handleSocialSuccess = async () => {
    try {
      const { API_BASE_URL } = await import('../utils/apiConfig');

      // Backend has already set httpOnly cookie
      // Just fetch profile to confirm auth
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        const dashboardRoute = getDashboardRoute(userData.role);
        navigate(dashboardRoute);
      } else {
        navigate('/painel');
      }
    } catch (error) {
      logger.error('Erro ao buscar dados do usuário:', 'LoginPage', error);
      navigate('/painel');
    }
  };

  const handleSocialError = (error: unknown) => {
    let message = 'Erro desconhecido no login social.';
    if (typeof error === 'string') message = error;
    else if (error && typeof error === 'object' && 'message' in error)
      message = String((error as { message?: unknown }).message);
    setError(message);
    addNotification({
      type: 'error',
      title: 'Erro no login social',
      message: message
    });
  };

  const userTypes = [
    { id: 'client' as const, label: 'Cliente', icon: UserIcon },
    { id: 'collaborator' as const, label: 'Colaborador', icon: Users },
  ];

  return (
    <AuthLayout
      icon={<LogIn className="h-6 w-6" />}
      title="Entrar"
      subtitle="Acesse sua conta"
      footer={
        <>
          <p>
            Não tem uma conta?{' '}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
          <p className="text-xs">
            Ao fazer login, você concorda com nossos{' '}
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Serviço
            </Link>{' '}
            e{' '}
            <Link to="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </>
      }
    >
      <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Tipo de conta">
        {userTypes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setUserType(id)}
            aria-pressed={userType === id}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              userType === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {userType === 'client' && (
        <div className="space-y-3">
          <GoogleAuthButton onSuccess={handleSocialSuccess} onFailure={handleSocialError} />
          <FacebookAuthButton onSuccess={handleSocialSuccess} onFailure={handleSocialError} />
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-2 text-muted-foreground">
            {userType === 'client' ? 'Ou continue com e-mail' : 'Entre com suas credenciais'}
          </span>
        </div>
      </div>

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
          {...register('email')}
          error={errors.email?.message}
          placeholder="seu@email.com"
        />

        <Input
          label="Senha"
          type="password"
          showPasswordToggle
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
          placeholder="Sua senha"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            label="Lembrar de mim"
            {...register('rememberMe')}
          />

          <Link
            to="/recuperar-senha"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Esqueceu sua senha?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={loading}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Entrar
        </Button>
      </Form>
    </AuthLayout>
  );
};
