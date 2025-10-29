import React, { useState, useEffect } from 'react';
import { Users, Clock, Activity, Mail, Shield, X } from 'lucide-react';
import { database, ref, onValue } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week

  useEffect(() => {
    // Escutar audit_log
    const auditRef = ref(database, 'audit_log');
    const unsubscribe = onValue(auditRef, (snapshot) => {
      const data = snapshot.val() || {};
      const entries = Object.entries(data).map(([id, entry]) => ({
        id,
        ...entry
      }));

      // Ordenar por timestamp (mais recente primeiro)
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setAuditLog(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar por data
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

      return true;
    });
  };

  // Agrupar por usuário
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
          actions: []
        };
      }

      stats[userId].actions.push(entry);
    });

    return Object.values(stats);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
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
      'product_quantity_changed': 'Alterou quantidade'
    };
    return labels[action] || action;
  };

  const filteredLog = getFilteredLog();
  const userStats = getUserStats();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-gray-600 mt-1">
            Visualize atividades e usuários do sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Período:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tudo
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Última Semana
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estatísticas de Usuários */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Ativos ({userStats.length})
            </h3>

            <div className="space-y-3">
              {userStats.map(user => (
                <div
                  key={user.uid}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {user.name}
                        {user.uid === currentUser?.uid && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <Mail className="w-3 h-3 inline mr-1" />
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {user.actions.length} ações
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Log de Auditoria */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Histórico de Atividades ({filteredLog.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando...
              </div>
            ) : filteredLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma atividade registrada
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredLog.map(entry => (
                  <div
                    key={entry.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {entry.user?.displayName || entry.user?.email || 'Usuário'}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm text-gray-600">
                            {getActionLabel(entry.action)}
                          </span>
                        </div>

                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="text-xs text-gray-600 mt-1 pl-4">
                            {entry.details.sku && `SKU: ${entry.details.sku}`}
                            {entry.details.color && ` • ${entry.details.color}`}
                            {entry.details.from !== undefined && entry.details.to !== undefined && 
                              ` • Qtd: ${entry.details.from} → ${entry.details.to}`}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
