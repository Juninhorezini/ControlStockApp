import React from 'react';
import { Settings, Plus, Edit, Lock, User, Save, X } from 'lucide-react';

export function UserAdminModal({
  user,
  userNames,
  securitySettings,
  setSecuritySettings,
  setUserNames,
  editUserName,
  removeAdministrator,
  saveSecuritySettings,
  setShowSecuritySettings,
  getUserDisplayName,
  isMobile
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-lg'}`}>
        <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
          <Settings className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Configurações do Administrador</h3>
        </div>

        <div className="space-y-6">
          {/* Seção: Administradores */}
          <div>
            <label className="block text-sm font-medium mb-4 text-center md:text-left">
              👨‍💼 Gerenciar Administradores
            </label>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: user.color }}></div>
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-blue-600">Administrador Principal (Você)</div>
                  <div className="text-xs text-blue-500">ID: {user.id}</div>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded">
                  Admin
                </span>
              </div>

              {/* Lista de outros admins */}
              {securitySettings.adminUsers && securitySettings.adminUsers
                .filter(adminId => adminId !== user.id)
                .map((adminId) => (
                <div key={adminId} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {getUserDisplayName(adminId).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{getUserDisplayName(adminId)}</div>
                    <div className="text-xs text-gray-500 truncate">ID: {adminId}</div>
                  </div>
                  <button
                    onClick={() => editUserName(adminId)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded text-xs"
                    title="Editar nome"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeAdministrator(adminId)}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                  >
                    Remover
                  </button>
                </div>
              ))}

              {/* Botão para adicionar novo admin */}
              <button
                onClick={() => {
                  const adminId = prompt('Cole o ID do usuário que você quer tornar administrador:', '');
                  if (!adminId || !adminId.trim()) return;

                  const id = adminId.trim();
                  const currentAdmins = securitySettings.adminUsers || [];

                  if (currentAdmins.includes(id)) {
                    alert('Este usuário já é administrador!');
                    return;
                  }

                  const isValidId = (
                    id.toLowerCase().startsWith('user_') ||
                    id.startsWith('USER_') ||
                    /^\d+$/.test(id) ||
                    /^[A-Z0-9]+-[A-Z0-9]+$/i.test(id)
                  ) && id.length >= 5;

                  if (!isValidId) {
                    alert('ID inválido! Deve começar com "user_", "USER_", ser numérico ou formato alfanumérico (ex: ABC123-DEF456).');
                    return;
                  }

                  const name = prompt('Nome personalizado para este administrador (opcional):', '');

                  const updatedAdmins = [...currentAdmins, id];
                  setSecuritySettings({...securitySettings, adminUsers: updatedAdmins});

                  if (name && name.trim()) {
                    setUserNames({...userNames, [id]: name.trim()});
                  }

                  alert(`Administrador adicionado com sucesso!`);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors min-h-[48px]"
              >
                <Plus className="w-4 h-4" />
                Adicionar Administrador
              </button>
            </div>

            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 mb-2">
                ℹ️ <strong>Como funciona:</strong>
              </p>
              <div className="text-xs text-green-700 space-y-1">
                <div>• <strong>Nomes personalizados:</strong> Clique no ícone ✏️ para dar um nome amigável</div>
                <div>• <strong>Adicionar admins:</strong> Use o botão "+" e cole o ID do usuário</div>
                <div>• <strong>IDs:</strong> Cada usuário tem um ID único que aparece na interface</div>
                <div>• <strong>Segurança:</strong> Você não pode remover a si mesmo como admin</div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div>
            <label className="block text-sm font-medium mb-3 text-center md:text-left">
              🔒 Proteção para Exclusão de Prateleiras
            </label>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteProtection"
                  value="none"
                  checked={securitySettings.deleteProtection === 'none'}
                  onChange={(e) => setSecuritySettings({...securitySettings, deleteProtection: e.target.value})}
                  className="w-5 h-5 mt-1 text-blue-600"
                />
                <div>
                  <div className="font-medium">Sem Proteção</div>
                  <div className="text-sm text-gray-500">Qualquer usuário pode excluir prateleiras</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteProtection"
                  value="password"
                  checked={securitySettings.deleteProtection === 'password'}
                  onChange={(e) => setSecuritySettings({...securitySettings, deleteProtection: e.target.value})}
                  className="w-5 h-5 mt-1 text-blue-600"
                />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Proteção por Senha
                  </div>
                  <div className="text-sm text-gray-500">Requer senha para excluir prateleiras</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteProtection"
                  value="admin"
                  checked={securitySettings.deleteProtection === 'admin'}
                  onChange={(e) => setSecuritySettings({...securitySettings, deleteProtection: e.target.value})}
                  className="w-5 h-5 mt-1 text-blue-600"
                />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Apenas Administrador
                  </div>
                  <div className="text-sm text-gray-500">Apenas o usuário administrador pode excluir</div>
                </div>
              </label>
            </div>
          </div>

          {securitySettings.deleteProtection === 'password' && (
            <div>
              <label className="block text-sm font-medium mb-2">Senha de Segurança</label>
              <input
                type="password"
                className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                value={securitySettings.deletePassword}
                onChange={(e) => setSecuritySettings({...securitySettings, deletePassword: e.target.value})}
                placeholder="Digite a senha"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">Esta senha será solicitada para excluir prateleiras</p>
            </div>
          )}

          {securitySettings.deleteProtection === 'admin' && (
            <div>
              <label className="block text-sm font-medium mb-2">Usuário Administrador</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: user.color }}></div>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                  </div>
                  <button
                    onClick={() => setSecuritySettings({...securitySettings, adminUserId: user.id})}
                    className={`px-3 py-2 rounded text-sm min-h-[44px] ${
                      securitySettings.adminUserId === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {securitySettings.adminUserId === user.id ? 'Admin Atual' : 'Definir Admin'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={saveSecuritySettings}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
          <button
            onClick={() => setShowSecuritySettings(false)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 text-center md:text-left">
              🎯 <strong>Sistema Multi-Usuário Ativo:</strong> 2 Níveis
            </p>
            <div className="text-xs text-blue-500 mt-2 space-y-1">
              <div>• <strong>Administradores:</strong> Acesso total ao sistema</div>
              <div>• <strong>Usuários:</strong> Apenas gerenciar produtos</div>
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 text-center md:text-left">
              📊 <strong>Estatísticas do Sistema:</strong>
            </p>
            <div className="text-xs text-green-500 mt-1 space-y-1">
              <div>• <strong>Administradores:</strong> {(securitySettings.adminUsers?.length || 0) + 1} total</div>
              <div>• <strong>Nomes personalizados:</strong> {Object.keys(userNames).length} definidos</div>
              <div>• <strong>Acesso geral:</strong> Usuários ilimitados</div>
              <div>• <strong>Sistema:</strong> Multi-usuário ativo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserAdminModal;
