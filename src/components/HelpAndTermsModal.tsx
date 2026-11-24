import React, { useState } from 'react';
import { BookOpen, ShieldCheck, X } from 'lucide-react';

interface HelpAndTermsModalProps {
  initialTab?: 'ajuda' | 'lgpd';
  onClose: () => void;
}

export const HelpAndTermsModal: React.FC<HelpAndTermsModalProps> = ({
  initialTab = 'ajuda',
  onClose,
}) => {
  const [tab, setTab] = useState<'ajuda' | 'lgpd'>(initialTab);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[86vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tab === 'ajuda' ? (
              <BookOpen className="w-4 h-4 text-[#1E40AF]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#1E40AF]" />
            )}
            <h2 className="font-display text-base font-bold text-slate-900">
              {tab === 'ajuda' ? 'Central de Ajuda & Suporte LORDES' : 'Termos de Uso, LGPD e Aviso Legal'}
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

        <div className="px-5 pt-3 border-b border-slate-100 flex gap-4">
          <button
            type="button"
            onClick={() => setTab('ajuda')}
            className={`pb-2.5 text-xs font-semibold border-b-2 cursor-pointer ${
              tab === 'ajuda' ? 'border-[#1E40AF] text-[#1E40AF]' : 'border-transparent text-slate-500'
            }`}
          >
            Guias por Segmento e Dúvidas
          </button>
          <button
            type="button"
            onClick={() => setTab('lgpd')}
            className={`pb-2.5 text-xs font-semibold border-b-2 cursor-pointer ${
              tab === 'lgpd' ? 'border-[#1E40AF] text-[#1E40AF]' : 'border-transparent text-slate-500'
            }`}
          >
            Termos, Privacidade (LGPD) e Aviso Contábil
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-700 leading-relaxed">
          {tab === 'ajuda' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-bold text-slate-900">Como controlar caixa em Serviços &amp; Obras</div>
                  <p>
                    Separe materiais e mão de obra em custos variáveis por Centro de Custo (Obra). Lance os sinais recebidos e deixe as medições futuras como &quot;Previsto&quot; para enxergar o saldo projetado de 30 dias.
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-bold text-slate-900">Como lançar em 3 toques no celular</div>
                  <p>
                    Use o botão &quot;Lançamento Rápido&quot; no topo: escolha Receita ou Despesa, digite o valor, toque na categoria e clique em Salvar. Leva menos de 10 segundos.
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-bold text-slate-900">Como funciona o Semáforo Financeiro</div>
                  <p>
                    Verde: saldo projetado 30d positivo, margem acima de 10% e inadimplência abaixo de 5%. Amarelo: margem até 10% ou atrasos entre 5% e 15%. Vermelho: projeção negativa, prejuízo ou atraso acima de 15%.
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="font-bold text-slate-900">Canais de atendimento LORDES</div>
                  <p>
                    Suporte via WhatsApp e e-mail em até 1 dia útil no plano Essencial/Profissional e até 4 horas úteis no plano Premium.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="font-bold text-slate-900 mb-2">Enviar sugestão ou dúvida para a equipe LORDES</div>
                {feedbackSent ? (
                  <p className="text-emerald-700 font-semibold">
                    Mensagem registrada. Obrigado pelo feedback!
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!feedbackMsg.trim()) return;
                      setFeedbackSent(true);
                      setFeedbackMsg('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      placeholder="Escreva o que gostaria de melhorar no painel..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 font-semibold text-white bg-[#1E40AF] rounded-lg cursor-pointer"
                    >
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-950">
                <strong>Aviso importante (Seção 9.3):</strong> O Gestor Financeiro LORDES é uma ferramenta de gestão gerencial e controle de fluxo de caixa. Ele <strong>não substitui um contador</strong> e <strong>não emite obrigações fiscais ou guias de impostos</strong>.
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">1. Papéis na LGPD (Controlador x Operador)</h3>
                <p>
                  A empresa cliente contratante é a <strong>Controladora</strong> dos dados financeiros e cadastrais de seus clientes finais; a <strong>LORDES</strong> atua como <strong>Operadora</strong>, tratando os dados exclusivamente para execução do contrato de software e hospedagem (DPA).
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">2. Direitos do Titular e Portabilidade</h3>
                <p>
                  Você pode exportar todos os lançamentos e relatórios em CSV a qualquer momento na aba Configurações, ou solicitar a exclusão definitiva dos dados da conta diretamente pelo painel.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">3. Segurança e Isolamento</h3>
                <p>
                  Cada empresa possui um ambiente lógico isolado (multi-tenant por identificador exclusivo da empresa), senhas protegidas com hash criptográfico scrypt e registro de auditoria das alterações financeiras.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
