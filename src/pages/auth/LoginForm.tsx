/**
 * 🔐 Formulário de Login Avançado
 * Componente elegante com validação, segurança e UX aprimorada
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { z } from 'zod';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Button
} from '../../components/ui/StandardComponents';

// Schema de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().optional(),
  twoFactorCode: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onRegister,
  className = '',
}) => {
  const { loginWithCredentials } = useAuth();
  const { addNotification } = useNotifications();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
    twoFactorCode: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when user types
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
  }, [formData.email, formData.password, formData.twoFactorCode, errors]);

  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
        (error.issues as Array<{ path: (keyof LoginFormData)[]; message: string }>).forEach(
          (err) => {
            if (err.path[0]) {
              newErrors[err.path[0] as keyof LoginFormData] = err.message;
            }
          }
        );
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange =
    (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'rememberMe' ? e.target.checked : e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (!loginWithCredentials) throw new Error('Função de login não disponível');
      await loginWithCredentials({ email: formData.email, password: formData.password });
      addNotification({
        type: 'success',
        title: 'Login realizado com sucesso!',
        message: 'Bem-vindo de volta',
      });
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorCode = (error as Record<string, unknown>)?.code;
      if (errorCode === 'TWO_FACTOR_REQUIRED') {
        setRequiresTwoFactor(true);
        addNotification({
          type: 'error',
          title: 'Verificação Adicional',
          message: 'Código de autenticação de dois fatores necessário',
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Erro de Autenticação',
          message: errorMessage || 'Erro ao fazer login. Verifique suas credenciais.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.twoFactorCode || formData.twoFactorCode.length !== 6) {
      setErrors({ twoFactorCode: 'Código deve ter 6 dígitos' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!loginWithCredentials) throw new Error('Função de login não disponível');
      await loginWithCredentials({ email: formData.email, password: formData.password });
      addNotification({
        type: 'success',
        title: 'Login realizado com sucesso!',
        message: 'Bem-vindo de volta',
      });
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Código de verificação inválido';
      addNotification({
        type: 'error',
        title: 'Erro de Verificação',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formulário de dois fatores
  if (requiresTwoFactor) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="bg-card rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Verificação de Dois Fatores
            </h2>
            <p className="text-muted-foreground mt-2">
              Digite o código de 6 dígitos do seu aplicativo autenticador
            </p>
          </div>

          <Form onSubmit={handleTwoFactorSubmit}>
            <FormSection>
              <Input
                label="Código de Verificação"
                type="text"
                value={formData.twoFactorCode || ''}
                onChange={handleInputChange('twoFactorCode')}
                error={errors.twoFactorCode}
                placeholder="000000"
                leftIcon={<span>🔢</span>}
                maxLength={6}
              />
            </FormSection>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequiresTwoFactor(false)}
                disabled={isSubmitting}
              >
                ← Voltar ao login
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                leftIcon={<span>✅</span>}
              >
                Verificar Código
              </Button>
            </FormActions>
          </Form>
        </div>
      </div>
    );
  }

  // Formulário principal de login
  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-card rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">👤</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground">Entrar</h2>
          <p className="text-muted-foreground mt-2">Acesse sua conta para continuar</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <FormSection>
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              placeholder="seu@email.com"
              leftIcon={<span>📧</span>}
              disabled={isSubmitting}
            />

            <Input
              label="Senha"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              placeholder="••••••••"
              leftIcon={<span>🔒</span>}
              showPasswordToggle
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange('rememberMe')}
                  className="rounded border text-primary focus:ring-primary mr-2"
                />
                <span className="text-sm text-muted-foreground">Lembrar-me</span>
              </label>

              {onForgotPassword && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
          </FormSection>

          <FormActions>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              leftIcon={<span>🚀</span>}
            >
              Entrar
            </Button>
          </FormActions>

          {onRegister && (
            <div className="text-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={onRegister}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Criar conta
                </button>
              </p>
            </div>
          )}
        </Form>
      </div>
    </div>
  );
};
