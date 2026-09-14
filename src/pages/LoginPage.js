import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader, Package, Eye, EyeOff, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, registerWithRole, resetPassword, error, loading, setError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'user'
  });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setLocalError('');
    setError(null);
    setSuccessMessage('');
  };

  const validateForm = () => {
    if (mode === 'forgot') {
      if (!form.email.trim()) {
        setLocalError('Informe seu email cadastrado');
        return false;
      }
      return true;
    }

    if (!form.email.trim()) {
      setLocalError(mode === 'register' ? 'Email é obrigatório' : 'Email ou nome de usuário é obrigatório');
      return false;
    }

    if (mode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setLocalError('Formato de email inválido');
      return false;
    }

    if (!form.password) {
      setLocalError('Senha é obrigatória');
      return false;
    }

    if (form.password.length < 6) {
      setLocalError('A senha deve ter no mínimo 6 caracteres');
      return false;
    }

    if (mode === 'register') {
      if (!form.username.trim()) {
        setLocalError('Nome de usuário é obrigatório');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setLocalError('As senhas não conferem');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError('');
    setSuccessMessage('');

    try {
      if (mode === 'register') {
        await registerWithRole(form.email.trim(), form.password, form.username.trim(), form.role);
      } else if (mode === 'forgot') {
        const sentTo = await resetPassword(form.email.trim());
        setSuccessMessage(`Link de redefinição de senha enviado para ${sentTo}. Verifique sua caixa de entrada e spam.`);
      } else {
        await login(form.email.trim(), form.password);
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setLocalError(err.message || 'Erro ao processar autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setLocalError('');
    setError(null);
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl shadow-md mx-auto mb-3">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ControlStockApp</h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'register' && 'Crie sua conta para gerenciar estoques'}
              {mode === 'login' && 'Acesse sua conta para continuar'}
              {mode === 'forgot' && 'Recuperação de acesso por email'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                {mode === 'register' ? 'Endereço de Email' : (mode === 'forgot' ? 'Email Cadastrado' : 'Email ou Nome de Usuário')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={mode === 'register' || mode === 'forgot' ? "email" : "text"}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder={mode === 'register' || mode === 'forgot' ? "seu@email.com" : "seu@email.com ou usuario"}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  disabled={loading || isSubmitting}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nome de usuário único
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="ex: junior_estoque"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  disabled={loading || isSubmitting}
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Perfil de Acesso
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  disabled={loading || isSubmitting}
                >
                  <option value="user">Operador / Usuário</option>
                  <option value="admin">Administrador (Controle Total)</option>
                </select>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete={mode === 'register' ? "new-password" : "current-password"}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    disabled={loading || isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>
            )}

            {(error || localError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 leading-relaxed font-medium">
                  {error || localError}
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-3 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {(loading || isSubmitting) ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  {mode === 'register' && 'Cadastrar e Entrar'}
                  {mode === 'login' && 'Entrar no Sistema'}
                  {mode === 'forgot' && 'Enviar Link de Redefinição'}
                </>
              )}
            </button>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium py-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium py-1.5 transition-colors text-center"
                >
                  {mode === 'register'
                    ? 'Já possui uma conta? Faça login aqui'
                    : 'Não possui conta? Registre-se aqui'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Informações de Conexão do Firebase */}
        <div className="mt-4 bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200 text-xs text-gray-600">
          <div className="flex items-center justify-between font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Projeto Firebase:
            </span>
            <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">controlstockapp-538ba</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Database:</span>
            <span className="font-mono text-gray-600 truncate max-w-[200px]">Realtime Database</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> Controle de Estoque de Prateleira v2.0
        </p>
      </div>
    </div>
  );
}