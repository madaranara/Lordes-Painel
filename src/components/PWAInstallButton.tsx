import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
          compact
            ? 'w-full py-2 px-3 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200'
            : 'px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App no Celular</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
          compact
            ? 'w-full py-2 px-3 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200'
            : 'px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>{isIOS ? 'Instalar no iPhone' : 'App no Celular'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Instalar LORDES como App
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fechar"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>Toque no ícone <strong>Compartilhar</strong> na barra do Safari.</li>
                <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Confirme tocando em <strong>Adicionar</strong> para abrir em tela cheia.</li>
              </ol>
            ) : (
              <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>No menu do navegador (Chrome/Edge), toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                <li>O painel abrirá como aplicativo independente com ícone próprio no celular ou desktop.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 text-xs font-semibold text-white bg-[#1E40AF] rounded-lg cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white shadow-lg no-print">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Sem conexão — exibindo dados em cache</span>
    </div>
  );
};
