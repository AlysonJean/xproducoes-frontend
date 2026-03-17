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
  Card, 
  Input, 
  Checkbox, 
  Form, 
  Alert 
} from '../components/ui/StandardComponents';
import { LogIn, User as UserIcon, Users } from 'lucide-react';

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
      console.error('Erro ao buscar dados do usuário:', error);
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

  return (
    <div className="flex justify-center items-center min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Login</h1>
          <p className="text-muted-foreground">Acesse sua conta</p>
        </div>

        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setUserType('client')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              userType === 'client'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setUserType('collaborator')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              userType === 'collaborator'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Colaborador</span>
          </button>
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
            <span className="px-2 bg-card text-muted-foreground">
              {userType === 'client' ? 'Ou continue com email' : 'Entre com suas credenciais'}
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
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="seu@email.com"
          />

          <Input
            label="Senha"
            type="password"
            showPasswordToggle
            {...register('password')}
            error={errors.password?.message}
            placeholder="Sua senha"
          />

          <div className="flex items-center justify-between">
            <Checkbox
              label="Lembrar de mim"
              {...register('rememberMe')}
            />

            <div className="text-sm">
              <Link
                to="/recuperar-senha"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>
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

        <div className="text-center space-y-4 pt-4 border-t">
          <p className="text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/cadastro" className="text-primary hover:text-primary/80 font-medium">
              Registe-se
            </Link>
          </p>

          <p className="text-xs text-muted-foreground">
            Ao fazer login, você concorda com nossos{' '}
            <Link to="/termos" className="text-primary hover:underline">
              Termos de Serviço
            </Link>{' '}
            e{' '}
            <Link to="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
