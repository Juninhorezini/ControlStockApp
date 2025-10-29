import React, { useState, useEffect } from 'react';
import { Users, Clock, Activity, Mail, Shield, ChevronLeft, Calendar, Trash2 } from 'lucide-react';
import { database, ref, onValue } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';

export function UserAdminPage({ onClose }) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // users, activity, audit
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const auditRef = ref(database, 'audit_log');
    const unsubscribe = onValue(auditRef, (snapshot) => {
      const data = snapshot.val() || {};
      const entries = Object.entries(data).map(([id, entry]) => ({
        id,
        ...entry
      }));

      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAuditLog(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getUserStats = () => {
    const stats = {};

    auditLog.forEach(entry => {
      const userId = entry.user?.uid || 'unknown';
      const userName = entry.user?.displayName || entry.user?.email || 'Desconhecido';

      if (!stats[userId]) {
        stats[userId] = {
          uid: userId,
          name: userName,
          email: entry.user?.email,
          lastActivity: entry.timestamp,
          totalActions: 0,
          actionsByType: {}
        };
      }

      stats[userId].totalActions++;

      if (!stats[userId].actionsByType[entry.action]) {
        stats[userId].actionsByType[entry.action] = 0;
      }
      stats[userId].actionsByType[entry.action]++;

      if (new Date(entry.timestamp) > new Date(stats[userId].lastActivity)) {
        stats[userId].lastActivity = entry.timestamp;
      }
    });

    return Object.values(stats).sort((a, b) => b.totalActions - a.totalActions);
  };

  const getFilteredLog = () => {
    if (filter === 'all') return auditLog;

    const now = new Date();
    return auditLog.filter(entry => {
      const entryDate = new Date(entry.timestamp);

      if (filter === 'today') {
        return entryDate.toDateString() === now.toDateString();
      }

      if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return entryDate >= weekAgo;
      }

      if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return entryDate >= monthAgo;
      }

      return true;
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', {
      day: '2d',
      month: '2d',
      year: 'numeric',
      hour: '2d',
      minute: '2d'
    });
  };

  const getActionLabel = (action) => {
    const labels = {
      'product_created': 'Criou produto',
      'product_saved': 'Salvou produto',
      'product_updated': 'Atualizou produto',
      'product_deleted': 'Deletou produto',
      'product_moved': 'Moveu produto',
      'product_quantity_changed': 'Alterou quantidade',
      'created': 'Criou',
      'updated': 'Atualizou'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    if (action.includes('created')) return 'border-green-500 bg-green-50';
    if (action.includes('deleted')) return 'border-red-500 bg-red-50';
    if (action.includes('updated') || action.includes('changed')) return 'border-blue-500 bg-blue-50';
    return 'border-gray-500 bg-gray-50';
  };

  const filteredLog = getFilteredLog();
  const userStats = getUserStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Users className="w-8 h-8" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-600 mt-2">
            Visualize usuários, atividades e histórico de auditoria do sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-5 h-5" />
            Usuários ({userStats.length})
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'activity'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Activity className="w-5 h-5" />
            Atividades ({filteredLog.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'audit'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Auditoria Completa
          </button>
        </div>
      </div>

      {/* Filtros */}
      {activeTab !== 'users' && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Período:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 dias
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Tab: Usuários */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Usuários Ativos</h2>

            {userStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userStats.map(user => (
                  <div
                    key={user.uid}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          {user.name}
                          {user.uid === currentUser?.uid && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>{user.totalActions}</strong> ações realizadas
                      </div>

                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Última atividade: {formatDate(user.lastActivity)}
                      </div>

                      {Object.keys(user.actionsByType).length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-600">Ações:</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(user.actionsByType).slice(0, 3).map(([action, count]) => (
                              <span
                                key={action}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                              >
                                {getActionLabel(action)}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Atividades Recentes */}
        {activeTab === 'activity' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Atividades Recentes
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-500">
                Carregando...
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhuma atividade registrada
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLog.slice(0, 50).map(entry => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border-l-4 ${getActionColor(entry.action)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800">
                            {entry.user?.displayName || entry.user?.email || 'Usuário'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-700">
                            {getActionLabel(entry.action)}
                          </span>
                        </div>

                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="text-sm text-gray-600 mb-2">
                            {entry.details.sku && (
                              <span className="mr-3">SKU: <strong>{entry.details.sku}</strong></span>
                            )}
                            {entry.details.color && (
                              <span className="mr-3">Cor: {entry.details.color}</span>
                            )}
                            {entry.details.from !== undefined && entry.details.to !== undefined && (
                              <span>Qtd: {entry.details.from} → {entry.details.to}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.timestamp)}
                          <span className="text-gray-400">•</span>
                          <span>{new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLog.length > 50 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Mostrando 50 de {filteredLog.length} atividades
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Auditoria Completa */}
        {activeTab === 'audit' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Relatório de Auditoria
            </h2>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Total de Ações</div>
                <div className="text-3xl font-bold text-blue-700 mt-1">
                  {auditLog.length}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Usuários Ativos</div>
                <div className="text-3xl font-bold text-green-700 mt-1">
                  {userStats.length}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Hoje</div>
                <div className="text-3xl font-bold text-purple-700 mt-1">
                  {auditLog.filter(e => {
                    const now = new Date();
                    return new Date(e.timestamp).toDateString() === now.toDateString();
                  }).length}
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-600 font-medium">Esta Semana</div>
                <div className="text-3xl font-bold text-orange-700 mt-1">
                  {auditLog.filter(e => {
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return new Date(e.timestamp) >= weekAgo;
                  }).length}
                </div>
              </div>
            </div>

            {/* Tabela de Auditoria */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLog.slice(0, 100).map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">
                          {entry.user?.displayName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.user?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getActionLabel(entry.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.details && Object.keys(entry.details).length > 0 ? (
                          <div>
                            {entry.details.sku && <div>SKU: {entry.details.sku}</div>}
                            {entry.details.color && <div>Cor: {entry.details.color}</div>}
                            {entry.details.from !== undefined && (
                              <div>Qtd: {entry.details.from} → {entry.details.to}</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLog.length > 100 && (
                <div className="text-center py-4 text-gray-500 text-sm border-t">
                  Mostrando 100 de {filteredLog.length} registros
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
