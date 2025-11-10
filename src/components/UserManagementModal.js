import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Shield, User as UserIcon, Save, AlertCircle } from 'lucide-react';
import { database, ref, get, set as dbSet, remove } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';

export default function UserManagementModal({ user, setShowSecuritySettings, isMobile = false }) {
  const { updateUserRole, deleteUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form para criar/editar usuário
  const [formData, setFormData] = useState({ username: '', email: '', role: 'user' });

  // Carregar lista de usuários do Firebase
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const usersRef = ref(database, 'users');
      const snap = await get(usersRef);
      if (snap.exists()) {
        const data = snap.val();
        // Converter para array com ids
        const usersList = Object.entries(data).map(([uid, userData]) => ({
          uid,
          ...userData
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangeRole = async (uid, newRole) => {
    try {
      setError('');
      await updateUserRole(uid, newRole);
      // Atualizar lista local
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      alert('Role atualizado com sucesso');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar role');
    }
  };

  const handleDeleteUser = async (uid, username) => {
    if (!window.confirm(`Tem certeza que deseja deletar o usuário ${username}?`)) {
      return;
    }
    try {
      setError('');
      await deleteUser(uid);
      setUsers(users.filter(u => u.uid !== uid));
      alert('Usuário deletado com sucesso');
    } catch (err) {
      setError(err.message || 'Erro ao deletar usuário');
    }
  };

  const canManageUser = (targetUid) => {
    // Admin pode gerir qualquer um, mas não a si mesmo
    return user.uid !== targetUid;
  };

  const isAdmin = (userRole) => userRole === 'admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-2xl max-h-[90vh] overflow-y-auto'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg md:text-xl font-semibold">Gestão de Usuários</h3>
          </div>
          <button onClick={() => setShowSecuritySettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Lista de usuários */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Usuários ({users.length})</h4>
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setEditingUser(null);
                  setFormData({ username: '', email: '', role: 'user' });
                  setError('');
                }}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                <Plus className="w-4 h-4" /> Novo
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4 text-gray-500">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Nenhum usuário registrado</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {users.map(u => (
                  <div key={u.uid} className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border hover:border-blue-300">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {(u.username || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.username || u.email}</div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Indicador de role */}
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                        isAdmin(u.role)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isAdmin(u.role) ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>

                      {/* Botões (apenas se pode gerenciar) */}
                      {canManageUser(u.uid) && (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.uid, e.target.value)}
                            className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button
                            onClick={() => handleDeleteUser(u.uid, u.username || u.email)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                            title="Deletar usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {u.uid === user.uid && (
                        <span className="text-xs text-gray-500 font-medium">(Você)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário de criar usuário */}
          {showCreateForm && (
            <div className="p-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50">
              <h5 className="font-semibold mb-3 text-green-900">Criar Novo Usuário</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    placeholder="nome_único"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Conta</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="user">Usuário (acesso normal)</option>
                    <option value="admin">Administrador (acesso total)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ username: '', email: '', role: 'user' });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => alert('Para criar usuários, use a página de Registro (LoginPage). Este modal é apenas para gerenciar usuários existentes.')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                  >
                    <Save className="w-4 h-4" /> Criar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Informações úteis */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900 mb-2 font-semibold">💡 Dicas:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use o <strong>dropdown</strong> para trocar User ↔ Admin</li>
              <li>• Clique na <strong>lixeira</strong> para deletar um usuário</li>
              <li>• Para <strong>criar</strong> novos usuários, use a página de Registro</li>
              <li>• Você não pode se remover da lista de admins</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setShowSecuritySettings(false)}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
