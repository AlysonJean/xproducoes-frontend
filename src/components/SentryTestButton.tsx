// src/components/SentryTestButton.tsx
import React from 'react';
import { captureMessage, addBreadcrumb } from '@sentry/react';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../utils/logger';

/**
 * Teste da integração com o Sentry, na aba "Sentry" do Monitoramento (tela só do admin).
 *
 * Onda 4 da auditoria de 19/11 (F3-13): fica também em produção (é onde o teste vale), sem o filtro de ambiente que escondia os
 * botões, e cada clique manda um evento só (eram quatro: o envio direto e o logger.error, duas vezes; o logger.error
 * já manda ao Sentry).
 */

interface SentryTestButtonProps {
  /** Estilo do botão (opcional) */
  variant?: 'default' | 'danger' | 'minimal';
  /** Posição do botão (opcional) */
  position?: 'fixed' | 'inline';
}

export const SentryTestButton: React.FC<SentryTestButtonProps> = ({ 
  variant = 'danger',
  position = 'fixed' 
}) => {
  const { addNotification } = useNotifications();

  const handleTestError = () => {
    console.log('🐛 Testando Sentry - Erro será capturado...');
    
    // Capturar mensagem de teste primeiro
    captureMessage('Teste de integração Sentry - Botão de teste clicado', 'info');
    
    // Aguardar 500ms e então lançar erro
    setTimeout(() => {
      throw new Error('🧪 Este é um erro de teste do Sentry! Se você viu este erro no dashboard, a integração está funcionando! 🎉');
    }, 500);
  };

  const handleTestException = () => {
    console.log('🐛 Testando Sentry - Exceção será capturada...');
    
    try {
      // Simular erro de parsing JSON
      JSON.parse('{ invalid json }');
    } catch (error) {
      logger.error('Erro capturado e enviado para Sentry:', 'SentryTestButton', error);
      addNotification({
        type: 'success',
        title: 'Sentry Test',
        message: '✅ Exceção capturada e enviada para Sentry! Verifique o dashboard.'
      });
    }
  };

  const handleTestMessage = () => {
    console.log('🐛 Testando Sentry - Mensagem será enviada...');
    
    captureMessage('📝 Mensagem de teste do Sentry', 'info');
    addBreadcrumb({
      category: 'test',
      message: 'Usuário clicou no botão de teste',
      level: 'info',
    });
    
    
    addNotification({
      type: 'success',
      title: 'Sentry Test',
      message: '✅ Mensagem enviada para Sentry! Verifique o dashboard.'
    });
  };

  // Estilos baseados na variante
  const variantStyles = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    minimal: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
  };

  const positionStyles = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-50' 
    : 'inline-block';

  return (
    <div className={positionStyles}>
      <details className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
        <summary className={`
          px-4 py-2 cursor-pointer font-medium rounded-t-lg
          ${variantStyles[variant]}
          flex items-center gap-2
        `}>
          🧪 Sentry Test
        </summary>
        
        <div className="p-4 space-y-2 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Clique nos botões para testar a integração com Sentry:
          </p>
          
          {/* Botão 1: Erro não tratado */}
          <button
            onClick={handleTestError}
            className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            💥 Lançar Erro
          </button>
          
          {/* Botão 2: Exceção capturada */}
          <button
            onClick={handleTestException}
            className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
          >
            ⚠️ Capturar Exceção
          </button>
          
          {/* Botão 3: Mensagem */}
          <button
            onClick={handleTestMessage}
            className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            📝 Enviar Mensagem
          </button>

        </div>
      </details>
    </div>
  );
};

export default SentryTestButton;
