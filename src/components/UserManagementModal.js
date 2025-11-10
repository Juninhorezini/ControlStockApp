import React, { useState } from 'react';
import { X, Plus, Edit, Save } from 'lucide-react';

// Modal de gestão de usuários - versão limpa e minimalista
// Props esperadas:
// - user: usuário corrente
// - userNames: mapeamento (uid_or_key -> displayName) ou lista de usernames dependendo do app
// - setUserNames: função para atualizar cache local de nomes
// - setShowSecuritySettings: função para fechar o modal
// - isMobile: bool

export default function UserManagementModal({ user, userNames = {}, setUserNames = () => {}, setShowSecuritySettings = () => {}, isMobile = false }) {
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const entries = Object.entries(userNames || {});

  const handleCreate = () => {
    const name = (newUsername || '').trim();
    if (!name) return alert('Informe um nome de usuário.');

    // Atualiza cache local apenas (a integração com backend deve ser feita externamente)
    const key = name; // assumimos username-only; o app pode substituir pela chave desejada
    setUserNames(prev => ({ ...(prev || {}), [key]: name }));
    setNewUsername('');
    setCreating(false);
    alert('Usuário adicionado ao cache local. Implemente a criação no backend conforme necessário.');
  };

  const handleEdit = (key) => {
    const current = userNames[key] || '';
    const updated = prompt('Editar nome de exibição', current);
    if (!updated) return;
    setUserNames(prev => ({ ...(prev || {}), [key]: updated.trim() }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-2xl'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Gestão de Usuários</h3>
            <p className="text-sm text-gray-500">Interface limpa (username-only). Implemente ações no backend conforme necessário.</p>
          </div>
          <button onClick={() => setShowSecuritySettings(false)} className="p-2 rounded hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Usuários ({entries.length})</h4>
              <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-2">
              {entries.length === 0 && <div className="text-sm text-gray-500">Nenhum usuário no cache local</div>}
              {entries.map(([key, name]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-gray-500 truncate">Key: {key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(key)} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs flex items-center gap-1"><Edit className="w-3 h-3"/>Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {creating && (
            <div className="p-3 border rounded">
              <label className="block text-sm mb-1">Novo username</label>
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded mb-2" />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2"><Save className="w-4 h-4"/>Criar</button>
                <button onClick={() => { setCreating(false); setNewUsername(''); }} className="px-3 py-2 bg-gray-200 rounded">Cancelar</button>
              </div>
            </div>
          )}

        </div>

        <div className="flex justify-end mt-4">
          <button onClick={() => setShowSecuritySettings(false)} className="px-4 py-2 bg-gray-300 rounded">Fechar</button>
        </div>
      </div>
    </div>
  );
}
