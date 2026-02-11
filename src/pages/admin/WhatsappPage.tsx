
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { apiFetch } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshCw, LogOut, MessageSquare } from 'lucide-react';

export default function WhatsappPage() {
  const [status, setStatus] = useState<{ isReady: boolean; qrCode: string | null }>({ isReady: false, qrCode: null });
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const fetchStatus = async () => {
    try {
      // Cast the response since apiFetch returns Promise<unknown> or Promise<any>
      const data = await apiFetch('/whatsapp/status') as { isReady: boolean; qrCode: string | null };
      setStatus(data);
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Polling a cada 3s
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
    try {
      setLoading(true);
      await apiFetch('/whatsapp/restart', { method: 'POST' });
      addNotification({ type: 'success', title: 'Sucesso', message: 'Serviço reiniciado. Aguarde novo QR Code.' });
      setStatus({ isReady: false, qrCode: null });
    } catch (error) {
        console.error(error);
        addNotification({ type: 'error', title: 'Erro', message: 'Falha ao reiniciar serviço.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Tem certeza? Isso desconectará o WhatsApp.')) return;
    try {
      setLoading(true);
      await apiFetch('/whatsapp/logout', { method: 'POST' });
      addNotification({ type: 'success', title: 'Sucesso', message: 'Desconectado.' });
      setStatus({ isReady: false, qrCode: null });
    } catch (error) {
        console.error(error);
        addNotification({ type: 'error', title: 'Erro', message: 'Falha ao desconectar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-green-600" />
            Gestão WhatsApp Web
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={handleRestart} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 cursor-pointer"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Reiniciar Serviço
            </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
        {status.isReady ? (
            <div className="py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={40} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp Conectado!</h2>
                <p className="text-gray-500 mb-6">O serviço está pronto para enviar notificações.</p>
                
                <button 
                    onClick={handleLogout}
                    disabled={loading}
                    className="px-6 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded bg-white cursor-pointer"
                >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Desconectar
                </button>
            </div>
        ) : (
            <div className="py-8">
                <h2 className="text-lg font-medium mb-6">Escaneie o QR Code para conectar</h2>
                
                {status.qrCode ? (
                    <div className="inline-block p-4 bg-white border-2 border-gray-100 rounded-lg shadow-sm">
                        <QRCode value={status.qrCode} size={256} />
                    </div>
                ) : (
                    <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mx-auto text-gray-400 flex-col gap-2">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto" />
                        <span className="text-sm">{loading ? 'Reiniciando...' : 'Carregando QR Code...'}</span>
                    </div>
                )}
                
                <p className="mt-6 text-sm text-gray-500 max-w-md mx-auto">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados &gt; Conectar Aparelho e aponte a câmera.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
