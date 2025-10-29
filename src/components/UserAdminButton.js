import React from 'react';
import { Users } from 'lucide-react';

export function UserAdminButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
      title="Gerenciar Usuários e Auditoria"
    >
      <Users className="w-4 h-4" />
      <span className="text-sm font-medium">Usuários</span>
    </button>
  );
}
