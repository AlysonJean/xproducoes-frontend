import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Lock, Mail, User, UserPlus } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { strongPasswordSchema } from '../../validators/userSchema';
import { Alert, Button, Form, Input } from '../../components/ui/StandardComponents';
import { AuthLayout, BackToLoginLink, PASSWORD_HINT } from '../../components/layouts/AuthLayout';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const RegisterFromInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const prefilledEmail = searchParams.get('email') || '';
  const { addNotification } = useNotifications();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
        const msg = 'Token de convite ausente.';
        setError(msg);
        addNotification({ type: 'error', title: 'Erro', message: msg });
        return;
    }
    if (!validateEmail(email)) {
        const msg = 'E-mail inválido.';
        setError(msg);
        addNotification({ type: 'warning', title: 'Atenção', message: msg });
        return;
    }
    if (!name.trim()) {
        const msg = 'Nome é obrigatório.';
        setError(msg);
        addNotification({ type: 'warning', title: 'Atenção', message: msg });
        return;
    }
    // Mesma regra de senha forte do cadastro e da redefinição (antes: 6+ caracteres só aqui).
    const passwordCheck = strongPasswordSchema.safeParse(password);
    if (!passwordCheck.success) {
        const msg = passwordCheck.error.issues[0]?.message || PASSWORD_HINT;
        setError(msg);
        addNotification({ type: 'warning', title: 'Atenção', message: msg });
        return;
    }

    setLoading(true);
    try {
      await authAPI.registerFromInvite({ token, email, name, password });
      addNotification({
        type: 'success',
        title: 'Registro concluído',
        message: 'Sua conta foi criada! Redirecionando para login...'
      });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao completar registro';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Erro no registro',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mantém o <title> que o PageLayout dava a esta rota. */}
      <Helmet>
        <title>Registrar a partir de convite</title>
      </Helmet>
      <AuthLayout
        icon={<UserPlus className="h-6 w-6" />}
        title="Aceitar convite"
        subtitle="Crie sua conta para começar."
        footer={<BackToLoginLink />}
      >
        {error && <Alert variant="error">{error}</Alert>}

        {/* noValidate: a validação (com mensagem em pt-BR no Alert) continua sendo a do handleSubmit. */}
        <Form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="name"
            label="Nome"
            autoComplete="name"
            leftIcon={<User className="h-4 w-4" />}
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            showPasswordToggle
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            placeholder="Crie uma senha"
            description={PASSWORD_HINT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth isLoading={loading}>
            Completar registro
          </Button>
        </Form>
      </AuthLayout>
    </>
  );
};

export default RegisterFromInvitePage;
