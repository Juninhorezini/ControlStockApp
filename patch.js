const fs = require('fs');
let file = fs.readFileSync('src/components/UserManagementModal.js', 'utf8');

// Replace new button section to add an Edit button
const buttonSection = `                          <button
                            onClick={() => handleResetPassword(u.email, u.username || u.email)}
                            className="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"
                            title="Redefinir senha (enviar email)"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setFormData({ username: u.username || '', email: u.email || '', role: u.role || 'user' });
                              setShowCreateForm(false);
                            }}
                            className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar informações"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.uid, u.username || u.email)}`;

file = file.replace(/                          <button\n                            onClick=\{\(\) => handleResetPassword\(u.email, u.username \|\| u.email\)\}\n                            className="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded"\n                            title="Redefinir senha \(enviar email\)"\n                          >\n                            <Key className="w-4 h-4" \/>\n                          <\/button>\n                          <button\n                            onClick=\{\(\) => handleDeleteUser\(u.uid, u.username \|\| u.email\)\}/, buttonSection);


// Add the edit form below showCreateForm
const editFormSection = `          {/* Formulário de Editar usuário */}
          {editingUser && (
            <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
              <h5 className="font-semibold mb-3 text-blue-900">Editar Usuário: {editingUser.username || editingUser.email}</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Conta</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="user">Usuário (acesso normal)</option>
                    <option value="admin">Administrador (acesso total)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setFormData({ username: '', email: '', role: 'user' });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      const username = (formData.username || '').trim();
                      const role = formData.role || 'user';
                      
                      if (!username) return setError('Informe um nome de usuário.');
                      
                      try {
                        setError('');
                        // Atualizar role via auth hook
                        if (editingUser.role !== role) {
                           await updateUserRole(editingUser.uid, role);
                        }
                        
                        // Atualizar username
                        const userRef = ref(database, \`users/\${editingUser.uid}\`);
                        await dbSet(userRef, {
                          ...editingUser,
                          username,
                          role,
                          displayName: username
                        });
                        
                        // Se o username mudou, atualiza a lista de usernames
                        if (editingUser.username !== username) {
                           if (editingUser.username) {
                             await remove(ref(database, \`usernames/\${editingUser.username}\`));
                           }
                           await dbSet(ref(database, \`usernames/\${username}\`), editingUser.uid);
                        }
                        
                        await loadUsers();
                        setEditingUser(null);
                        setFormData({ username: '', email: '', role: 'user' });
                        alert('Informações atualizadas com sucesso!');
                      } catch (err) {
                        console.error('Erro ao editar:', err);
                        setError('Erro ao salvar edições: ' + (err.message || ''));
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    <Save className="w-4 h-4" /> Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}
`;

file = file.replace(/          \{\/\* Formulário de criar usuário \*\/\}/, editFormSection + '\n          {/* Formulário de criar usuário */}');

fs.writeFileSync('src/components/UserManagementModal.js', file);
