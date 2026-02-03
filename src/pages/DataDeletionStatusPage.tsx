import { useSearchParams } from 'react-router-dom';

/**
 * Página de Status de Exclusão de Dados
 * Exibida quando um usuário solicita exclusão de dados via Facebook
 */
export function DataDeletionStatusPage() {
  const [searchParams] = useSearchParams();
  const confirmationCode = searchParams.get('code');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Solicitação de Exclusão de Dados
          </h1>
          
          <p className="text-gray-600 mb-6">
            Sua solicitação de exclusão de dados foi recebida e está sendo processada.
          </p>

          {confirmationCode && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Código de Confirmação:</p>
              <p className="font-mono text-lg font-semibold text-gray-900">
                {confirmationCode}
              </p>
            </div>
          )}

          <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">O que acontece agora?</h2>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Seus dados pessoais serão removidos do nosso sistema</li>
              <li>• Este processo pode levar até 30 dias para ser concluído</li>
              <li>• Você receberá um email de confirmação quando a exclusão for finalizada</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            Se você tiver dúvidas, entre em contato conosco através do email{' '}
            <a 
              href="mailto:contato@xproducoeseeventos.com.br" 
              className="text-blue-600 hover:underline"
            >
              contato@xproducoeseeventos.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default DataDeletionStatusPage;
