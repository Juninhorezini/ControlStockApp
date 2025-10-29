import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LogoutButton() {
  const { logout, loading, user } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    if (window.confirm('Deseja sair?')) {
      try {
        await logout();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Fazer logout"
    >
      <LogOut className="w-4 h-4" />
      <span className="text-sm">{user.displayName || 'Sair'}</span>
    </button>
  );
}