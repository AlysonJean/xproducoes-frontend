import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { Alert, Button, Form, Input } from '@/components/ui/StandardComponents';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Phone, Globe, MapPin, Building2, UserCheck } from 'lucide-react';

const profileSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  location: z.string().min(3, 'Localização é obrigatória'),
  companyName: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: '',
      location: '',
      companyName: '',
      website: '',
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      addNotification({
        type: 'success',
        title: 'Perfil Atualizado',
        message: 'Obrigado! Seu perfil foi completado com sucesso.'
      });

      navigate('/cliente/painel');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar seus dados.';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Erro ao salvar',
        message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={<UserCheck className="h-6 w-6" />}
      title="Quase lá!"
      subtitle="Complete seu cadastro para ter acesso total à plataforma."
      footer={
        <p className="text-xs">
          Ao continuar, você concorda com nossos{' '}
          <Link to="/termos" className="text-primary hover:underline">Termos de Serviço</Link>
          {' '}e{' '}
          <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
        </p>
      }
    >
      {error && <Alert variant="error">{error}</Alert>}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Telefone / WhatsApp"
          type="tel"
          autoComplete="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          {...register('phone')}
          placeholder="(00) 00000-0000"
          error={errors.phone?.message}
        />

        <Input
          label="Localização (cidade/estado)"
          autoComplete="address-level2"
          leftIcon={<MapPin className="h-4 w-4" />}
          {...register('location')}
          placeholder="Ex.: Belo Horizonte, MG"
          error={errors.location?.message}
        />

        <Input
          label="Empresa (opcional)"
          autoComplete="organization"
          leftIcon={<Building2 className="h-4 w-4" />}
          {...register('companyName')}
          placeholder="Nome da sua empresa ou marca"
        />

        <Input
          label="Site / redes sociais (opcional)"
          inputMode="url"
          autoComplete="url"
          leftIcon={<Globe className="h-4 w-4" />}
          {...register('website')}
          placeholder="https://seu-site.com.br"
          error={errors.website?.message}
        />

        <Button type="submit" fullWidth isLoading={loading}>
          Concluir cadastro
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default CompleteProfilePage;
