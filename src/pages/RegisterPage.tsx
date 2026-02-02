import React, { useState } from 'react';
import ReactGA from 'react-ga4';
import { PageLayout } from '../components/layouts/PageLayout';
import { authAPI } from '../services/api';
import { userRegisterSchema } from '../validators/userSchema';
import { useNavigate } from 'react-router-dom';
import { normalizeString } from '../utils/string';
import GoogleAuthButton from '../components/ui/GoogleAuthButton'; // Importação

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
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
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

      setSuccess(true);
    } catch (err: unknown) {
      let errorMessage = 'Falha ao criar conta. O e-mail pode já estar em uso.';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Tentar extrair mensagem do axios
        // @ts-ignore
        if (err.response && err.response.data) {
          // @ts-ignore
          errorMessage = err.response.data.message || err.response.data.error || errorMessage;
        }
      }
      setFormErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  // Redirecionar automaticamente para login após sucesso
  React.useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/login'), 1500);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

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
        {success ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <span className="bg-success/20 text-success rounded-full p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2 text-success">Conta criada com sucesso!</h3>
            <p className="text-muted-foreground mb-4">Você já pode fazer login e aproveitar nossos serviços.</p>
            <a href="/login" className="inline-block bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors">Ir para Login</a>
          </div>
        ) : (
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

            <GoogleAuthButton onSuccess={() => setSuccess(true)} />
          </form>
        )}
        <p className="text-center text-muted-foreground mt-8">
          Já tem uma conta?
          <a href="/login" className="text-primary font-semibold ml-1 hover:underline">Entrar</a>
        </p>
      </div>
    </PageLayout>
  );
};

export default RegisterPage;