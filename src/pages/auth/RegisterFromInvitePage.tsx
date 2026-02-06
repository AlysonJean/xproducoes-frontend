import React, { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layouts/PageLayout';
import { authAPI } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';

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
    if (!password || password.length < 6) {
        const msg = 'Senha deve ter ao menos 6 caracteres.';
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
    <PageLayout title="Registrar a partir de convite">
      <div className="w-full max-w-md mx-auto bg-card p-8 rounded-2xl shadow-lg border border-border">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Aceitar Convite</h2>
        {error && <div className="text-destructive mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Nome</label>
              <input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">E-mail</label>
              <input id="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">Senha</label>
              <input id="password" placeholder="Sua senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="flex justify-end">
              <button disabled={loading} className="bg-primary text-white px-4 py-2 rounded">
                {loading ? 'Processando...' : 'Completar Registro'}
              </button>
            </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default RegisterFromInvitePage;
