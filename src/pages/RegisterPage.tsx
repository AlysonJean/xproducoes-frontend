import { useState } from 'react';
import ReactGA from 'react-ga4';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '@/contexts/NotificationContext';
import { authAPI } from '../services/api';
import { userRegisterSchema } from '../validators/userSchema';
import { PageLayout } from '../components/layouts/PageLayout';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import { 
  Button, 
  Card, 
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
      await authAPI.register(data);
      
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
        const axiosError = err as any;
        if (axiosError.response?.data) {
          errorMessage = axiosError.response.data.message || axiosError.response.data.error || errorMessage;
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
    <PageLayout
      title="Criar Conta"
      description="Preencha os dados abaixo para criar sua conta e aproveitar todos os benefícios."
    >
      <div className="max-w-md mx-auto py-8">
        <Card className="p-8 shadow-xl border-border">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Criar Conta</h1>
            <p className="text-muted-foreground mt-1">Junte-se à nossa comunidade</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              leftIcon={<User className="h-4 w-4" />}
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ex: João Silva"
              autoComplete="name"
            />

            <Input
              label="E-mail"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              {...register('email')}
              error={errors.email?.message}
              placeholder="Ex: joao@exemplo.com"
              autoComplete="email"
            />

            <Input
              label="Telefone"
              type="tel"
              leftIcon={<Phone className="h-4 w-4" />}
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="Ex: +55 11 99999-9999"
              autoComplete="tel"
            />

            <Input
              label="Senha"
              type="password"
              showPasswordToggle
              leftIcon={<Lock className="h-4 w-4" />}
              {...register('password')}
              error={errors.password?.message}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              className="mt-6"
            >
              Criar Conta
            </Button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-card text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <GoogleAuthButton onSuccess={() => {
              addNotification({
                type: 'success',
                title: 'Sucesso',
                message: 'Autenticação realizada!'
              });
              navigate('/login');
            }} />
          </Form>

          <p className="text-center text-muted-foreground mt-8 text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </PageLayout>
  );
};

export default RegisterPage;
