import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { AuthUserSummary, SegmentKey, TenantDataset } from '../types/finance';
import { SEGMENT_OPTIONS } from '../data/segments';

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (token: string, user: AuthUserSummary, dataset: TenantDataset, isNewSignup: boolean) => void;
  onOpenLegal: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthenticated,
  onOpenLegal,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('register');
  const [nome, setNome] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [segmento, setSegmento] = useState<SegmentKey>('servicos');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [aceiteLgpd, setAceiteLgpd] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [resetCode, setResetCode] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);
    try {
      if (tab === 'register') {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            email,
            senha,
            empresaNome,
            segmento,
            aceiteLgpd,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Não foi possível concluir o cadastro.');
          return;
        }
        onAuthenticated(data.token, data.user, data.dataset, true);
      } else if (tab === 'login') {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            senha,
            totpCode: needs2FA ? totpCode : undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 202 && data.requires2FA) {
          setNeeds2FA(true);
          return;
        }
        if (!res.ok) {
          setError(data.error || 'E-mail ou senha inválidos.');
          return;
        }
        onAuthenticated(data.token, data.user, data.dataset, false);
      } else if (forgotStep === 'email') {
        const res = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Não foi possível solicitar a recuperação.');
          return;
        }
        setInfoMsg(data.message || 'Se o e-mail estiver cadastrado, enviamos o código.');
        setForgotStep('reset');
      } else {
        const res = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode, novaSenha }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Código inválido ou expirado.');
          return;
        }
        setTab('login');
        setForgotStep('email');
        setResetCode('');
        setNovaSenha('');
        setSenha('');
        setInfoMsg(data.message || 'Senha redefinida com sucesso.');
      }
    } catch {
      setError('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tab === 'forgot' ? (
              <KeyRound className="w-4 h-4 text-[#1E40AF]" />
            ) : (
              <Lock className="w-4 h-4 text-[#1E40AF]" />
            )}
            <h2 className="font-display text-base font-bold text-slate-900">
              {tab === 'register'
                ? 'Criar empresa na LORDES'
                : tab === 'forgot'
                  ? 'Recuperar acesso'
                  : 'Acessar minha empresa'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                setInfoMsg('');
                setNeeds2FA(false);
              }}
              className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
                tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Cadastrar empresa
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                setInfoMsg('');
                setNeeds2FA(false);
              }}
              className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
                tab === 'login' || tab === 'forgot' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Já tenho conta
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Seu nome</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Rafael Mendes"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome da empresa</label>
                  <input
                    type="text"
                    required
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    placeholder="Ex: Mendes Reformas"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Segmento</label>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value as SegmentKey)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {SEGMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@suaempresa.com.br"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Senha</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setForgotStep('email');
                      setError('');
                      setInfoMsg('');
                    }}
                    className="text-[11px] font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {tab === 'forgot' && forgotStep === 'reset' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Código recebido (6 dígitos)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}

          {tab === 'login' && needs2FA && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Código 2FA do autenticador (6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {tab === 'register' && (
            <>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                <span>Ative o 2FA com QR Code nas Configurações após entrar no painel.</span>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceiteLgpd}
                  onChange={(e) => setAceiteLgpd(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={onOpenLegal}
                    className="text-[#1E40AF] font-semibold underline cursor-pointer"
                  >
                    Termos de Uso e Política de Privacidade (LGPD)
                  </button>
                  .
                </span>
              </label>
            </>
          )}

          {infoMsg && <p className="text-xs font-medium text-emerald-700">{infoMsg}</p>}
          {error && <p className="text-xs font-medium text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {loading
              ? 'Processando...'
              : tab === 'register'
                ? 'Criar empresa e iniciar onboarding'
                : tab === 'forgot'
                  ? forgotStep === 'email'
                    ? 'Enviar código de recuperação'
                    : 'Redefinir senha'
                  : 'Entrar no painel'}
          </button>

          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setForgotStep('email');
                setError('');
                setInfoMsg('');
              }}
              className="w-full py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Voltar ao login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
