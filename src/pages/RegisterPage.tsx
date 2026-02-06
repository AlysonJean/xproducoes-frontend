import React, { useState } from 'react';
import ReactGA from 'react-ga4';
import { PageLayout } from '../components/layouts/PageLayout';
import { authAPI } from '../services/api';
import { userRegisterSchema } from '../validators/userSchema';
import { useNavigate } from 'react-router-dom';
import { normalizeString } from '../utils/string';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import { useNotifications } from '@/contexts/NotificationContext';

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(normalizeString(email));
};

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    general: '',
  });
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors = { name: '', email: '', password: '', phone: '', general: '' };
    let isValid = true;
    if (!name.trim()) {
      errors.name = 'O nome é obrigatório.';
      isValid = false;
    }
    if (!email) {
      errors.email = 'O e-mail é obrigatório.';
      isValid = false;
    } else if (!validateEmail(email)) {
      errors.email = 'Por favor, insira um e-mail válido.';
      isValid = false;
    }
    if (!password) {
      errors.password = 'A palavra-passe é obrigatória.';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      isValid = false;
    }
    if (!phone.trim()) {
      errors.phone = 'O telefone é obrigatório.';
      isValid = false;
    }
    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({ name: '', email: '', password: '', phone: '', general: '' });
    if (!validateForm()) {
      return;
    }
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      // Validação extra com Zod
      const parsed = userRegisterSchema.safeParse({ name, email, password });
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => i.message).join('. ');
        setFormErrors(prev => ({ ...prev, general: `Dados inválidos: ${issues}` }));
        setLoading(false);
        return;
      }

      // Chamada à API de registro
      const payload: Record<string, unknown> = { name, email, password };
      if (phone) payload.phone = phone;

      await authAPI.register(payload);
      
      // GA Tracking - Sign Up
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
        // Tentar extrair mensagem do axios
        // @ts-expect-error - Response structure is unknown in catch block
        if (err.response && err.response.data) {
          // @ts-expect-error - Response structure is unknown in catch block
          errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        }
      }
      setFormErrors((prev) => ({ ...prev, general: errorMessage }));
      addNotification({
        type: 'error',
        title: 'Erro no registro',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <PageLayout
      title="Criar Conta"
      description="Preencha os dados abaixo para criar sua conta e aproveitar todos os benefícios."
    >
      <div className="w-full max-w-md mx-auto bg-card p-8 rounded-2xl shadow-lg border border-border">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Criar Conta</h2>
        {formErrors.general && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-center border border-destructive">
            {formErrors.general}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Nome</label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${formErrors.name ? 'border-destructive' : 'border-border'} bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`}
                placeholder="Nome completo"
                autoComplete="name"
              />
              {formErrors.name && <span className="text-xs text-destructive mt-1 block">{formErrors.name}</span>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${formErrors.email ? 'border-destructive' : 'border-border'} bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`}
                placeholder="E-mail"
                autoComplete="email"
              />
              {formErrors.email && <span className="text-xs text-destructive mt-1 block">{formErrors.email}</span>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">Telefone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${formErrors.phone ? 'border-destructive' : 'border-border'} bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`}
                placeholder="Telefone"
                autoComplete="tel"
              />
              {formErrors.phone && <span className="text-xs text-destructive mt-1 block">{formErrors.phone}</span>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${formErrors.password ? 'border-destructive' : 'border-border'} bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`}
                placeholder="Senha"
                autoComplete="new-password"
              />
              {formErrors.password && <span className="text-xs text-destructive mt-1 block">{formErrors.password}</span>}
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <GoogleAuthButton onSuccess={() => {
              addNotification({
                type: 'success',
                title: 'Login com Google',
                message: 'Autenticação realizada com sucesso!'
              });
              // GoogleAuthButton component likely handles redirect or we need to pass a callback that does it? 
              // Assuming GoogleAuthButton handles external auth, keeping it simple here or updating it too?
              // The original code was onSuccess={() => setSuccess(true)}. 
              // We should probably just navigate or let the button handle it.
              navigate('/login');
            }} />
          </form>
        <p className="text-center text-muted-foreground mt-8">
          Já tem uma conta?
          <a href="/login" className="text-primary font-semibold ml-1 hover:underline">Entrar</a>
        </p>
      </div>
    </PageLayout>
  );
};

export default RegisterPage;