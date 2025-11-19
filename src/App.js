import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Package, MapPin, Grid, Save, X, Minus, Shield, Settings, Lock, User, ChevronDown } from 'lucide-react';
import { database, ref, onValue, set, update, push, remove , get, onChildAdded, onChildChanged, onChildRemoved} from './firebaseConfig';

// ✅ AUTENTICAÇÃO
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { LogoutButton } from './components/LogoutButton';
import UserManagementModal from './components/UserManagementModal';
import { logAuditAction, addUserMetadata, updateUserMetadata } from './utils/auditService';



// Hook personalizado para substituir useStoredState do Hatchcanvas

// Google Sheets API Configuration
const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbz6K-U6nwjaqh9-zfexQ7B6WKbsOj4fqaL3YxV-A2vXGaBDez-MibIG4W8_2ma0PrKW/exec";

const useStoredState = (key, initialValue) => {
  const [state, setState] = React.useState(() => {
try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [state, setValue];
};




const StockControlApp = () => {
  // Firebase listeners são sempre ativos

  // ✅ AUTENTICAÇÃO
  const { user: authUser } = useAuth();

  if (!authUser) {
    return <LoginPage />;
  }

  const user = {
    id: authUser.uid,
    name: authUser.displayName || authUser.email.split('@')[0],
    email: authUser.email,
    color: '#4CAF50'
  };
  const [shelves, setShelves] = useStoredState('shelves', []);
  const [products, setProducts] = useState({});  // Firebase é a fonte da verdade
  const [selectedShelf, setSelectedShelf] = useStoredState('selectedShelf', 0);
  const [searchSKU, setSearchSKU] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [showAddShelf, setShowAddShelf] = useState(false);
  const [showAddShelfToCorridor, setShowAddShelfToCorridor] = useState(false);
  const [selectedCorridorForNewShelf, setSelectedCorridorForNewShelf] = useState('');
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [moveModeEnabled, setMoveModeEnabled] = useState(false);
  const [dragStartAllowedKey, setDragStartAllowedKey] = useState(null);
  const [isDestHolding, setIsDestHolding] = useState(false);
  const [destHoldTimeout, setDestHoldTimeout] = useState(null);
  const [destinationCandidate, setDestinationCandidate] = useState(null);
  const scrollLockYRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfRows, setNewShelfRows] = useState(4);
  const [newShelfCols, setNewShelfCols] = useState(6);
  const [highlightedPositions, setHighlightedPositions] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteShelfId, setDeleteShelfId] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showEditShelf, setShowEditShelf] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);
  const [showEditCorridor, setShowEditCorridor] = useState(false);
  const [editingCorridor, setEditingCorridor] = useState({ oldName: '', newName: '' });
  const [expandedCorridors, setExpandedCorridors] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Estados para drag & drop - COMPLETO
  const [draggedProduct, setDraggedProduct] = useState(null);
  const [draggedPosition, setDraggedPosition] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  
  // Estados para modal de movimento
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveSourcePosition, setMoveSourcePosition] = useState(null);
  const [moveTargetShelf, setMoveTargetShelf] = useState('');
  const [moveTargetPosition, setMoveTargetPosition] = useState(null);
  
  // Estados mobile - FUNCIONAIS
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdTimeout, setHoldTimeout] = useState(null);
  const [isSourceHolding, setIsSourceHolding] = useState(false);
  const [sourceHoldTimeout, setSourceHoldTimeout] = useState(null);
  
  // Estados para duplo clique mobile
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapPosition, setLastTapPosition] = useState({ row: -1, col: -1 });
  
  // Estados para sistema de relatórios
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    corridor: '',
    shelf: '',
    sku: '',
    color: '',
    sortBy: 'location'
  });
  
  // Auto-scroll simples
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  
  // Configurações de segurança e usuários
  const [securitySettings, setSecuritySettings] = useStoredState('securitySettings', {
    deleteProtection: 'password',
    adminUserId: '',
    deletePassword: 'admin123',
    adminUsers: ['JkioQE_QZznu_5dLJx_ezXkCe85NccHRLn2El58iG0mKrKvn1', 'c4WdOmixXqYhBI3632Nn51GxuVs2'] // Lista de IDs dos administradores (incluindo IDs fixos)
  });

  // Sistema de nomes personalizados para usuários
  const defaultUserNames = {
    // Garantir que o usuário atual sempre tenha seu nome no userNames
    [authUser.uid]: authUser.displayName || authUser.email.split('@')[0],
  };
  const [userNames, setUserNames] = useStoredState('userNames', defaultUserNames);
  
  // Garantir que temos os nomes mais recentes no userNames
  useEffect(() => {
    const updates = {};
    let needsUpdate = false;

    // Sempre manter o nome do usuário atual atualizado
    if (userNames[user.id] !== user.name) {
      updates[user.id] = user.name;
      needsUpdate = true;
    }

    // Se houver atualizações necessárias
    if (needsUpdate) {
      setUserNames(prev => ({
        ...prev,
        ...updates
      }));
    }
  }, [user.id, user.name]);

  // Carregar nomes de usuários do backend (/users) e popular userNames
  useEffect(() => {
    let mounted = true;
    const loadUserNames = async () => {
      try {
        const usersRef = ref(database, 'users');
        const snap = await get(usersRef);
        const data = snap.val() || {};
        const mapped = {};
        Object.entries(data).forEach(([uid, info]) => {
          mapped[uid] = info.displayName || info.username || '';
        });
        if (mounted) setUserNames(prev => ({ ...mapped, ...prev }));
      } catch (err) {
        console.warn('Não foi possível carregar usuários do backend:', err);
      }
    };
    loadUserNames();
    return () => { mounted = false; };
  }, []);
  
  // Estados para gerenciar administradores
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  // Estados para sistema de backup
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importDryRun, setImportDryRun] = useState(true);
  const [importMode, setImportMode] = useState('replace');
  const [importSummary, setImportSummary] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const sanitizeKeySegment = (str) => {
    const s = String(str || '').trim();
    const r = s.replace(/[.#$\[\]\/]/g, '_').replace(/\s+/g, '_');
    return r.length ? r : 'x';
  };

  // Estados para Google Sheets
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useStoredState('sheetsUrl', SHEETS_API_URL);
  const [syncStatus, setSyncStatus] = useState('');

  const lastSheetSyncRef = useRef({});
  const lastLocationQuantitiesRef = useRef({});
  const moveTxnRef = useRef({});

const enqueueSheetSync = async (sku, color, snapshot, lastUpdaterName, lastLocOverride = null, historyAction = null, prevQty = null, newQty = null) => {
    try {
      const key = `${String(sku).trim()}-${String(color).trim()}`;
      const now = Date.now();
      const prev = lastSheetSyncRef.current[key] || 0;
      if (now - prev < 1200) {
        return;
      }
      lastSheetSyncRef.current[key] = now;
      const actionUpper = historyAction ? String(historyAction).toUpperCase() : '';
      const totalAtual = Number(snapshot?.totalQuantity || 0);
      const prevQ = Number(prevQty || 0);
      const newQ = Number(newQty || 0);
      let totalAnterior = totalAtual;
      if (actionUpper === 'ADICIONAR') {
        totalAnterior = totalAtual - newQ;
      } else if (actionUpper === 'ATUALIZAR') {
        totalAnterior = totalAtual - newQ + prevQ;
      } else if (actionUpper === 'REMOVER') {
        totalAnterior = totalAtual + prevQ;
      }

      await syncSingleProductWithSheets(
        sku,
        color,
        snapshot,
        lastUpdaterName,
        lastLocOverride,
        actionUpper,
        prevQ,
        newQ,
        totalAnterior,
        totalAtual
      );
    } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        const sRef = ref(database, 'settings/sheetsUrl');
        const snap = await get(sRef);
        const val = snap.val();
        if (val && typeof val === 'string') setSheetsUrl(val);
      } catch (e) {}
    })();
  }, []);

  const isAdmin = () => {
    return authUser?.role === 'admin';
  };

  const canEditStructure = () => isAdmin();
  const canDeleteShelves = () => isAdmin();
  const canManageUsers = () => isAdmin();

  // Função para obter nome do usuário (personalizado ou padrão)
  const getUserDisplayName = (userId) => {
    return userNames[userId] || `Usuário ${userId.slice(-6)}`;
  };

  // Função para obter nome amigável do usuário para exibição na planilha
  const getFriendlyDisplayName = (userId) => {
    console.log('🔍 Resolvendo nome para userId:', userId, {
      userNamesEntries: Object.entries(userNames),
      currentUser: user,
      securitySettings
    });

    // Se userId for um objeto metadata (ex: { uid, displayName }), usar displayName
    if (userId && typeof userId === 'object') {
      if (userId.displayName) return userId.displayName;
      if (userId.uid && userNames[userId.uid]) return userNames[userId.uid];
    }

    // Se não temos um userId, retornar o nome do usuário atual
    if (!userId) {
      console.log('⚠️ userId vazio, usando nome do usuário atual:', user.name);
      return user.name;
    }
    
    // Se temos um nome personalizado no userNames com key=userId, usar ele
    if (userNames[userId]) {
      console.log('✅ Nome encontrado em userNames:', userNames[userId]);
      return userNames[userId];
    }

    // Se o userId já for um nome (valor) presente em userNames, retorná-lo diretamente
    if (Object.values(userNames || {}).includes(userId)) {
      console.log('✅ userId parece já ser um nome de usuário, retornando:', userId);
      return userId;
    }
    
    // Se o userId é o do usuário atual, usar o nome dele
    if (userId === user?.id) {
      // Atualizar userNames para futuros lookups
      setUserNames(prev => ({
        ...prev,
        [userId]: user.name
      }));
      console.log('✅ É o usuário atual, usando e salvando nome:', user.name);
      return user.name;
    }
    
    // Se é admin, verificar se temos informação no securitySettings
    if (securitySettings?.adminUsers?.includes(userId)) {
      // Procurar por um nome existente
      const existingName = userNames[userId];
      if (existingName) {
        console.log('✅ Nome de admin encontrado:', existingName);
        return existingName;
      }
    }

    // Se chegamos aqui e o userId parece ser um email ou tem um nome embutido
    if (userId.includes('@')) {
      const nameFromEmail = userId.split('@')[0];
      // Salvar para uso futuro
      setUserNames(prev => ({
        ...prev,
        [userId]: nameFromEmail
      }));
      console.log('✅ Nome extraído do email:', nameFromEmail);
      return nameFromEmail;
    }

    // Se ainda não encontramos um nome, mas temos o mesmo userId em outro lugar
    const existingEntry = Object.entries(userNames).find(([key, value]) => 
      key === userId || value.toLowerCase().includes(userId.toLowerCase())
    );
    if (existingEntry) {
      console.log('✅ Nome relacionado encontrado:', existingEntry[1]);
      return existingEntry[1];
    }

    console.log('⚠️ Nenhum nome encontrado, usando fallback:', user.name);
    // Se realmente não encontramos nada, usar o nome do usuário atual
    // mas não mostrar o ID
    return user.name;
  };

  // Async resolver: given a UID, username string, or metadata object, try to return a display name.
  const resolveUserDisplayName = async (idOrObj) => {
    if (!idOrObj) return null;
    // If object with displayName
    if (typeof idOrObj === 'object') {
      if (idOrObj.displayName) return idOrObj.displayName;
      if (idOrObj.username) return idOrObj.username;
      if (idOrObj.uid && userNames?.[idOrObj.uid]) return userNames[idOrObj.uid];
      if (idOrObj.uid) {
        // try fetch from DB
        try {
          const snap = await get(ref(database, `users/${idOrObj.uid}`));
          const data = snap?.val();
          if (data) {
            const name = data.displayName || data.username || (data.email ? data.email.split('@')[0] : idOrObj.uid);
            setUserNames(prev => ({ ...(prev || {}), [idOrObj.uid]: name }));
            return name;
          }
        } catch (e) {
          console.warn('Erro ao buscar usuário por uid:', e);
        }
      }
      return null;
    }

    // If it's already a known username (value), return it
    if (Object.values(userNames || {}).includes(idOrObj)) return idOrObj;

    // If we have mapping uid -> name in userNames
    if (userNames?.[idOrObj]) return userNames[idOrObj];

    // Try to fetch /users/{uid} from DB (may succeed if idOrObj is uid)
    try {
      const snap = await get(ref(database, `users/${idOrObj}`));
      const data = snap?.val();
      if (data) {
        const name = data.displayName || data.username || (data.email ? data.email.split('@')[0] : idOrObj);
        setUserNames(prev => ({ ...(prev || {}), [idOrObj]: name }));
        return name;
      }
    } catch (e) {
      console.warn('Erro ao buscar /users/:', e);
    }

    // If it looks like an email, extract local-part
    if (typeof idOrObj === 'string' && idOrObj.includes('@')) {
      const nameFromEmail = idOrObj.split('@')[0];
      setUserNames(prev => ({ ...(prev || {}), [idOrObj]: nameFromEmail }));
      return nameFromEmail;
    }

    // Fallback: return the string as-is (may be uid)
    return idOrObj;
  };

  // Função para adicionar administrador - CORRIGIDA
  const addAdministrator = () => {
    if (!newAdminId.trim()) {
      alert('❌ ID do usuário é obrigatório!');
      return;
    }

    const adminId = newAdminId.trim();
    const currentAdmins = securitySettings.adminUsers || [];
    
    // Verificar se já é admin
    if (currentAdmins.includes(adminId)) {
      alert('⚠️ Este usuário já é administrador!');
      return;
    }

    // Verificar se é um ID válido (formato básico)
    if (!adminId.startsWith('user_') || adminId.length < 20) {
      alert('❌ ID inválido! Deve começar com "user_" e ter pelo menos 20 caracteres.');
      return;
    }

    try {
      // Adicionar à lista de admins
      const updatedAdmins = [...currentAdmins, adminId];
      const updatedSettings = {...securitySettings, adminUsers: updatedAdmins};
      setSecuritySettings(updatedSettings);

      // Salvar nome personalizado se fornecido
      if (newAdminName.trim()) {
        const updatedNames = {
          ...userNames,
          [adminId]: newAdminName.trim()
        };
        setUserNames(updatedNames);
      }

      // Limpar formulário
      setNewAdminId('');
      setNewAdminName('');
      setShowAddAdmin(false);
      
      const displayName = newAdminName.trim() || getUserDisplayName(adminId);
      alert(`✅ Administrador "${displayName}" adicionado com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao adicionar administrador:', error);
      alert('❌ Erro ao adicionar administrador. Tente novamente.');
    }
  };

  // Função para remover administrador - CORRIGIDA
  const removeAdministrator = (adminId) => {
    if (adminId === user.id) {
      alert('❌ Você não pode remover a si mesmo como administrador!');
      return;
    }

    const displayName = getUserDisplayName(adminId);
    const confirmation = window.confirm(`🗑️ Tem certeza que deseja remover "${displayName}" dos administradores?\n\nEsta ação não pode ser desfeita.`);
    if (!confirmation) return;

    try {
      const currentAdmins = securitySettings.adminUsers || [];
      const updatedAdmins = currentAdmins.filter(id => id !== adminId);
      
      // Verificar se não está removendo o último admin
      if (updatedAdmins.length === 0) {
        alert('❌ Não é possível remover o último administrador do sistema!');
        return;
      }
      
      const updatedSettings = {...securitySettings, adminUsers: updatedAdmins};
      setSecuritySettings(updatedSettings);
      
      alert(`✅ Administrador "${displayName}" removido com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao remover administrador:', error);
      alert('❌ Erro ao remover administrador. Tente novamente.');
    }
  };

  // Função para editar nome do usuário - CORRIGIDA
  const editUserName = (userId) => {
    const currentName = getUserDisplayName(userId);
    const newName = prompt(`✏️ Editar nome do usuário:\n\nID: ${userId}\nNome atual: ${currentName}\n\nNovo nome:`, currentName);
    
    if (newName !== null && newName.trim() !== '') {
      try {
        const updatedNames = {
          ...userNames,
          [userId]: newName.trim()
        };
        setUserNames(updatedNames);
        alert(`✅ Nome atualizado para "${newName.trim()}"`);
      } catch (error) {
        console.error('Erro ao editar nome:', error);
        alert('❌ Erro ao salvar o nome. Tente novamente.');
      }
    }
  };

  // === SISTEMA DE RELATÓRIOS ===
  
  // Gerar dados do relatório
  const generateReportData = () => {
    const data = [];
    
    Object.entries(products).forEach(([key, product]) => {
      const [shelfId, row, col] = key.split('-').map(Number);
      const shelf = shelves.find(s => s.id === shelfId);
      
      if (!shelf) return;
      
      const corridor = shelf.corridor || shelf.name.charAt(0).toUpperCase();
      const location = `L${shelf.rows - row}:C${col + 1}`;
      
      (product.colors || []).forEach(color => {
        data.push({
          corridor,
          shelf: shelf.name,
          location,
          sku: product.sku || '',
          unit: product.unit || 'unidades',
          colorCode: color.code || '',
          quantity: color.quantity || 0,
          shelfId,
          row,
          col
        });
      });
    });
    
    return data;
  };

  // Filtrar dados do relatório
  const filterReportData = (data, filters = reportFilters) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(item => {
      const corridorMatch = !filters.corridor || 
        (item.corridor && item.corridor.toLowerCase().includes(filters.corridor.toLowerCase()));
      
      const shelfMatch = !filters.shelf || 
        (item.shelf && item.shelf.toLowerCase().includes(filters.shelf.toLowerCase()));
      
      const skuMatch = !filters.sku || 
        (item.sku && item.sku.toLowerCase().includes(filters.sku.toLowerCase()));
      
      const colorMatch = !filters.color || 
        (item.colorCode && item.colorCode.toLowerCase().includes(filters.color.toLowerCase()));
      
      return corridorMatch && shelfMatch && skuMatch && colorMatch;
    });
  };

  // Ordenar dados do relatório
  const sortReportData = (data, filters = reportFilters) => {
    return [...data].sort((a, b) => {
      switch (filters.sortBy) {
        case 'location':
          if (a.corridor !== b.corridor) return a.corridor.localeCompare(b.corridor);
          if (a.shelf !== b.shelf) return a.shelf.localeCompare(b.shelf);
          return a.location.localeCompare(b.location);
        case 'sku':
          if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
          return a.colorCode.localeCompare(b.colorCode);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'color':
          if (a.colorCode !== b.colorCode) return a.colorCode.localeCompare(b.colorCode);
          return a.sku.localeCompare(b.sku);
        default:
          return 0;
      }
    });
  };

  // Função para formatar data brasileira
  const formatDateBR = (date = new Date()) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para consolidar produtos por SKU+COR
  const consolidateProductsBySKUColor = () => {
    const consolidated = {};
    
    shelves.forEach(shelf => {
      for (let row = 0; row < shelf.rows; row++) {
        for (let col = 0; col < shelf.cols; col++) {
          const positionKey = `${shelf.id}-${row}-${col}`;
          const product = products[positionKey];
          
          if (product && product.sku) {
            if (product.colors && product.colors.length > 0) {
              product.colors.forEach(color => {
                if (color.quantity > 0) {
                  const key = `${product.sku}|${color.code}`;
                  
                  // 🆕 Dados da localização atual
                  const currentLocation = {
                    corredor: shelf.corridor || shelf.name.charAt(0),
                    prateleira: shelf.name,
                    localizacao: `L${shelf.rows - row}:C${col + 1}`,
                    quantidade: color.quantity,
                    timestamp: product.lastModified || new Date().toISOString()
                  };
                  
                  if (!consolidated[key]) {
                    consolidated[key] = {
                      sku: product.sku,
                      color: color.code,
                      quantity: 0,
                      lastModified: product.lastModified || new Date().toISOString(),
                      lastLocation: currentLocation,  // 🆕 Última localização
                      localizacoes: []  // 🆕 Todas as localizações (para histórico)
                    };
                  }
                  
                  consolidated[key].quantity += color.quantity;
                  consolidated[key].localizacoes.push(currentLocation);
                  
                  // Atualizar última localização se for mais recente
                  if (new Date(currentLocation.timestamp) > new Date(consolidated[key].lastModified)) {
                    consolidated[key].lastModified = currentLocation.timestamp;
                    consolidated[key].lastLocation = currentLocation;
                  }
                }
              });
            }
          }
        }
      }
    });
    
    return Object.values(consolidated);
  };


  
  // ============================================
// SINCRONIZAÇÃO COMPLETA COM GOOGLE SHEETS
// Versão otimizada com Prateleiras + Histórico
// ============================================

// Fila de sincronização
const syncQueue = [];
let isProcessingQueue = false;

const processSyncQueue = async () => {
  if (isProcessingQueue || syncQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (syncQueue.length > 0) {
    const syncTask = syncQueue.shift();
    try {
      await syncTask();
    } catch (error) {
      console.error('❌ Erro ao processar fila de sync:', error);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isProcessingQueue = false;
};

// VERSÃO CORRIGIDA: Agora lê direto do estado products (não do localStorage)
// Agora aceita opcionalmente um snapshot de products para evitar ler estado global
const syncSingleProductWithSheets = async (sku, color = '', productsSnapshot = null, usuarioName = null, lastLocOverride = null, historyAction = null, prevQty = null, newQty = null, prevTotal = null, newTotal = null) => {
  if (!sheetsUrl) return;

  syncQueue.push(async () => {
    try {
      // Se for passado um snapshot, usar imediatamente (garante dado atual enviado)
  // productsSnapshot can be either:
  // - null/undefined -> use in-memory products (with a small wait)
  // - an object keyed by positions (existing behavior)
  // - an object { totalQuantity, localizacoes } returned from Firebase helper (preferred)
  const sourceProducts = productsSnapshot || products;

      // Se não houver snapshot, aguardar um pequeno delay para dar tempo aos listeners
      if (!productsSnapshot) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      let totalQuantity = 0;
      let localizacoesArray = [];

      // If caller passed a precomputed backend snapshot (totalQuantity/localizacoes), use it
      if (sourceProducts && typeof sourceProducts.totalQuantity === 'number' && Array.isArray(sourceProducts.localizacoes)) {
        totalQuantity = sourceProducts.totalQuantity;
        localizacoesArray = sourceProducts.localizacoes;
      } else {
        for (const key of Object.keys(sourceProducts || {})) {
          const product = sourceProducts[key];
          if (product?.sku === sku && product.colors) {
            for (const c of product.colors) {
              if (c.code === color && c.quantity > 0) {
                totalQuantity += c.quantity;
                const [shelfId, row, col] = key.split('-').map(Number);
                const shelf = shelves.find(s => s.id === shelfId);
                if (shelf) {
                  localizacoesArray.push({
                    corredor: shelf.corridor || shelf.name.charAt(0),
                    prateleira: shelf.name,
                    localizacao: `L${shelf.rows - row}:C${col + 1}`,
                    quantidade: c.quantity
                  });
                }
              }
            }
          }
        };
      }

      const lastLocation = lastLocOverride || (localizacoesArray[localizacoesArray.length - 1] || {});

      if (lastLocOverride) {
        localizacoesArray = [lastLocOverride];
      }

      // JSONP request via script tag
      // Debug: log payload summary to ensure localizacoes is present
      try {
        // Se tiver um nome personalizado passado, usar ele
        // Se não, tentar pegar o nome amigável do usuário atual
        const displayName = usuarioName || getFriendlyDisplayName(user.id);

        console.log('SYNC_SINGLE payload:', {
          sku: sku && sku.trim(),
          color: color && color.trim(),
          quantidade: totalQuantity,
          localizacoesCount: Array.isArray(localizacoesArray) ? localizacoesArray.length : 0,
          sampleLocalizacoes: Array.isArray(localizacoesArray) ? localizacoesArray.slice(0,3) : [],
          usuario: displayName,  // Log do nome que será usado
          usuarioOriginal: usuarioName,  // Nome que foi passado
          usuarioAtual: user.name,  // Nome do usuário atual
          userId: user.id  // ID do usuário atual
        });
      } catch (e) {
        // ignore logging errors
      }

      // Se tiver um nome personalizado passado, usar ele
      // Se não, tentar pegar o nome amigável do usuário atual
      const displayName = usuarioName || getFriendlyDisplayName(user.id);

      const params = new URLSearchParams({
        callback: 'handleSyncResponse',
        sku: sku.trim(),
        cor: color.trim(),
        quantidade: totalQuantity,
        usuario: displayName,  // Sempre usar nome amigável
        corredor: lastLocation.corredor || '',
        prateleira: lastLocation.prateleira || '',
        localizacao: lastLocation.localizacao || '',
        localizacoes: JSON.stringify(localizacoesArray),
        action: (historyAction || '').toString(),
        acao: (historyAction || '').toString(),
        from: (prevQty ?? '').toString(),
        to: (newQty ?? '').toString(),
        qtdAnterior: (prevQty ?? '').toString(),
        qtdAtual: (newQty ?? '').toString(),
        totalAnterior: (prevTotal ?? totalQuantity).toString(),
        totalAtual: (newTotal ?? totalQuantity).toString()
      });

      try {
        const resp = await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        if (!resp.ok) throw new Error(String(resp.status));
      } catch (e) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `${sheetsUrl}?${params.toString()}`;
          script.onerror = () => { setSyncStatus('Rede bloqueada para Google Sheets'); reject(new Error('jsonp_failed')); };
          script.onload = () => resolve();
          document.body.appendChild(script);
          setTimeout(() => { try { document.body.removeChild(script); } catch (err) {} }, 5000);
        }).catch(() => {
          try {
            const body = params.toString();
            if (navigator.sendBeacon) {
              const blob = new Blob([body], { type: 'application/x-www-form-urlencoded' });
              navigator.sendBeacon(sheetsUrl, blob);
            }
          } catch (err) {}
        });
      }

    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  });

  processSyncQueue();
};

// Callback global
window.handleSyncResponse = function(response) {
  console.log('✅ Sync response:', response);
};

  // ADICIONAR após a função syncSingleProductWithSheets

// Helper: consultar Firebase para obter total e localizacoes atuais de um SKU+color
const fetchLocationsFromFirebase = async (sku, color) => {
  try {
    const locsRef = ref(database, 'locations');
    const snapshot = await new Promise((resolve) => {
      onValue(locsRef, resolve, { onlyOnce: true });
    });

    const allLocs = snapshot.val() || {};
    let totalQuantity = 0;
    const localizacoes = [];

    let lastUpdatedBy = null;
    for (const [id, loc] of Object.entries(allLocs)) {
      if (String(loc.sku || '').toUpperCase().trim() === String(sku || '').toUpperCase().trim() && String(loc.color || '').toUpperCase().trim() === String(color || '').toUpperCase().trim()) {
        const shelfFromLoc = loc.shelf || {};
        const shelfObj = (Array.isArray(shelves) ? shelves.find(s => s.id === shelfFromLoc.id) : null) || shelfFromLoc;
        totalQuantity += (parseInt(loc.quantity, 10) || 0);
        localizacoes.push({
          corredor: shelfObj.corridor || shelfObj.corridor || shelfObj.name?.charAt?.(0) || '',
          prateleira: shelfObj.name || '',
          localizacao: loc.position ? (`L${(shelfObj.rows || 0) - (loc.position.row || 0)}:C${(loc.position.col || 0) + 1}`) : '',
          quantidade: parseInt(loc.quantity, 10) || 0
        });
        // Capturar quem atualizou por último (se disponível)
        if (loc.metadata && loc.metadata.updated_by) {
          lastUpdatedBy = loc.metadata.updated_by;
        }
      }
    };

    return { totalQuantity, localizacoes, lastUpdatedBy };
  } catch (err) {
    console.error('Erro ao buscar locations do Firebase:', err);
    return { totalQuantity: 0, localizacoes: [], lastUpdatedBy: null };
  }
};

const computeTotalsFromFirebase = async () => {
  try {
    // 1. Buscar prateleiras e localizações do Firebase
    const shelvesRef = ref(database, 'shelves');
    const locsRef = ref(database, 'locations');

    const [shelvesSnapshot, locsSnapshot] = await Promise.all([
        get(shelvesRef),
        get(locsRef)
      ]);

      const shelvesData = shelvesSnapshot.val() || {};
      const allShelves = Object.values(shelvesData);
      const allLocs = locsSnapshot.val() || {};

      // 2. Criar um mapa de prateleiras para consulta rápida
      const shelvesMap = allShelves.reduce((acc, shelf) => {
      if (shelf && shelf.id) {
        acc[shelf.id] = shelf;
      }
      return acc;
    }, {});

    // 3. Calcular os totais
    const skuSet = new Set();
    const colorSet = new Set();
    const corridorSet = new Set();
    let totalQuantity = 0;

    for (const [, loc] of Object.entries(allLocs)) {
      if (loc.sku) skuSet.add(String(loc.sku).trim());
      if (loc.color) colorSet.add(String(loc.color).trim());
      
      // Usar o mapa de prateleiras para encontrar o corredor
      const shelf = shelvesMap[loc.shelfId];
      const corr = shelf ? String((shelf.corridor || (shelf.name && shelf.name.charAt(0))) || '').trim() : '';
      if (corr) corridorSet.add(corr);
      
      totalQuantity += Number(loc.quantity) || 0;
    }

    return {
      produtosUnicos: skuSet.size,
      quantidadeTotal: totalQuantity,
      coresDiferentes: colorSet.size,
      corredores: corridorSet.size
    };
  } catch (e) {
    console.error("Erro ao calcular totais do Firebase:", e);
    return { produtosUnicos: 0, quantidadeTotal: 0, coresDiferentes: 0, corredores: 0 };
  }
};

  // Função para debug da planilha
  const debugSpreadsheet = async () => {
    if (!sheetsUrl) {
      setSyncStatus('Erro: URL da planilha não configurada');
      return;
    }

    try {
      setSyncStatus('Inspecionando planilha...');
      
      await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'debugSheet'
        })
      });

      setSyncStatus('Debug enviado! Verifique os logs no Google Apps Script (Execuções > detalhes da última execução).');
      
      setTimeout(() => {
        setSyncStatus('');
      }, 8000);

    } catch (error) {
      console.error('Erro no debug:', error);
      setSyncStatus('Erro ao inspecionar planilha.');
    }
  };

  // Função para sincronização completa (manual)
  const syncWithGoogleSheets = async () => {
    if (!sheetsUrl) {
      setSyncStatus('Erro: URL da planilha não configurada');
      return;
    }

    try {
      setSyncStatus('Sincronizando...');
      
      const consolidatedProducts = consolidateProductsBySKUColor();
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const product of consolidatedProducts) {
        try {
          const params = new URLSearchParams({
            sku: product.sku.trim(),
            cor: product.color.trim(),
            quantidade: product.quantity,
            usuario: user?.name || 'App React',
            corredor: product.lastLocation.corredor,
            prateleira: product.lastLocation.prateleira,
            localizacao: product.lastLocation.localizacao,
            localizacoes: JSON.stringify(product.localizacoes)
          });

          try {
            const resp = await fetch(sheetsUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            if (!resp.ok) throw new Error(String(resp.status));
            successCount++;
          } catch (e) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = `${sheetsUrl}?${params.toString()}`;
              script.onerror = () => { setSyncStatus('Rede bloqueada para Google Sheets'); reject(new Error('jsonp_failed')); };
              script.onload = () => resolve();
              document.body.appendChild(script);
              setTimeout(() => { try { document.body.removeChild(script); } catch (err) {} }, 3000);
            }).then(() => { successCount++; }).catch(() => {
              try {
                const body = params.toString();
                if (navigator.sendBeacon) {
                  const blob = new Blob([body], { type: 'application/x-www-form-urlencoded' });
                  navigator.sendBeacon(sheetsUrl, blob);
                  successCount++;
                } else {
                  errorCount++;
                }
              } catch (err) {
                errorCount++;
              }
            });
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Enviar resumo de totais para a planilha (para comparação de consistência)
      try {
        const uniqueSkus = new Set(consolidatedProducts.map(p => String(p.sku).trim()));
        const totalQuantity = consolidatedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        const uniqueColors = new Set(consolidatedProducts.map(p => String(p.color).trim()));
        const uniqueCorridors = new Set(
          consolidatedProducts
            .map(p => p.localizacoes)
            .flat()
            .map(loc => String(loc.corredor || '').trim())
            .filter(c => c)
        );

        const summaryPayload = {
          action: 'summaryTotals',
          usuario: user?.name || 'App React',
          totals: {
            produtosUnicos: uniqueSkus.size,
            quantidadeTotal: totalQuantity,
            coresDiferentes: uniqueColors.size,
            corredores: uniqueCorridors.size,
            timestamp: new Date().toISOString()
          }
        }; 

        await fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summaryPayload)
        });
      } catch (e) {
        console.warn('⚠️ Falha ao enviar resumo de totais para a planilha:', e);
      }

      setSyncStatus(`✅ ${successCount} produtos sincronizados ${errorCount > 0 ? `| ❌ ${errorCount} erros` : ''}`);
      
      setTimeout(() => {
        setSyncStatus('');
      }, 5000);

    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncStatus('Erro ao sincronizar com Google Sheets. Verifique a URL e configurações.');
    }
  };

  const lastSummarySentRef = useRef(0);
  const sendSummaryTotalsDebounced = async () => {
    if (!sheetsUrl) return;
    const now = Date.now();
    if (now - (lastSummarySentRef.current || 0) < 10000) return;
    lastSummarySentRef.current = now;
    let totals = await computeTotalsFromFirebase();
    if (
      totals.produtosUnicos === 0 &&
      totals.quantidadeTotal === 0 &&
      totals.coresDiferentes === 0 &&
      totals.corredores === 0 &&
      products && Object.keys(products || {}).length > 0
    ) {
      const consolidatedProducts = consolidateProductsBySKUColor();
      const uniqueSkus = new Set(consolidatedProducts.map(p => String(p.sku).trim()));
      const totalQuantity = consolidatedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const uniqueColors = new Set(consolidatedProducts.map(p => String(p.color).trim()));
      const uniqueCorridors = new Set(
        consolidatedProducts.map(p => p.localizacoes).flat().map(loc => String(loc.corredor || '').trim()).filter(c => c)
      );
      totals = {
        produtosUnicos: uniqueSkus.size,
        quantidadeTotal: totalQuantity,
        coresDiferentes: uniqueColors.size,
        corredores: uniqueCorridors.size
      };
    }
    const params = new URLSearchParams({
      callback: 'handleSyncResponse',
      action: 'summaryTotals',
      usuario: user?.name || 'App React',
      produtosUnicos: String(totals.produtosUnicos),
      quantidadeTotal: String(totals.quantidadeTotal),
      coresDiferentes: String(totals.coresDiferentes),
      corredores: String(totals.corredores),
      timestamp: new Date().toISOString()
    });
    const urls = new Set([sheetsUrl, SHEETS_API_URL].filter(Boolean));
    await Promise.all(Array.from(urls).map(u => new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = `${u}?${params.toString()}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('summary_jsonp_failed'));
        document.body.appendChild(script);
        setTimeout(() => { try { document.body.removeChild(script); } catch (err) {} }, 5000);
      } catch (err) {
        reject(err);
      }
    }).catch(() => {})));
  };

  // Funções de backup e restore
  const exportBackup = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        shelves,
        products,
        securitySettings,
        userNames
      }
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `estoque_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    alert('Backup exportado com sucesso!');
  };

  const importBackup = () => {
    try {
      const backupData = JSON.parse(importData);
      
      if (!backupData.data) {
        alert('Formato de backup inválido!');
        return;
      }

      const confirmRestore = window.confirm(
        'ATENÇÃO: Esta ação irá sobrescrever todos os dados atuais. Deseja continuar?'
      );

      if (!confirmRestore) return;

      // Verificar se é um backup válido
      if (backupData.data.shelves) {
        setShelves(backupData.data.shelves);
      }
      if (backupData.data.products) {
        setProducts(backupData.data.products);
      }
      if (backupData.data.securitySettings) {
        setSecuritySettings(backupData.data.securitySettings);
      }
      if (backupData.data.userNames) {
        setUserNames(backupData.data.userNames);
      }

      setImportData('');
      setShowBackupModal(false);
      alert('Backup restaurado com sucesso!');
      
    } catch (error) {
      alert('Erro ao processar backup: ' + error.message);
    }
  };

  const validateBackupData = (raw) => {
    const data = raw && raw.data ? raw.data : {};
    const shelvesRaw = data.shelves || [];
    const shelvesList = Array.isArray(shelvesRaw) ? shelvesRaw : Object.values(shelvesRaw);
    const productsObj = data.products || {};
    return { shelvesList, productsObj };
  };

  const buildImportSummary = ({ shelvesList, productsObj }) => {
    const shelvesCount = Array.isArray(shelvesList) ? shelvesList.length : 0;
    let productPositions = 0;
    let locationRecords = 0;
    let totalQuantity = 0;
    const skuSet = new Set();
    const colorSet = new Set();
    let sanitizedSegments = 0;
    Object.entries(productsObj || {}).forEach(([key, prod]) => {
      productPositions += 1;
      if (prod && prod.sku) skuSet.add(String(prod.sku).trim());
      const colors = Array.isArray(prod?.colors) ? prod.colors : [];
      colors.forEach(c => {
        colorSet.add(String(c.code || '').trim());
        locationRecords += 1;
        totalQuantity += Number(c.quantity) || 0;
        if (/[.#$\[\]\/\s]/.test(String(c.code || ''))) sanitizedSegments += 1;
      });
    });
    return { shelvesCount, productPositions, locationRecords, totalQuantity, uniqueSkus: skuSet.size, uniqueColors: colorSet.size, sanitizedSegments };
  };

  const applyBackupToFirebase = async ({ shelvesList, productsObj }, { mode = 'replace', batchSize = 200 } = {}) => {
    setIsImporting(true);
    try {
      if (mode === 'replace') {
        await set(ref(database, 'shelves'), null);
        await set(ref(database, 'locations'), null);
      }

      const shelvesById = {};
      for (const shelf of shelvesList) {
        if (!shelf || typeof shelf.id === 'undefined') continue;
        shelvesById[shelf.id] = shelf;
        await set(ref(database, `shelves/${shelf.id}`), shelf);
      }

      let writes = 0;
      for (const [key, prod] of Object.entries(productsObj || {})) {
        const parts = String(key).split('-');
        const shelfId = Number(parts[0]);
        const row = Number(parts[1]);
        const col = Number(parts[2]);
        if (!shelfId && shelfId !== 0) continue;
        const shelf = shelvesById[shelfId] || shelves.find(s => s.id === shelfId);
        const colors = Array.isArray(prod?.colors) ? prod.colors : [];
        for (const color of colors) {
          const locationId = `loc_${shelfId}_${row}_${col}_${sanitizeKeySegment(color.code)}`;
          const locationData = {
            sku: prod.sku,
            color: color.code,
            quantity: color.quantity,
            unit: prod.unit || 'unidades',
            shelf: {
              id: shelfId,
              name: shelf?.name || '',
              corridor: shelf?.corridor || (shelf?.name ? shelf.name[0] : '')
            },
            position: {
              row,
              col,
              label: shelf ? `L${shelf.rows - row}:C${col + 1}` : `L${row}:C${col + 1}`
            },
            metadata: {
              created_at: Date.now(),
              updated_at: Date.now(),
              created_by: 'Importação',
              updated_by: 'Importação'
            }
          };
          await set(ref(database, `locations/${locationId}`), locationData);
          writes += 1;
          if (writes % batchSize === 0) {
            await new Promise(r => setTimeout(r, 20));
          }
        }
      }
    } finally {
      setIsImporting(false);
    }
  };

  const runImportBackup = async (applyToFirebase = false) => {
    try {
      const raw = JSON.parse(importData);
      const normalized = validateBackupData(raw);
      const summary = buildImportSummary(normalized);
      setImportSummary(summary);
      if (!applyToFirebase) {
        alert('Simulação concluída. Veja o resumo abaixo.');
        return;
      }
      const confirmText = importMode === 'replace' ? 'Isto irá substituir os dados atuais no Firebase. Deseja continuar?' : 'Isto irá mesclar com os dados atuais no Firebase. Deseja continuar?';
      const ok = window.confirm(confirmText);
      if (!ok) return;
      await applyBackupToFirebase(normalized, { mode: importMode });
      alert('Importação aplicada ao Firebase com sucesso.');
      setShowBackupModal(false);
      setImportData('');
    } catch (e) {
      alert('Erro ao importar backup: ' + e.message);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
    };
    reader.readAsText(file);
  };

  // Abrir relatório
  const openReport = () => {
    try {
      const rawData = generateReportData();
      const filteredData = filterReportData(rawData);
      const sortedData = sortReportData(filteredData);
      setReportData(sortedData);
      setShowReportModal(true);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('❌ Erro ao gerar relatório. Verifique se há produtos cadastrados.');
    }
  };

  // Atualizar filtros
  const updateReportFilters = (newFilters) => {
    const updatedFilters = { ...reportFilters, ...newFilters };
    setReportFilters(updatedFilters);
    
    // Aplicar filtros imediatamente usando os novos valores
    try {
      const rawData = generateReportData();
      const filteredData = filterReportData(rawData, updatedFilters);
      const sortedData = sortReportData(filteredData, updatedFilters);
      setReportData(sortedData);
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      setReportData([]);
    }
  };

  // Exportar para CSV
  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('❌ Nenhum dado para exportar!');
      return;
    }

    const headers = ['Corredor', 'Prateleira', 'Localização', 'SKU', 'Unidade', 'Código Cor', 'Quantidade'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(item => [
        item.corridor,
        `"${item.shelf}"`,
        item.location,
        item.sku,
        item.unit,
        item.colorCode,
        item.quantity
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✅ Relatório exportado com sucesso!');
  };

  // Copiar relatório
  const copyReportToClipboard = () => {
    if (reportData.length === 0) {
      alert('❌ Nenhum dado para copiar!');
      return;
    }

    const headers = ['Corredor', 'Prateleira', 'Localização', 'SKU', 'Unidade', 'Código Cor', 'Quantidade'];
    const tableContent = [
      headers.join('\t'),
      ...reportData.map(item => [
        item.corridor,
        item.shelf,
        item.location,
        item.sku,
        item.unit,
        item.colorCode,
        item.quantity
      ].join('\t'))
    ].join('\n');

    copyToClipboard(tableContent, 'Relatório');
  };

  // Imprimir relatório
  const printReport = () => {
    if (reportData.length === 0) {
      alert('❌ Nenhum dado para imprimir!');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Estoque - ${new Date().toLocaleDateString('pt-BR')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2563eb; text-align: center; margin-bottom: 20px; }
          .info { text-align: center; margin-bottom: 30px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .summary { margin-top: 30px; padding: 15px; background-color: #f0f9ff; border-radius: 5px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>📦 Relatório JR Localização de Estoque</h1>
        <div class="info">
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          <p><strong>Total de itens:</strong> ${reportData.length}</p>
<p><strong>Sistema:</strong> JR Localização de Estoque</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Corredor</th>
              <th>Prateleira</th>
              <th>Localização</th>
              <th>SKU</th>
              <th>Unidade</th>
              <th>Código Cor</th>
              <th>Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(item => `
              <tr>
                <td>${item.corridor}</td>
                <td>${item.shelf}</td>
                <td>${item.location}</td>
                <td><strong>${item.sku}</strong></td>
                <td>${item.unit}</td>
                <td>${item.colorCode}</td>
                <td><strong>${item.quantity}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <h3>📊 Resumo:</h3>
          <p><strong>Total de produtos únicos:</strong> ${[...new Set(reportData.map(item => item.sku))].length}</p>
          <p><strong>Total de cores:</strong> ${reportData.length}</p>
          <p><strong>Quantidade total:</strong> ${reportData.reduce((sum, item) => sum + item.quantity, 0)} unidades</p>
          <p><strong>Corredores:</strong> ${[...new Set(reportData.map(item => item.corridor))].sort().join(', ')}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Navegar até item do relatório
  const navigateToItem = (item) => {
    const targetShelfIndex = shelves.findIndex(s => s.id === item.shelfId);
    if (targetShelfIndex === -1) return;
    
    setSelectedShelf(targetShelfIndex);
    
    setExpandedCorridors(prev => ({
      ...prev,
      [item.corridor]: true
    }));
    
    setShowReportModal(false);
    
    const position = `${item.shelfId}-${item.row}-${item.col}`;
    setHighlightedPositions([position]);
    
    setTimeout(() => {
      const element = document.querySelector(`[data-position="${position}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    }, 500);
    
    setTimeout(() => {
      setHighlightedPositions([]);
    }, 3000);
  };

  // Função para copiar ID para área de transferência
  const copyToClipboard = (text, label = 'ID') => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        alert(`✅ ${label} copiado para área de transferência!`);
      }).catch(() => {
        // Fallback para dispositivos que não suportam clipboard API
        copyToClipboardFallback(text, label);
      });
    } else {
      copyToClipboardFallback(text, label);
    }
  };

  // Fallback para copiar texto (especialmente para iOS)
  const copyToClipboardFallback = (text, label = 'ID') => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert(`✅ ${label} copiado para área de transferência!`);
    } catch (err) {
      // Se tudo falhar, mostra o ID em um prompt para cópia manual
      prompt(`📋 Copie este ${label} manualmente:`, text);
    }
    
    document.body.removeChild(textArea);
  };

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  // Firebase sync - OTIMIZADO (Child Listeners = 99% menos bandwidth)
  // Firebase sync - OTIMIZADO com detecção de inatividade
  useEffect(() => {
    console.log('Firebase: Conectando com child listeners...');

    let isUserActive = true;
    let inactivityTimer;
    let lastUpdate = 0;
    let initialLoadComplete = false; // Flag para ignorar onChildAdded durante carga inicial
    const UPDATE_THROTTLE = 2000; // 2 segundos
    const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutos

    // Detectar inatividade após 3 minutos
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      isUserActive = true;

      inactivityTimer = setTimeout(() => {
        isUserActive = false;
        console.log('🔥 Firebase: Usuário inativo - listeners pausados');
        // Desconectar listeners aqui
      }, INACTIVITY_TIMEOUT); // 3 minutos
    };

    // Event listeners de atividade
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);

    // Setup Firebase APENAS se ativo
    if (!isUserActive) return;

    resetInactivityTimer(); // Iniciar timer

    try {
      // Sync shelves (onValue OK - shelves mudam pouco)
      const shelvesRef = ref(database, 'shelves');
      const unsubShelves = onValue(shelvesRef, (snapshot) => {
        if (!isUserActive) {
          console.log('⏸️ Shelves update ignorado - usuário inativo');
          return;
        }
        const data = snapshot.val();
        if (data) {
          setShelves(Object.values(data));
          console.log('Prateleiras carregadas:', Object.values(data).length);
        }
      });

      // Locations: get inicial + child listeners (OTIMIZADO)
      const locsRef = ref(database, 'locations');

      // 1. Carga inicial (uma vez)
      get(locsRef).then((snapshot) => {
        const locs = snapshot.val() || {};
        const prods = {};

        Object.entries(locs).forEach(([id, loc]) => {
          lastLocationQuantitiesRef.current[id] = Number(loc.quantity) || 0;
          const key = loc.shelf.id + '-' + loc.position.row + '-' + loc.position.col;
          if (!prods[key]) {
            prods[key] = { 
              sku: loc.sku, 
              unit: loc.unit, 
              colors: [],
              lastModified: new Date(loc.metadata.updated_at).toISOString(),
              modifiedBy: loc.metadata.updated_by
            };
          }
          prods[key].colors.push({ code: loc.color, quantity: loc.quantity });
        });

        console.log('setProducts chamado! Produtos:', Object.keys(prods).length);
        setProducts(prods);
        console.log('Localizacoes carregadas:', Object.keys(locs).length);

        // Marcar carga inicial como completa
        setTimeout(() => {
          initialLoadComplete = true;
          console.log('✅ Carga inicial completa - onChildAdded ativo para novos itens');
          sendSummaryTotalsDebounced();
        }, 1000);
      });

      // 2. Child listeners COM THROTTLE e verificação de inatividade

      const unsubAdded = onChildAdded(locsRef, (snapshot) => {
        // Ignorar eventos da carga inicial (já carregamos com get())
        if (!initialLoadComplete) {
          return;
        }

        const loc = snapshot.val();
        console.log('➕ Child added detectado:', snapshot.key);
        const key = loc.shelf.id + '-' + loc.position.row + '-' + loc.position.col;

        setProducts(prev => {
          const newProds = { ...prev };
          if (!newProds[key]) {
            newProds[key] = {
              sku: loc.sku,
              unit: loc.unit,
              colors: [],
              lastModified: new Date(loc.metadata.updated_at).toISOString(),
              modifiedBy: loc.metadata.updated_by
            };
          }

          const colorIndex = newProds[key].colors.findIndex(c => c.code === loc.color);
          if (colorIndex >= 0) {
            newProds[key].colors[colorIndex] = { code: loc.color, quantity: loc.quantity };
          } else {
            newProds[key].colors.push({ code: loc.color, quantity: loc.quantity });
          }

          return newProds;
        });

        console.log('Location adicionada:', snapshot.key);

        // Após adicionar a location no estado, disparar sync para Google Sheets
        // somente se a carga inicial já foi completada e se a alteração
        // não foi originalmente feita por este mesmo usuário (evita duplicatas)
        if (initialLoadComplete) {
          try {
            const locSku = loc.sku;
            const locColor = loc.color;
            const updatedByRaw = loc.metadata?.updated_by;
            const updatedBy = (typeof updatedByRaw === 'string') ? updatedByRaw : (updatedByRaw?.displayName || (updatedByRaw?.uid ? userNames?.[updatedByRaw.uid] : null));
            const k = `${String(locSku).trim()}-${String(locColor).trim()}`;
            const txn = moveTxnRef.current[k];
            const isMoveAdd = txn && txn.to && txn.to.shelfId === (loc.shelf?.id) && txn.to.row === (loc.position?.row) && txn.to.col === (loc.position?.col) && (txn.expires || 0) > Date.now();
            if (isMoveAdd) {
              lastLocationQuantitiesRef.current[snapshot.key] = Number(loc.quantity) || 0;
            } else if (updatedBy && updatedBy === user.name) {
              (async () => {
                const backendSnapshot = await fetchLocationsFromFirebase(locSku, locColor);
                const shelfObj = loc.shelf || {};
                const pos = loc.position || {};
                const lastLocOverride = {
                  corredor: shelfObj.corridor || (shelfObj.name ? shelfObj.name.charAt(0) : ''),
                  prateleira: shelfObj.name || '',
                  localizacao: (pos?.label) || ((typeof shelfObj.rows === 'number' && typeof pos.row === 'number' && typeof pos.col === 'number')
                    ? `L${shelfObj.rows - pos.row}:C${pos.col + 1}`
                    : ''),
                  quantidade: Number(loc.quantity) || 0
                };
                const locId = snapshot.key;
                const prevQty = 0;
                const newQty = Number(loc.quantity) || 0;
                lastLocationQuantitiesRef.current[locId] = newQty;
                enqueueSheetSync(locSku, locColor, backendSnapshot, updatedBy, lastLocOverride, 'ADICIONAR', prevQty, newQty);
              })();
            }
            if (!isMoveAdd) sendSummaryTotalsDebounced();
          } catch (err) {
            console.error('❌ Erro ao disparar sync após child added:', err);
          }
        }
      });

      const unsubChanged = onChildChanged(locsRef, (snapshot) => {
        const loc = snapshot.val();
        console.log('✏️ Child changed detectado:', snapshot.key);
        const key = loc.shelf.id + '-' + loc.position.row + '-' + loc.position.col;
        const prevProduct = products ? products[key] : null;
        const prevColorEntry = prevProduct ? (prevProduct.colors || []).find(c => c.code === loc.color) : null;
        const prevQtyState = prevColorEntry ? Number(prevColorEntry.quantity) || 0 : 0;

        setProducts(prev => {
          const newProds = { ...prev };
          if (newProds[key]) {
            const colorIndex = newProds[key].colors.findIndex(c => c.code === loc.color);
            if (colorIndex >= 0) {
              newProds[key].colors[colorIndex] = { code: loc.color, quantity: loc.quantity };
              newProds[key].lastModified = new Date(loc.metadata.updated_at).toISOString();
            } else {
              newProds[key].colors.push({ code: loc.color, quantity: loc.quantity });
              newProds[key].lastModified = new Date(loc.metadata.updated_at).toISOString();
            }
          }
          return newProds;
        });

        console.log('Location modificada:', snapshot.key);

        // Disparar sync quando uma location for alterada por outro usuário
        if (initialLoadComplete) {
          try {
            const locSku = loc.sku;
            const locColor = loc.color;
            const updatedByRaw = loc.metadata?.updated_by;
            const updatedBy = (typeof updatedByRaw === 'string') ? updatedByRaw : (updatedByRaw?.displayName || (updatedByRaw?.uid ? userNames?.[updatedByRaw.uid] : null));
            if (updatedBy && updatedBy === user.name) {
              (async () => {
                const backendSnapshot = await fetchLocationsFromFirebase(locSku, locColor);
                const shelfObj = loc.shelf || {};
                const pos = loc.position || {};
                const lastLocOverride = {
                  corredor: shelfObj.corridor || (shelfObj.name ? shelfObj.name.charAt(0) : ''),
                  prateleira: shelfObj.name || '',
                  localizacao: (pos?.label) || ((typeof shelfObj.rows === 'number' && typeof pos.row === 'number' && typeof pos.col === 'number')
                    ? `L${shelfObj.rows - pos.row}:C${pos.col + 1}`
                    : ''),
                  quantidade: Number(loc.quantity) || 0
                };
                const locId = snapshot.key;
                const prevQty = lastLocationQuantitiesRef.current[locId] ?? prevQtyState;
                const newQty = Number(loc.quantity) || 0;
                if (prevQty === newQty) return; // mudança só de metadata, não registrar histórico
                lastLocationQuantitiesRef.current[locId] = newQty;
                enqueueSheetSync(locSku, locColor, backendSnapshot, updatedBy, lastLocOverride, 'ATUALIZAR', prevQty, newQty);
              })();
            }
            sendSummaryTotalsDebounced();
          } catch (err) {
            console.error('❌ Erro ao disparar sync após child changed:', err);
          }
        }
      });

      const unsubRemoved = onChildRemoved(locsRef, (snapshot) => {
        if (!isUserActive) {
          console.log('⏸️ Child removed ignorado - usuário inativo');
          return;
        }

        const loc = snapshot.val();
        const key = loc.shelf.id + '-' + loc.position.row + '-' + loc.position.col;
        const prevProduct = products ? products[key] : null;
        const prevColorEntry = prevProduct ? (prevProduct.colors || []).find(c => c.code === loc.color) : null;
        const prevQtyState = prevColorEntry ? Number(prevColorEntry.quantity) || 0 : (Number(loc.quantity) || 0);

        setProducts(prev => {
          const newProds = { ...prev };
          if (newProds[key]) {
            newProds[key].colors = newProds[key].colors.filter(c => c.code !== loc.color);
            if (newProds[key].colors.length === 0) {
              delete newProds[key];
            }
          }
          return newProds;
        });

      console.log('Location removida:', snapshot.key);
        if (initialLoadComplete) {
          (async () => {
            try {
              await new Promise(resolve => setTimeout(resolve, 600));
              const locSku = loc.sku;
              const locColor = loc.color;
              const removedByRaw = loc.metadata?.removed_by || loc.metadata?.updated_by;
              const removedBy = (typeof removedByRaw === 'string') ? removedByRaw : (removedByRaw?.displayName || (removedByRaw?.uid ? userNames?.[removedByRaw.uid] : null));
              const k = `${String(locSku).trim()}-${String(locColor).trim()}`;
              const txn = moveTxnRef.current[k];
              const isMoveRemove = txn && txn.from && txn.from.shelfId === (loc.shelf?.id) && txn.from.row === (loc.position?.row) && txn.from.col === (loc.position?.col) && (txn.expires || 0) > Date.now();
              if (isMoveRemove && removedBy && removedBy === user.name) {
                const backendSnapshot = await fetchLocationsFromFirebase(locSku, locColor);
                const destShelf = shelves.find(s => s.id === txn.to.shelfId) || {};
                const lastLocOverride = {
                  corredor: destShelf.corridor || (destShelf.name ? destShelf.name.charAt(0) : ''),
                  prateleira: destShelf.name || '',
                  localizacao: `L${(destShelf.rows || 0) - txn.to.row}:C${txn.to.col + 1}`,
                  quantidade: Number(txn.qty) || 0
                };
                const locId = snapshot.key;
                const prevQty = Number(txn.qty) || 0;
                delete lastLocationQuantitiesRef.current[locId];
                await enqueueSheetSync(locSku, locColor, backendSnapshot, user.name, lastLocOverride, 'ATUALIZAR', prevQty, prevQty);
                delete moveTxnRef.current[k];
                lastSummarySentRef.current = 0;
              } else if (removedBy && removedBy === user.name) {
                const backendSnapshot = await fetchLocationsFromFirebase(locSku, locColor);
                const shelfObj = loc.shelf || {};
                const pos = loc.position || {};
                const lastLocOverride = {
                  corredor: shelfObj.corridor || (shelfObj.name ? shelfObj.name.charAt(0) : ''),
                  prateleira: shelfObj.name || '',
                  localizacao: (pos?.label) || ((typeof shelfObj.rows === 'number' && typeof pos.row === 'number' && typeof pos.col === 'number')
                    ? `L${shelfObj.rows - pos.row}:C${pos.col + 1}`
                    : ''),
                  quantidade: 0
                };
                const locId = snapshot.key;
                const prevQty = lastLocationQuantitiesRef.current[locId] ?? prevQtyState;
                delete lastLocationQuantitiesRef.current[locId];
                await enqueueSheetSync(locSku, locColor, backendSnapshot, user.name, lastLocOverride, 'REMOVER', prevQty, 0);
              }
            } catch (err) {
              console.error('❌ Erro ao sincronizar após remoção:', err);
            } finally {
              sendSummaryTotalsDebounced();
            }
          })();
        }
      });

      return () => {
        clearTimeout(inactivityTimer);
        window.removeEventListener('mousemove', resetInactivityTimer);
        window.removeEventListener('keydown', resetInactivityTimer);
        window.removeEventListener('click', resetInactivityTimer);
        window.removeEventListener('touchstart', resetInactivityTimer);
        window.removeEventListener('scroll', resetInactivityTimer);
        unsubShelves();
        unsubAdded();
        unsubChanged();
        unsubRemoved();
        console.log('✅ Firebase: Cleanup completo - listeners desconectados');
      };
    } catch (err) {
      console.error('Firebase erro:', err);
    }
  }, [])

  // Inicializar dados se necessário
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!Array.isArray(shelves) || shelves.length === 0) {
        const defaultShelves = [
          { id: 1, name: 'Corredor A - Prateleira 1', rows: 4, cols: 6, corridor: 'A' },
          { id: 2, name: 'Corredor A - Prateleira 2', rows: 3, cols: 5, corridor: 'A' },
          { id: 3, name: 'Corredor B - Prateleira 1', rows: 5, cols: 4, corridor: 'B' }
        ];
        setShelves(defaultShelves);
        
        const exampleProducts = {
          '1-0-0': { 
            sku: 'FO130', 
            unit: 'caixas',
            colors: [
              { code: '102', quantity: 6 },
              { code: '103', quantity: 5 },
              { code: '107', quantity: 9 }
            ]
          },
          '1-0-1': { 
            sku: 'BR250', 
            unit: 'peças',
            colors: [
              { code: '101', quantity: 15 },
              { code: '105', quantity: 8 }
            ]
          },
          '1-1-2': { 
            sku: 'AL100', 
            unit: 'caixas',
            colors: [
              { code: '102', quantity: 12 }
            ]
          },
          '2-0-0': { 
            sku: 'FO130', 
            unit: 'caixas',
            colors: [
              { code: '102', quantity: 3 },
              { code: '110', quantity: 7 }
            ]
          },
          '3-2-1': { 
            sku: 'TX400', 
            unit: 'unidades',
            colors: [
              { code: '201', quantity: 50 },
              { code: '202', quantity: 30 },
              { code: '203', quantity: 25 },
              { code: '204', quantity: 18 }
            ]
          }
        };
        setProducts(exampleProducts);
      }
      // REMOVIDO: A lógica de auto-promoção agora é apenas no isAdmin()
      // Não forçar mais o usuário a ser admin na inicialização

      setIsInitialized(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [user.id]);

  // Função para validar prateleira
  const isValidShelf = (shelf) => {
    return shelf && 
           typeof shelf === 'object' && 
           typeof shelf.id === 'number' &&
           typeof shelf.name === 'string' &&
           typeof shelf.rows === 'number' && 
           typeof shelf.cols === 'number' && 
           shelf.rows > 0 && 
           shelf.cols > 0 &&
           shelf.rows <= 10;
           // Removido limite de colunas: && shelf.cols <= 10;
  };

  // Obter prateleira atual de forma segura
  const getCurrentShelf = () => {
    if (!isInitialized || !Array.isArray(shelves) || shelves.length === 0) {
      return null;
    }

    // Tentar a prateleira selecionada
    const selectedOne = shelves[selectedShelf];
    if (isValidShelf(selectedOne)) {
      return selectedOne;
    }

    // Tentar a primeira prateleira
    const firstOne = shelves[0];
    if (isValidShelf(firstOne)) {
      return firstOne;
    }

    // Procurar qualquer prateleira válida
    const validShelf = shelves.find(isValidShelf);
    return validShelf || null;
  };

  const currentShelf = getCurrentShelf();

  // Scroll automático para o início quando mudar de prateleira - FORÇADO
  useEffect(() => {
    if (currentShelf) {
      // Função para forçar scroll para início
      const forceScrollToStart = () => {
        // Tentar múltiplos seletores para encontrar o container de scroll
        const selectors = [
          `#shelf-container-${currentShelf.id}`,
          '.shelf-scroll-container',
          '.overflow-x-auto',
          '[style*="overflow-x: auto"]',
          '[style*="overflowX: auto"]'
        ];
        
        let scrollContainer = null;
        for (const selector of selectors) {
          scrollContainer = document.querySelector(selector);
          if (scrollContainer) break;
        }
        
        if (scrollContainer) {
          // FORÇAR scroll para posição 0
          scrollContainer.scrollLeft = 0;
          scrollContainer.scrollTo({ left: 0, behavior: 'instant' });
          
          // Backup: Forçar via style também
          scrollContainer.style.scrollBehavior = 'auto';
          scrollContainer.scrollLeft = 0;
          
          console.log(`🔄 Scroll resetado para prateleira ${currentShelf.name} - scrollLeft: ${scrollContainer.scrollLeft}`);
        } else {
          console.warn('⚠️ Container de scroll não encontrado');
        }
      };
      
      // Executar imediatamente
      forceScrollToStart();
      
      // Backup: Tentar novamente após delay
      setTimeout(forceScrollToStart, 50);
      setTimeout(forceScrollToStart, 150);
      setTimeout(forceScrollToStart, 300);
    }
  }, [selectedShelf, currentShelf?.id]);

  const createShelf = () => {
    if (!newShelfName.trim()) return;
    
    const newShelf = {
      id: Date.now(),
      name: newShelfName.trim(),
      rows: Math.max(1, Math.min(10, parseInt(newShelfRows) || 4)),
      cols: Math.max(1, parseInt(newShelfCols) || 6),
      corridor: newShelfName.charAt(0).toUpperCase()
    };
    
    setShelves([...(Array.isArray(shelves) ? shelves : []), newShelf]);
    setNewShelfName('');
    setShowAddShelf(false);
  };

  // Função para criar prateleira em corredor específico
  const openAddShelfToCorridor = (corridor) => {
    setSelectedCorridorForNewShelf(corridor);
    setShowAddShelfToCorridor(true);
    
    // Sugerir um nome baseado no corredor e quantidade de prateleiras existentes
    const corridorShelves = shelves.filter(shelf => 
      (shelf.corridor || shelf.name.charAt(0).toUpperCase()) === corridor
    );
    const nextNumber = corridorShelves.length + 1;
    setNewShelfName(`Corredor ${corridor} - Prateleira ${nextNumber}`);
  };

  const createShelfInCorridor = () => {
    if (!newShelfName.trim() || !selectedCorridorForNewShelf) return;
    
    const newShelf = {
      id: Date.now(),
      name: newShelfName.trim(),
      rows: Math.max(1, Math.min(10, parseInt(newShelfRows) || 4)),
      cols: Math.max(1, parseInt(newShelfCols) || 6),
      corridor: selectedCorridorForNewShelf
    };
    
    setShelves([...(Array.isArray(shelves) ? shelves : []), newShelf]);
    setNewShelfName('');
    setShowAddShelfToCorridor(false);
    setSelectedCorridorForNewShelf('');
    
    // Expandir o corredor automaticamente para mostrar a nova prateleira
    setExpandedCorridors(prev => ({
      ...prev,
      [selectedCorridorForNewShelf]: true
    }));
  };

  const requestDeleteShelf = (shelfId) => {
    if (securitySettings.deleteProtection === 'none') {
      deleteShelf(shelfId);
      return;
    }
    
    if (securitySettings.deleteProtection === 'admin') {
      if (user.id !== securitySettings.adminUserId) {
        alert('Apenas o administrador pode excluir prateleiras!');
        return;
      }
      deleteShelf(shelfId);
      return;
    }
    
    if (securitySettings.deleteProtection === 'password') {
      setDeleteShelfId(shelfId);
      setShowDeleteConfirm(true);
      return;
    }
  };

  const confirmDeleteShelf = () => {
    if (deletePassword !== securitySettings.deletePassword) {
      alert('Senha incorreta!');
      return;
    }
    
    deleteShelf(deleteShelfId);
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteShelfId(null);
  };

  const deleteShelf = (shelfId) => {
    const newShelves = (Array.isArray(shelves) ? shelves : []).filter(shelf => shelf.id !== shelfId);
    setShelves(newShelves);
    
    const newProducts = { ...(products || {}) };
    Object.keys(newProducts).forEach(key => {
      if (key.startsWith(`${shelfId}-`)) {
        delete newProducts[key];
      }
    });
    setProducts(newProducts);
    
    if (selectedShelf >= newShelves.length) {
      setSelectedShelf(0);
    }
  };

  const saveSecuritySettings = () => {
    // Salvar sem forçar o usuário atual como admin
    setSecuritySettings({ ...securitySettings });
    setShowSecuritySettings(false);
  };

  // Função para editar prateleira
  const openEditShelf = (shelf) => {
    setEditingShelf({ 
      ...shelf,
      newRows: shelf.rows,
      newCols: shelf.cols,
      originalRows: shelf.rows,
      originalCols: shelf.cols
    });
    setShowEditShelf(true);
  };

  const saveEditShelf = () => {
    if (!editingShelf.name.trim()) return;
    
    const newRows = Math.max(1, Math.min(10, parseInt(editingShelf.newRows) || editingShelf.originalRows));
    const newCols = Math.max(1, parseInt(editingShelf.newCols) || editingShelf.originalCols);
    
    // Verificar se as dimensões mudaram
    const dimensionsChanged = newRows !== editingShelf.originalRows || newCols !== editingShelf.originalCols;
    
    // Se as dimensões mudaram, verificar produtos que podem ser afetados
    if (dimensionsChanged) {
      const affectedProducts = [];
      Object.entries(products).forEach(([key, product]) => {
        const [shelfId, row, col] = key.split('-');
        if (parseInt(shelfId) === editingShelf.id) {
          const productRow = parseInt(row);
          const productCol = parseInt(col);
          // Se o produto está em uma posição que será removida
          if (productRow >= newRows || productCol >= newCols) {
            affectedProducts.push({
              key,
              product,
              position: `L${editingShelf.originalRows - productRow}:C${productCol + 1}`
            });
          }
        }
      });
      
      // Se há produtos afetados, perguntar ao usuário
      if (affectedProducts.length > 0) {
        const productList = affectedProducts.map(p => `${p.product.sku} (${p.position})`).join(', ');
        const confirmation = window.confirm(
          `⚠️ ATENÇÃO: Reduzir o tamanho da prateleira irá remover ${affectedProducts.length} produto(s):\n\n${productList}\n\nDeseja continuar? Os produtos serão perdidos permanentemente.`
        );
        
        if (!confirmation) {
          return; // Usuário cancelou
        }
        
        // Remover produtos afetados
        const newProducts = { ...products };
        affectedProducts.forEach(({ key }) => {
          delete newProducts[key];
        });
        setProducts(newProducts);
      }
    }
    
    // Atualizar a prateleira
    const updatedShelves = shelves.map(shelf => 
      shelf.id === editingShelf.id 
        ? { 
            ...editingShelf, 
            name: editingShelf.name.trim(),
            rows: newRows,
            cols: newCols
          }
        : shelf
    );
    
    setShelves(updatedShelves);
    setShowEditShelf(false);
    setEditingShelf(null);
  };

  // Função para agrupar prateleiras por corredor
  const groupShelvesByCorridor = () => {
    const groups = {};
    
    (Array.isArray(shelves) ? shelves : []).forEach(shelf => {
      const corridor = shelf.corridor || shelf.name.charAt(0).toUpperCase();
      if (!groups[corridor]) {
        groups[corridor] = [];
      }
      groups[corridor].push(shelf);
    });
    
    return groups;
  };

  const toggleCorridor = (corridor) => {
    setExpandedCorridors(prev => ({
      ...prev,
      [corridor]: !prev[corridor]
    }));
  };

  // Função para editar corredor
  const openEditCorridor = (corridorName) => {
    setEditingCorridor({ oldName: corridorName, newName: corridorName });
    setShowEditCorridor(true);
  };

  const saveEditCorridor = () => {
    if (!editingCorridor.newName.trim() || editingCorridor.newName === editingCorridor.oldName) {
      setShowEditCorridor(false);
      setEditingCorridor({ oldName: '', newName: '' });
      return;
    }
    
    const newCorridorName = editingCorridor.newName.trim().toUpperCase();
    
    // Atualizar todas as prateleiras do corredor
    const updatedShelves = shelves.map(shelf => {
      const currentCorridor = shelf.corridor || shelf.name.charAt(0).toUpperCase();
      if (currentCorridor === editingCorridor.oldName) {
        return {
          ...shelf,
          corridor: newCorridorName,
          // Opcional: atualizar o nome da prateleira também se seguir o padrão "Corredor X - ..."
          name: shelf.name.startsWith(`Corredor ${editingCorridor.oldName}`) 
            ? shelf.name.replace(`Corredor ${editingCorridor.oldName}`, `Corredor ${newCorridorName}`)
            : shelf.name
        };
      }
      return shelf;
    });
    
    setShelves(updatedShelves);
    
    // Atualizar os corredores expandidos
    const newExpandedCorridors = { ...expandedCorridors };
    if (newExpandedCorridors[editingCorridor.oldName] !== undefined) {
      newExpandedCorridors[newCorridorName] = newExpandedCorridors[editingCorridor.oldName];
      delete newExpandedCorridors[editingCorridor.oldName];
      setExpandedCorridors(newExpandedCorridors);
    }
    
    setShowEditCorridor(false);
    setEditingCorridor({ oldName: '', newName: '' });
  };

  const openEditProduct = (row, col) => {
    if (!currentShelf) return;
    const key = `${currentShelf.id}-${row}-${col}`;
    setEditingPosition({ row, col, key });
    setEditingProduct((products || {})[key] || { 
      sku: '', 
      unit: 'caixas',
      colors: []
    });
    setShowEditProduct(true);
  };

  const addColor = () => {
    if (!editingProduct.colors) {
      setEditingProduct({
        ...editingProduct,
        colors: [{ code: '', quantity: 0 }]
      });
      return;
    }
    if (editingProduct.colors.length >= 12) return;
    setEditingProduct({
      ...editingProduct,
      colors: [...editingProduct.colors, { code: '', quantity: 0 }]
    });
  };

  const removeColor = (index) => {
    if (!editingProduct.colors) return;
    if (!confirm('Deseja realmente excluir esta cor?')) return;
    const newColors = editingProduct.colors.filter((_, i) => i !== index);
    setEditingProduct({
      ...editingProduct,
      colors: newColors
    });
  };

  const updateColor = (index, field, value) => {
    if (!editingProduct.colors) return;
    const newColors = [...editingProduct.colors];
    newColors[index] = { ...newColors[index], [field]: value };
    setEditingProduct({
      ...editingProduct,
      colors: newColors
    });
  };


  // Helper: Save location to Firebase
  const saveLocationToFirebase = async (shelfId, row, col, product, color) => {
    try {
      const shelf = shelves.find(s => s.id === shelfId);
      if (!shelf) return;

      // Buscar se já existe location com esse SKU+Color nessa posição
      const locationsRef = ref(database, 'locations');
      const snapshot = await new Promise((resolve) => {
        onValue(locationsRef, resolve, { onlyOnce: true });
      });

      const locations = snapshot.val() || {};
      let locationId = null;

      // Procurar location existente
      for (const [id, loc] of Object.entries(locations)) {
        if (loc.shelf.id === shelfId && 
            loc.position.row === row && 
            loc.position.col === col &&
            loc.sku === product.sku &&
            loc.color === color.code) {
          locationId = id;
          break;
        }
      }

      if (color.quantity === 0 && locationId) {
        // Delete se quantidade = 0
        await remove(ref(database, `locations/${locationId}`));
        console.log('🗑️ Firebase: Location removida');
      } else if (color.quantity > 0) {
        // Update ou Create - usar ID determinístico
        if (!locationId) {
          locationId = `loc_${shelfId}_${row}_${col}_${sanitizeKeySegment(color.code)}`;
        }

        const locationData = {
          sku: product.sku,
          color: color.code,
          quantity: color.quantity,
          unit: product.unit || 'unidades',
          shelf: {
            id: shelfId,
            name: shelf.name,
            corridor: shelf.corridor || shelf.name[0]
          },
          position: {
            row: row,
            col: col,
            label: `L${shelf.rows - row}:C${col + 1}`
          },
          metadata: {
            created_at: Date.now(),
            updated_at: Date.now(),
            created_by: user.name,
            updated_by: user.name
          }
        };

  await set(ref(database, `locations/${locationId}`), locationData);
        console.log('💾 Firebase: Location salva');
      }
    } catch (err) {
      console.error('❌ Firebase save error:', err);
    }
  };


  // Helper: Salvar produto no Firebase
const saveProductToFirebase = async (shelfId, row, col, productData) => {
  try {
    console.log('💾 Salvando no Firebase:', { shelfId, row, col, productData });

      if (!productData.sku || !productData.colors || productData.colors.length === 0) {
        // Deletar todas as localizações deste produto
        const locsRef = ref(database, 'locations');
        const snapshot = await new Promise(resolve => {
          onValue(locsRef, resolve, { onlyOnce: true });
        });
        const allLocs = snapshot.val() || {};

        Object.entries(allLocs).forEach(([locId, loc]) => {
          if (loc.shelf.id === shelfId && loc.position.row === row && loc.position.col === col) {
            remove(ref(database, `locations/${locId}`));
            console.log('🗑️ Removido do Firebase:', locId);
          }
        });
        return;
      }

      // Salvar cada cor como uma localização com atualização atômica
      const currentShelf = shelves.find(s => s.id === shelfId);
      if (!currentShelf) return;

      // Buscar locations atuais e aplicar diff atômico
      const locsRef = ref(database, 'locations');
      const snapshot = await new Promise(resolve => {
        onValue(locsRef, resolve, { onlyOnce: true });
      });
      const allLocs = snapshot.val() || {};

      const desired = {};
      for (const color of productData.colors) {
        const qty = Number(color?.quantity);
        if (!color?.code) continue;
        if (qty > 0) {
          const locationId = `loc_${currentShelf.id}_${row}_${col}_${sanitizeKeySegment(color.code)}`;
          desired[color.code] = {
            id: locationId,
            data: {
              sku: productData.sku,
              color: color.code,
              quantity: qty,
              unit: productData.unit || 'unidades',
              shelf: {
                id: currentShelf.id,
                name: currentShelf.name,
                corridor: currentShelf.corridor || currentShelf.name[0]
              },
              position: {
                row: row,
                col: col,
                label: `L${currentShelf.rows - row}:C${col + 1}`
              },
              metadata: {
                created_at: Date.now(),
                updated_at: Date.now(),
                created_by: user.name,
                updated_by: user.name
              }
            }
          };
        }
      }

      const updates = {};
      const removedLocIds = [];
      // Remover cores não desejadas
      for (const [locId, loc] of Object.entries(allLocs)) {
        if (loc.shelf.id === currentShelf.id && loc.position.row === row && loc.position.col === col) {
          if (!desired[loc.color]) {
            updates[`locations/${locId}`] = null;
            removedLocIds.push(locId);
          }
        }
      }

      // Upsert apenas cores novas ou com quantidade alterada
      for (const entry of Object.values(desired)) {
        const existing = allLocs[entry.id];
        const existingQty = existing ? Number(existing.quantity) : null;
        const desiredQty = Number(entry.data.quantity);
        const isNew = !existing;
        const changed = isNew || existingQty !== desiredQty;
        if (changed) {
          updates[`locations/${entry.id}`] = entry.data;
        }
      }

      // Atualizar metadados para remoções com o usuário atual antes de remover
      for (const locId of removedLocIds) {
        try {
          await update(ref(database, `locations/${locId}/metadata`), {
            updated_at: Date.now(),
            updated_by: user.name,
            removed_by: user.name
          });
        } catch (e) {}
      }

      await update(ref(database), updates);
      console.log('✅ Atualização atômica aplicada para posição', { shelfId: currentShelf.id, row, col });



    } catch (error) {
      console.error('❌ Erro ao salvar no Firebase:', error);
    }
  };


  
  // Helper: Delete location from Firebase
  const deleteLocationFromFirebase = async (locationId) => {
    try {
      const locRef = ref(database, `locations/${locationId}`);
      await remove(locRef);
      console.log(`🗑️ Firebase: Removido ${locationId}`);
    } catch (err) {
      console.error('❌ Firebase delete error:', err);
    }
  };


  
const saveProduct = async () => {
  const oldProduct = (products || {})[editingPosition.key];
  
  if (!editingProduct.sku.trim() || !editingProduct.colors || editingProduct.colors.length === 0) {
    // Removendo produto
    const newProducts = { ...(products || {}) };
    delete newProducts[editingPosition.key];
    setProducts(newProducts);
    
    // 🆕 AGUARDAR Firebase salvar ANTES de sincronizar
    if (editingPosition && currentShelf) {
      await saveProductToFirebase(
        currentShelf.id,
        editingPosition.row,
        editingPosition.col,
        { sku: '', colors: [] }  // Produto vazio para remover
      );
    }
    
    // Sync será disparado pelos listeners de Firebase
  } else {
    const previousColors = (oldProduct?.colors || []);
    const incomingColors = (editingProduct.colors || []);
    const validColors = incomingColors
      .filter(c => c && c.code && Number(c.quantity) > 0)
      .map(c => ({ code: String(c.code), quantity: Number(c.quantity) }));
    if (validColors.length > 0) {
      const updatedProduct = {
        ...editingProduct,
        colors: validColors,
        lastModified: new Date().toISOString(),
        modifiedBy: user.name
      };
      const newProducts = { ...(products || {}), [editingPosition.key]: updatedProduct };
      setProducts(newProducts);
      if (editingPosition && currentShelf) {
        await saveProductToFirebase(currentShelf.id, editingPosition.row, editingPosition.col, updatedProduct);
      }
      
      // Sync será disparado pelos listeners de Firebase
      
      // Remoções serão sincronizadas via onChildRemoved
    } else {
      const newProducts = { ...(products || {}) };
      delete newProducts[editingPosition.key];
      setProducts(newProducts);
      if (editingPosition && currentShelf) {
        await saveProductToFirebase(currentShelf.id, editingPosition.row, editingPosition.col, { sku: '', colors: [] });
      }
      // Remoções serão sincronizadas via onChildRemoved
    }
  }
  
  setShowEditProduct(false);
  setEditingProduct(null);
  setEditingPosition(null);
};

  const searchProducts = () => {
    const results = [];
    const skuTerm = searchSKU.trim().toLowerCase();
    const colorTerm = searchColor.trim().toLowerCase();
    
    if (!skuTerm && !colorTerm) return [];
    if (!products || typeof products !== 'object') return [];
    
    Object.entries(products).forEach(([key, product]) => {
      const [shelfId, row, col] = key.split('-');
      const shelf = (Array.isArray(shelves) ? shelves : []).find(s => s.id === parseInt(shelfId));
      
      const skuMatch = !skuTerm || (product.sku && product.sku.toLowerCase().includes(skuTerm));
      
      if (skuMatch) {
        if (!colorTerm) {
          results.push({
            sku: product.sku || '',
            colors: product.colors || [],
            unit: product.unit || 'unidades',
            location: `${shelf?.name || 'Prateleira'} - L${shelf.rows - parseInt(row)}:C${parseInt(col) + 1}`,
            shelfId: parseInt(shelfId),
            row: parseInt(row),
            col: parseInt(col),
            key: key
          });
        } else {
          const matchingColors = (product.colors || []).filter(color => 
            color.code && color.code.toLowerCase().includes(colorTerm)
          );
          
          if (matchingColors.length > 0) {
            results.push({
              sku: product.sku || '',
              colors: matchingColors,
              unit: product.unit || 'unidades',
              location: `${shelf?.name || 'Prateleira'} - L${shelf.rows - parseInt(row)}:C${parseInt(col) + 1}`,
              shelfId: parseInt(shelfId),
              row: parseInt(row),
              col: parseInt(col),
              key: key
            });
          }
        }
      }
    });
    
    return results;
  };

  const highlightPosition = (result) => {
    const shelfIndex = (Array.isArray(shelves) ? shelves : []).findIndex(shelf => shelf.id === result.shelfId);
    if (shelfIndex !== -1 && shelfIndex !== selectedShelf) {
      setSelectedShelf(shelfIndex);
    }
    
    const position = `${result.shelfId}-${result.row}-${result.col}`;
    setHighlightedPositions([position]);
    
    // Scroll para o elemento destacado após um pequeno delay
    setTimeout(() => {
      const element = document.querySelector(`[data-position="${position}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    }, 300);
    
    setTimeout(() => {
      setHighlightedPositions([]);
    }, 3000);
  };

  const searchResults = searchProducts();

  // Drag & Drop Desktop
  const handleDragStart = (e, row, col, product) => {
    if (!product || !currentShelf) return;
    const position = { row, col, shelfId: currentShelf.id };
    setDraggedProduct(product);
    setDraggedPosition(position);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    resetDragStates();
  };

  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedPosition) {
      setDragOverPosition({ row, col });
    }
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e, targetRow, targetCol) => {
    e.preventDefault();
    moveProduct(targetRow, targetCol);
  };

  // Função unificada para mover produto
  const moveProduct = async (targetRow, targetCol) => {
    if (!draggedProduct || !draggedPosition || !currentShelf) return;

    const sourceKey = `${draggedPosition.shelfId}-${draggedPosition.row}-${draggedPosition.col}`;
    const targetKey = `${currentShelf.id}-${targetRow}-${targetCol}`;

    // Se for a mesma posição, não faz nada
    if (sourceKey === targetKey) {
      resetDragStates();
      return;
    }

    // Verificar se a posição de destino está ocupada
    const targetProduct = products[targetKey];
    if (targetProduct) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      resetDragStates();
      return;
    }

    // Atualizar estado local imediatamente
    const newProducts = { ...products };
    newProducts[targetKey] = draggedProduct;
    delete newProducts[sourceKey];
    setProducts(newProducts);

    // Atualizar backend: salvar nova location no destino e remover a antiga no source
    try {
      // Registrar transação de movimento por SKU+cor
      if (draggedProduct?.sku && Array.isArray(draggedProduct?.colors)) {
        for (const c of draggedProduct.colors) {
          if (!c || !c.code) continue;
          const k = `${String(draggedProduct.sku).trim()}-${String(c.code).trim()}`;
          moveTxnRef.current[k] = {
            from: { shelfId: draggedPosition.shelfId, row: draggedPosition.row, col: draggedPosition.col },
            to: { shelfId: currentShelf.id, row: targetRow, col: targetCol },
            qty: Number(c.quantity) || 0,
            user: user?.name || '',
            expires: Date.now() + 15000
          };
        }
      }
      // Salvar no destino (cria locations para cada cor)
      await saveProductToFirebase(currentShelf.id, targetRow, targetCol, draggedProduct);

      // Remover locations antigas na posição de origem (chamando saveProductToFirebase com productData vazio faz a remoção)
      await saveProductToFirebase(draggedPosition.shelfId, draggedPosition.row, draggedPosition.col, {});

      // Opcional: dar feedback tátil
      if (navigator.vibrate) navigator.vibrate(100);

      // Sync de planilha acontece via listeners (evita duplicatas entre dispositivos)
    } catch (err) {
      console.error('❌ Erro ao mover produto (Firebase):', err);
      // Em caso de erro backend, podemos reverter o estado local para manter consistência
      const reverted = { ...products };
      reverted[sourceKey] = draggedProduct;
      delete reverted[targetKey];
      setProducts(reverted);
    }

    resetDragStates();
  };

  // Reset todos os estados de drag
  const resetDragStates = () => {
    setDraggedProduct(null);
    setDraggedPosition(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setIsHolding(false);
    setDragStartAllowedKey(null);
    
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      setHoldTimeout(null);
    }
    
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
    
    setAutoScrolling(false);
    
    // Restaurar comportamento da página
    document.body.style.overflow = '';
    const container = document.querySelector('.overflow-x-auto');
    if (container) {
      container.style.touchAction = '';
      container.style.overscrollBehavior = '';
    }
    document.body.style.touchAction = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.userSelect = '';
  };

  // Sistema Mobile SIMPLIFICADO - baseado nos critérios
  const handleMobileTouchStart = (e, row, col, product) => {
    if (!isMobile) return;
    const target = e.target;
    const touch = e.touches[0];
    const now = Date.now();
    // Limpar estados de drag, manter tracking para duplo toque
    setDraggedProduct(null);
    setDraggedPosition(null);
    setDragOverPosition(null);
    setIsDragging(false);
    setIsHolding(false);
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: now });
    if (moveModeEnabled) {
      if (destHoldTimeout) { clearTimeout(destHoldTimeout); setDestHoldTimeout(null); }
      if (sourceHoldTimeout) { clearTimeout(sourceHoldTimeout); setSourceHoldTimeout(null); }
      setIsDestHolding(false);
      setDestinationCandidate(null);
      setIsSourceHolding(false);

      if (product && !moveSourcePosition && currentShelf && currentShelf.id) {
        const t = setTimeout(() => {
          setIsSourceHolding(true);
          setMoveSourcePosition({ row, col, shelfId: currentShelf.id, shelfName: currentShelf.name, product });
        }, 700);
        setSourceHoldTimeout(t);
      }

      if (!product && currentShelf && currentShelf.id) {
        const t = setTimeout(() => {
          setIsDestHolding(true);
          setDestinationCandidate({ row, col, shelfId: currentShelf.id });
        }, 700);
        setDestHoldTimeout(t);
      }
    } else {
      return;
    }
  };

  // Auto-scroll SIMPLES
  const startAutoScroll = (direction) => {
    if (autoScrollInterval) return;
    
    setAutoScrolling(true);
    
    const interval = setInterval(() => {
      const container = document.querySelector('.overflow-x-auto');
      if (!container || !isDragging) {
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          setAutoScrollInterval(null);
        }
        setAutoScrolling(false);
        return;
      }
      
      const scrollAmount = 5;
      if (direction === 'left' && container.scrollLeft > 0) {
        container.scrollLeft -= scrollAmount;
      } else if (direction === 'right' && container.scrollLeft < container.scrollWidth - container.clientWidth) {
        container.scrollLeft += scrollAmount;
      }
    }, 16);
    
    setAutoScrollInterval(interval);
  };

  const checkAutoScroll = (touchX) => {
    const container = document.querySelector('.overflow-x-auto');
    if (!container || !isDragging) return;
    
    const rect = container.getBoundingClientRect();
    const threshold = 80;
    
    if (touchX - rect.left < threshold && container.scrollLeft > 0) {
      startAutoScroll('left');
    } else if (rect.right - touchX < threshold && container.scrollLeft < container.scrollWidth - container.clientWidth) {
      startAutoScroll('right');
    } else {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
      setAutoScrolling(false);
    }
  };

  const checkVerticalAutoScroll = (touchY) => {
    if (!isDragging) return;
    const threshold = 80;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (touchY < threshold) {
      window.scrollBy({ top: -10, behavior: 'auto' });
    } else if (viewportHeight - touchY < threshold) {
      window.scrollBy({ top: 10, behavior: 'auto' });
    }
  };

  useEffect(() => {
    const onTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onWheel = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);
    };
  }, [isDragging]);

  useEffect(() => {
    try {
      if (currentShelf && currentShelf.id) {
        const el = document.getElementById(`shelf-container-${currentShelf.id}`);
        scrollContainerRef.current = el || null;
      } else {
        scrollContainerRef.current = null;
      }
    } catch (e) {
      scrollContainerRef.current = null;
    }
  }, [currentShelf?.id]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onWheel = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('wheel', onWheel);
    };
  }, [isDragging, currentShelf?.id]);

  const handleMobileTouchMove = (e, row, col) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timeDiff = Date.now() - touchStart.time;
    const velocity = distance / Math.max(timeDiff, 1);
    
    // LÓGICA BASEADA NOS CRITÉRIOS:

    if (moveModeEnabled) {
      if ((destHoldTimeout && (distance > 8 || velocity > 1.0))) {
        clearTimeout(destHoldTimeout);
        setDestHoldTimeout(null);
        setIsDestHolding(false);
        setDestinationCandidate(null);
      }
      if (sourceHoldTimeout && (distance > 8 || velocity > 1.0)) {
        clearTimeout(sourceHoldTimeout);
        setSourceHoldTimeout(null);
        setIsSourceHolding(false);
      }
      return;
    }
    return;
  };

  const handleMobileTouchEnd = (e, row, col, product) => {
    if (!isMobile) return;
    
    const touch = e.changedTouches[0];
    const now = Date.now();
    const duration = now - touchStart.time;
    
    // LÓGICA BASEADA NOS CRITÉRIOS:

  if (moveModeEnabled) {
      if (isDestHolding && destinationCandidate && destinationCandidate.shelfId === currentShelf.id && destinationCandidate.row === row && destinationCandidate.col === col && !product) {
        const shelfId = currentShelf.id;
        if (moveSourcePosition) {
          (async () => {
            const sourceKey = `${moveSourcePosition.shelfId}-${moveSourcePosition.row}-${moveSourcePosition.col}`;
            const targetKey = `${shelfId}-${row}-${col}`;
            if (sourceKey === targetKey) return;
            if (products[targetKey]) { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); return; }
            const newProducts = { ...products };
            newProducts[targetKey] = moveSourcePosition.product;
            delete newProducts[sourceKey];
            setProducts(newProducts);
            try {
              if (moveSourcePosition?.product?.sku && Array.isArray(moveSourcePosition?.product?.colors)) {
                for (const c of moveSourcePosition.product.colors) {
                  if (!c || !c.code) continue;
                  const k = `${String(moveSourcePosition.product.sku).trim()}-${String(c.code).trim()}`;
                  moveTxnRef.current[k] = {
                    from: { shelfId: moveSourcePosition.shelfId, row: moveSourcePosition.row, col: moveSourcePosition.col },
                    to: { shelfId: parseInt(shelfId), row, col },
                    qty: Number(c.quantity) || 0,
                    user: user?.name || '',
                    expires: Date.now() + 15000
                  };
                }
              }
              await saveProductToFirebase(parseInt(shelfId), row, col, moveSourcePosition.product);
              await saveProductToFirebase(moveSourcePosition.shelfId, moveSourcePosition.row, moveSourcePosition.col, {});

              // Sync via listeners
            } catch (err) {
              const reverted = { ...products };
              reverted[sourceKey] = moveSourcePosition.product;
              delete reverted[targetKey];
              setProducts(reverted);
            }
            setMoveSourcePosition(null);
            setMoveTargetShelf('');
            setMoveTargetPosition(null);
          })();
        }
      }
      if (destHoldTimeout) { clearTimeout(destHoldTimeout); setDestHoldTimeout(null); }
      if (sourceHoldTimeout) { clearTimeout(sourceHoldTimeout); setSourceHoldTimeout(null); }
      setIsDestHolding(false);
      setIsSourceHolding(false);
      setDestinationCandidate(null);
      return;
    }
    
    
    
    // 3. Se foi toque rápido = duplo clique para editar
    else if (duration < 300 && !isHolding && !isDragging) {
      const timeSinceLastTap = now - lastTapTime;
      const isSamePosition = lastTapPosition.row === row && lastTapPosition.col === col;
      
      if (timeSinceLastTap < 500 && isSamePosition) {
        // Duplo clique confirmado
        openEditProduct(row, col);
        setLastTapTime(0);
        setLastTapPosition({ row: -1, col: -1 });
      } else {
        // Primeiro toque
        setLastTapTime(now);
        setLastTapPosition({ row, col });
        
        setTimeout(() => {
          setLastTapTime(0);
          setLastTapPosition({ row: -1, col: -1 });
        }, 500);
      }
    }
    
    // Reset estados
    resetDragStates();
  };



  // Função para abrir modal de movimento
  const openMoveModal = (row, col, product) => {
    if (!currentShelf || !product) return;
    
    setMoveSourcePosition({
      row,
      col,
      shelfId: currentShelf.id,
      shelfName: currentShelf.name,
      product
    });
    setMoveTargetShelf(currentShelf.id.toString());
    setShowMoveModal(true);
  };

  // Função para obter posições disponíveis na prateleira selecionada
  const getAvailablePositions = (shelfId) => {
    const shelf = shelves.find(s => s.id === parseInt(shelfId));
    if (!shelf) return [];
    
    const available = [];
    for (let row = 0; row < shelf.rows; row++) {
      for (let col = 0; col < shelf.cols; col++) {
        const key = `${shelfId}-${row}-${col}`;
        const isSource = moveSourcePosition && 
          moveSourcePosition.shelfId === parseInt(shelfId) && 
          moveSourcePosition.row === row && 
          moveSourcePosition.col === col;
        
        if (!products[key] && !isSource) {
          available.push({
            row,
            col,
            label: `L${shelf.rows - row}:C${col + 1}`,
            key
          });
        }
      }
    }
    return available;
  };

  // Função para executar o movimento (usada pelo modal mobile)
  const executeMoveProduct = async () => {
    if (!moveSourcePosition || !moveTargetPosition || !moveTargetShelf) return;

    const sourceKey = `${moveSourcePosition.shelfId}-${moveSourcePosition.row}-${moveSourcePosition.col}`;
    const targetKey = `${moveTargetShelf}-${moveTargetPosition.row}-${moveTargetPosition.col}`;

    if (sourceKey === targetKey) {
      alert('Posição de origem e destino são iguais!');
      return;
    }

    // Atualizar estado local imediatamente
    const newProducts = { ...products };
    newProducts[targetKey] = moveSourcePosition.product;
    delete newProducts[sourceKey];
    setProducts(newProducts);

    // Fechar modal UI
    setShowMoveModal(false);
    setMoveSourcePosition(null);
    setMoveTargetShelf('');
    setMoveTargetPosition(null);

    // Se mudou de prateleira, ir para a prateleira destino (UI)
    const targetShelfIndex = shelves.findIndex(s => s.id === parseInt(moveTargetShelf));
    if (targetShelfIndex !== -1 && targetShelfIndex !== selectedShelf) {
      setSelectedShelf(targetShelfIndex);
    }

    // Atualizar backend: criar locations no destino e remover a antiga origem
    try {
      // Registrar transação de movimento por SKU+cor
      if (moveSourcePosition?.product?.sku && Array.isArray(moveSourcePosition?.product?.colors)) {
        for (const c of moveSourcePosition.product.colors) {
          if (!c || !c.code) continue;
          const k = `${String(moveSourcePosition.product.sku).trim()}-${String(c.code).trim()}`;
          moveTxnRef.current[k] = {
            from: { shelfId: moveSourcePosition.shelfId, row: moveSourcePosition.row, col: moveSourcePosition.col },
            to: { shelfId: parseInt(moveTargetShelf), row: moveTargetPosition.row, col: moveTargetPosition.col },
            qty: Number(c.quantity) || 0,
            user: user?.name || '',
            expires: Date.now() + 15000
          };
        }
      }
      // Salvar no destino
      await saveProductToFirebase(parseInt(moveTargetShelf), moveTargetPosition.row, moveTargetPosition.col, moveSourcePosition.product);

      // Remover locations antigas na posição de origem (chamada com objeto vazio remove)
      await saveProductToFirebase(moveSourcePosition.shelfId, moveSourcePosition.row, moveSourcePosition.col, {});

      
    } catch (err) {
      console.error('❌ Erro ao executar move via modal (Firebase):', err);
      // Reverter estado local se houve falha no backend
      const reverted = { ...products };
      reverted[sourceKey] = moveSourcePosition.product;
      delete reverted[targetKey];
      setProducts(reverted);
      alert('Erro ao mover produto. Operação revertida.');
    }
  };

  const getColorPreview = (colors) => {
    if (!colors || !Array.isArray(colors)) return null;
    const maxShow = isMobile ? 2 : 3;
    const colorsToShow = colors.slice(0, maxShow);
    const hasMore = colors.length > maxShow;
    
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {colorsToShow.map((color, index) => (
          <span key={index} className={`bg-gray-200 px-1 rounded text-center ${isMobile ? 'text-xs' : 'text-xs'} min-w-0 max-w-full overflow-hidden`}>
            {color.code.length > 5 ? color.code.slice(0, 5) : color.code}
          </span>
        ))}
        {hasMore && (
          <span className="text-xs text-gray-500">+{colors.length - maxShow}</span>
        )}
      </div>
    );
  };

  // Renderizar grid da prateleira COM separadores estáveis
  const renderShelfGrid = () => {
    if (!currentShelf || !isValidShelf(currentShelf)) {
      return <div className="text-center text-gray-500 p-8">Prateleira inválida</div>;
    }

    const rows = [];
    
    for (let row = 0; row < currentShelf.rows; row++) {
      const rowElements = [];
      
      for (let col = 0; col < currentShelf.cols; col++) {
        const key = `${currentShelf.id}-${row}-${col}`;
        const product = (products && typeof products === 'object') ? products[key] : null;
        const isHighlighted = Array.isArray(highlightedPositions) && highlightedPositions.includes(key);
        
        const isDragOver = dragOverPosition && dragOverPosition.row === row && dragOverPosition.col === col;
        const canDrop = draggedProduct && !product && draggedPosition && 
          !(draggedPosition.row === row && draggedPosition.col === col);

        const isMobileDragSource = isDragging && draggedPosition && 
          draggedPosition.row === row && draggedPosition.col === col;

        // Célula da prateleira
        rowElements.push(
          <div
            key={key}
            data-position={key}
            draggable={!isMobile && !!product}
            onClick={isMobile ? undefined : () => openEditProduct(row, col)}
            onTouchStart={isMobile ? (e) => handleMobileTouchStart(e, row, col, product) : undefined}
            onTouchMove={isMobile ? (e) => handleMobileTouchMove(e, row, col) : undefined}
            onTouchEnd={isMobile ? (e) => handleMobileTouchEnd(e, row, col, product) : undefined}
            onDragStart={!isMobile && product ? (e) => handleDragStart(e, row, col, product) : undefined}
            onDragEnd={!isMobile && product ? handleDragEnd : undefined}
            onDragOver={!isMobile && !product ? (e) => handleDragOver(e, row, col) : undefined}
            onDragLeave={!isMobile && !product ? handleDragLeave : undefined}
            onDrop={!isMobile && !product ? (e) => handleDrop(e, row, col) : undefined}
            className={`
              ${isMobile ? 'w-20 h-20' : 'w-24 h-24 md:w-28 md:h-28'} 
              border-2 rounded-lg p-1
              transition-all duration-200 flex flex-col items-center justify-center
              ${isMobile ? 'touch-manipulation' : 'select-none'}
              ${product 
                ? `border-solid shadow-sm bg-white ${
                    isMobile 
                      ? 'active:scale-95' 
                      : 'cursor-move hover:shadow-md hover:scale-105'
                  }` 
                : `border-dashed border-gray-300 bg-white ${
                    isMobile
                      ? 'active:bg-gray-50'
                      : 'cursor-pointer hover:border-gray-400 hover:scale-105'
                  }`
              }
              ${isHighlighted ? 'ring-2 md:ring-4 ring-yellow-400 border-yellow-500' : ''}
              ${isDragOver ? 'border-green-400 bg-green-50 scale-105 ring-2 ring-green-300' : ''}
              ${canDrop && !isMobile ? 'border-blue-300 bg-blue-50' : ''}
              ${isMobileDragSource ? 'opacity-50 scale-110 ring-2 ring-blue-400' : ''}
              ${moveModeEnabled && !product && destinationCandidate && destinationCandidate.shelfId === (currentShelf?.id) && destinationCandidate.row === row && destinationCandidate.col === col ? 'ring-2 ring-green-500 bg-green-50' : ''}
              ${moveModeEnabled && moveSourcePosition && moveSourcePosition.shelfId === currentShelf.id && moveSourcePosition.row === row && moveSourcePosition.col === col ? 'ring-2 ring-orange-500' : ''}
              ${isDragging && !product && !isMobileDragSource ? 'border-blue-300 bg-blue-50' : ''}
              ${isHolding && !isDragging && draggedPosition && draggedPosition.row === row && draggedPosition.col === col ? 'ring-2 ring-orange-400 bg-orange-50' : ''}
            `}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
            title={product ? `${isMobile ? (moveModeEnabled ? 'Modo Mover ativo' : 'Ative Modo Mover') : 'Clique e arraste para mover'}` : 'Toque para adicionar produto'}
          >
            {product && typeof product === 'object' && product.sku ? (
              <>
                <div className={`font-bold text-blue-600 text-center leading-tight ${isMobile ? 'text-xs mb-1' : 'text-sm mb-1'}`}>
                  {(product.sku && product.sku.length > 6) ? product.sku.slice(0, 6) + '...' : (product.sku || '')}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {getColorPreview(product.colors)}
                </div>
                <div className={`text-gray-500 text-center leading-tight ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  {(product.colors && Array.isArray(product.colors) ? product.colors.length : 0)} cor{((product.colors && Array.isArray(product.colors) ? product.colors.length : 0) !== 1) ? 'es' : ''}
                </div>
                {moveModeEnabled && (
                  <button
                    type="button"
                    data-handle="move"
                    onMouseDown={() => setDragStartAllowedKey(key)}
                    className={`${isMobile ? 'mt-1' : 'mt-1'} px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 border border-blue-300`}
                  >
                    Mover
                  </button>
                )}
              </>
            ) : (
              <Plus className={`text-gray-400 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
            )}
          </div>
        );

        // Adicionar separador APÓS cada par de colunas (2º, 4º, 6º...)
        // Mas NÃO na última coluna da linha
        if ((col + 1) % 2 === 0 && col < currentShelf.cols - 1) {
          rowElements.push(
            <div
              key={`separator-${row}-${col}`}
              className={`
                ${isMobile ? 'w-2' : 'w-3 md:w-4'} 
                bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 
                ${isMobile ? 'h-20' : 'h-24 md:h-28'}
                rounded-sm shadow-md
                relative
                flex flex-col justify-center items-center
                flex-shrink-0
              `}
              style={{
                background: 'linear-gradient(to right, #6b7280, #9ca3af, #6b7280)',
                borderLeft: '1px solid #4b5563',
                borderRight: '1px solid #4b5563'
              }}
            >
              {/* Parafusos decorativos */}
              <div className="absolute top-1 w-1 h-1 bg-gray-700 rounded-full shadow-inner"></div>
              <div className="absolute bottom-1 w-1 h-1 bg-gray-700 rounded-full shadow-inner"></div>
              
              {/* Textura metálica */}
              <div className="absolute inset-0 opacity-20" 
                style={{
                  background: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)'
                }}>
              </div>
            </div>
          );
        }
      }
      
      // Linha completa com células + separadores
      rows.push(
        <div key={`row-${row}`} className="flex items-center gap-0">
          {rowElements}
        </div>
      );
    }

    return rows;
  };

    // 🐛 DEBUG - Ver no console
  console.log('🎨 Component renderizando, products:', Object.keys(products).length);

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 md:p-4 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">JR Localização de Estoque</h1>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
              {/* Botão de Relatório - para todos os usuários */}
              <button
                onClick={openReport}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors min-h-[44px]"
                title="Gerar relatório de estoque"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Relatório</span>
              </button>
              
              {/* Botão de Google Sheets */}
              <button
                onClick={() => setShowSheetsModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors min-h-[44px]"
                title="Sincronizar com Google Sheets"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Google Sheets</span>
              </button>

              

              {/* Botão de Backup */}
              <button
                onClick={() => setShowBackupModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors min-h-[44px]"
                title="Backup & Restore"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Backup</span>
              </button>

              {/* Botão de Configurações - apenas para admins */}
              {isAdmin() && (
                <button
                  onClick={() => setShowSecuritySettings(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              
              {/* Informações do usuário */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }}></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono">ID: {user.id.slice(-8)}</span>
                    <button
                      onClick={() => copyToClipboard(user.id, 'Seu ID')}
                      className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                      title="Copiar ID completo"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  isAdmin() 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isAdmin() ? 'Admin' : 'Usuário'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Busca Dupla */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="SKU (ex: FO130)"
                className="w-full pl-10 pr-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-16px"
                value={searchSKU}
                onChange={(e) => setSearchSKU(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cor (ex: 102)"
                className="w-full pl-10 pr-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-16px"
                value={searchColor}
                onChange={(e) => setSearchColor(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          
          {/* Resultados da busca */}
          {(searchSKU || searchColor) && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3 md:p-4">
              <h3 className="font-semibold mb-2 text-sm md:text-base">Resultados ({searchResults.length})</h3>
              {searchResults.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum produto encontrado</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600 text-sm md:text-base">{result.sku}</span>
                          <button
                            onClick={() => highlightPosition(result)}
                            className="flex items-center gap-1 text-xs md:text-sm text-gray-600 hover:text-blue-600 cursor-pointer bg-gray-50 px-2 py-1 rounded min-h-[44px] justify-center"
                          >
                            <MapPin className="w-4 h-4" />
                            <span className="truncate max-w-[120px] md:max-w-none">{result.location}</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {result.colors.map((color, colorIndex) => (
                            <span key={colorIndex} className="text-xs md:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {color.code}: {color.quantity} {result.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seletor de Prateleiras */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-base md:text-lg font-semibold">Prateleiras</h2>
            {/* Botão Novo Corredor - apenas para admins */}
            {canEditStructure() && (
              <button
                onClick={() => setShowAddShelf(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                Novo Corredor
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {Object.entries(groupShelvesByCorridor()).map(([corridor, corridorShelves]) => (
              <div key={corridor} className="border border-gray-200 rounded-lg">
                <div className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg">
                  <button
                    onClick={() => toggleCorridor(corridor)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <span className="font-medium text-gray-700">Corredor {corridor}</span>
                    <span className="text-sm text-gray-500">({corridorShelves.length} prateleiras)</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {/* Botão Editar Corredor - apenas para admins */}
                    {canEditStructure() && (
                      <button
                        onClick={() => openEditCorridor(corridor)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Renomear corredor"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleCorridor(corridor)}
                      className="p-2 hover:bg-gray-200 rounded min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedCorridors[corridor] ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {expandedCorridors[corridor] && (
                  <div className="p-2 space-y-1">
                    {corridorShelves.map((shelf, shelfIndex) => {
                      const globalIndex = shelves.findIndex(s => s.id === shelf.id);
                      return (
                        <div key={shelf.id} className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedShelf(globalIndex)}
                            className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm min-h-[44px] text-left ${
                              selectedShelf === globalIndex
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            {shelf.name}
                          </button>
                          {/* Botões de Editar e Excluir Prateleira - apenas para admins */}
                          {canEditStructure() && (
                            <button
                              onClick={() => openEditShelf(shelf)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Renomear prateleira"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteShelves() && (
                            <button
                              onClick={() => requestDeleteShelf(shelf.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Excluir prateleira"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Botão para adicionar nova prateleira no corredor - apenas para admins */}
                    {canEditStructure() && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => openAddShelfToCorridor(corridor)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm min-h-[44px]"
                        >
                          <Plus className="w-4 h-4" />
                          Nova Prateleira
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visualização da Prateleira */}
        {currentShelf ? (
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                {isMobile && (
                  <button
                    onClick={() => setMoveModeEnabled(v => !v)}
                    className={`px-2 py-1 text-xs rounded ${moveModeEnabled ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} border ${moveModeEnabled ? 'border-blue-700' : 'border-blue-300'}`}
                    title={moveModeEnabled ? 'Modo Mover: ativo' : 'Modo Mover: desativado'}
                  >
                    Mover
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-base md:text-lg font-semibold">{currentShelf.name}</h2>
                <span className="text-sm text-gray-500">
                  {currentShelf.rows} x {currentShelf.cols} espaços
                </span>
              </div>
            </div>
            
            <div 
              className="overflow-x-auto shelf-scroll-container"
              id={`shelf-container-${currentShelf.id}`}
              style={{
                touchAction: 'pan-x pan-y',
                overflowX: 'auto',
                scrollBehavior: 'auto',
                margin: 0,
                padding: 0,
                width: '100%'
              }}
            >
              {/* Container principal com numeração e grid */}
              <div 
                className="flex flex-col gap-1 md:gap-2"
                style={{
                  minWidth: isMobile ? `${currentShelf.cols * 85 + Math.floor(currentShelf.cols / 2) * 16}px` : 'auto',
                  margin: 0,
                  padding: 0,
                  width: 'fit-content'
                }}
              >
                {/* Numeração das colunas */}
                <div className="flex items-center gap-0 mb-2">
                  {Array.from({ length: currentShelf.cols }, (_, col) => {
                    const elements = [];
                    
                    // Número da coluna
                    elements.push(
                      <div
                        key={`col-header-${col}`}
                        className={`
                          ${isMobile ? 'w-20 h-6' : 'w-24 h-8 md:w-28'} 
                          flex items-center justify-center
                          bg-gray-100 border border-gray-300 rounded-t-md
                          text-xs md:text-sm font-medium text-gray-600
                        `}
                      >
                        {col + 1}
                      </div>
                    );
                    
                    // Separador após cada par de colunas (não na última coluna)
                    if ((col + 1) % 2 === 0 && col < currentShelf.cols - 1) {
                      elements.push(
                        <div
                          key={`col-separator-${col}`}
                          className={`
                            ${isMobile ? 'w-2 h-6' : 'w-3 md:w-4 h-8'} 
                            bg-gray-300 rounded-t-sm
                            flex-shrink-0
                          `}
                        />
                      );
                    }
                    
                    return elements;
                  }).flat()}
                </div>
                
                {/* Grid da prateleira com separadores */}
                {renderShelfGrid()}
              </div>
            </div>
            
            <div className="mt-4 text-xs md:text-sm text-gray-500 text-center space-y-1">
              <div>
                {isMobile 
                  ? isDragging
                    ? '🎯 Arraste para posição vazia e solte'
                    : isHolding
                      ? '⚡ Pronto para arrastar!'
                      : (lastTapTime > 0 && Date.now() - lastTapTime < 500)
                        ? '⚡ Toque novamente para editar'
                        : 'Duplo toque: editar • Segurar: mover'
                  : 'Clique para editar • Arraste para mover produto'
                }
              </div>
              {/* Indicador de nível de usuário */}
              <div className={`text-xs px-2 py-1 rounded inline-block ${
                isAdmin() ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {isAdmin() ? '👨‍💼 Acesso Total' : '👤 Gerenciar Produtos'}
              </div>
              {isDragging && draggedProduct && (
                <div className="text-blue-600 font-medium">
                  📦 Movendo: {draggedProduct.sku}
                  {autoScrolling && (
                    <span className="ml-2 animate-pulse">Auto-scroll ativo</span>
                  )}
                </div>
              )}
              {dragOverPosition && isDragging && (
                <div className="text-green-600 font-medium animate-pulse">
                  ✅ Posição válida - solte aqui!
                </div>
              )}
              {isHolding && !isDragging && draggedProduct && (
                <div className="text-orange-600 font-medium animate-pulse">
                  🔄 Arraste para mover ou solte para modal
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhuma Prateleira Criada</h3>
            <p className="text-gray-500 mb-4">Crie sua primeira prateleira para começar a organizar seus produtos.</p>
            <button
              onClick={() => setShowAddShelf(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Prateleira
            </button>
          </div>
        )}

        {/* Modal: Editar Corredor */}
        {showEditCorridor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-md'}`}>
              <h3 className="text-lg font-semibold mb-4 md:mb-4 text-center md:text-left">Renomear Corredor</h3>
              
              <div className="space-y-4 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Corredor</label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                    value={editingCorridor.newName}
                    onChange={(e) => setEditingCorridor({...editingCorridor, newName: e.target.value})}
                    placeholder="Ex: A, B, C ou nome personalizado"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    <strong>Corredor atual:</strong> {editingCorridor.oldName}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Todas as prateleiras deste corredor serão atualizadas
                  </p>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Dica:</strong> Se suas prateleiras seguem o padrão "Corredor A - Prateleira X", 
                    elas serão automaticamente renomeadas também.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 md:mt-6">
                <button
                  onClick={saveEditCorridor}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowEditCorridor(false);
                    setEditingCorridor({ oldName: '', newName: '' });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar Prateleira */}
        {showEditShelf && editingShelf && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-lg'}`}>
              <h3 className="text-lg font-semibold mb-4 md:mb-4 text-center md:text-left">Editar Prateleira</h3>
              
              <div className="space-y-4 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Prateleira</label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                    value={editingShelf.name}
                    onChange={(e) => setEditingShelf({...editingShelf, name: e.target.value})}
                    placeholder="Ex: Corredor C - Prateleira 1"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-3">Dimensões da Prateleira</label>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Linhas (atual: {editingShelf.originalRows})</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                        value={editingShelf.newRows}
                        onChange={(e) => setEditingShelf({...editingShelf, newRows: parseInt(e.target.value) || 1})}
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">Colunas (atual: {editingShelf.originalCols})</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                        value={editingShelf.newCols}
                        onChange={(e) => setEditingShelf({...editingShelf, newCols: parseInt(e.target.value) || 1})}
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>
                  
                  {/* Preview das mudanças */}
                  {(editingShelf.newRows !== editingShelf.originalRows || editingShelf.newCols !== editingShelf.originalCols) && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 font-medium">📏 Resumo das Alterações:</p>
                        <div className="text-xs text-blue-600 mt-1 space-y-1">
                          <div>• <strong>Antes:</strong> {editingShelf.originalRows}L × {editingShelf.originalCols}C = {editingShelf.originalRows * editingShelf.originalCols} espaços</div>
                          <div>• <strong>Depois:</strong> {editingShelf.newRows}L × {editingShelf.newCols}C = {editingShelf.newRows * editingShelf.newCols} espaços</div>
                          <div>• <strong>Diferença:</strong> {(editingShelf.newRows * editingShelf.newCols) - (editingShelf.originalRows * editingShelf.originalCols) > 0 ? '+' : ''}{(editingShelf.newRows * editingShelf.newCols) - (editingShelf.originalRows * editingShelf.originalCols)} espaços</div>
                        </div>
                      </div>
                      
                      {/* Aviso sobre redução */}
                      {(editingShelf.newRows < editingShelf.originalRows || editingShelf.newCols < editingShelf.originalCols) && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-800 font-medium">⚠️ Atenção - Redução de Tamanho</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Reduzir o tamanho pode remover produtos que estão nas posições que serão eliminadas. 
                            Você será avisado antes da confirmação se houver produtos afetados.
                          </p>
                        </div>
                      )}
                      
                      {/* Benefícios do aumento */}
                      {(editingShelf.newRows > editingShelf.originalRows || editingShelf.newCols > editingShelf.originalCols) && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 font-medium">✅ Expansão da Prateleira</p>
                          <p className="text-xs text-green-700 mt-1">
                            Todos os produtos existentes serão mantidos em suas posições atuais. 
                            As novas posições ficarão disponíveis para novos produtos.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Status atual */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>📊 Status Atual:</strong> {editingShelf.originalRows} × {editingShelf.originalCols} 
                    ({(() => {
                      let occupiedCount = 0;
                      Object.keys(products).forEach(key => {
                        const [shelfId] = key.split('-');
                        if (parseInt(shelfId) === editingShelf.id) {
                          occupiedCount++;
                        }
                      });
                      return occupiedCount;
                    })()} ocupados de {editingShelf.originalRows * editingShelf.originalCols})
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 md:mt-6">
                <button
                  onClick={saveEditShelf}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  {(editingShelf.newRows !== editingShelf.originalRows || editingShelf.newCols !== editingShelf.originalCols) 
                    ? 'Redimensionar' 
                    : 'Salvar'
                  }
                </button>
                <button
                  onClick={() => {
                    setShowEditShelf(false);
                    setEditingShelf(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
              
              {isMobile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    💡 <strong>Dica:</strong> Você pode aumentar ou diminuir o tamanho da prateleira conforme necessário. 
                    Expansões são sempre seguras, reduções podem afetar produtos existentes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Nova Prateleira em Corredor */}
        {showAddShelfToCorridor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-md'}`}>
              <h3 className="text-lg font-semibold mb-4 md:mb-4 text-center md:text-left">
                Nova Prateleira - Corredor {selectedCorridorForNewShelf}
              </h3>
              
              <div className="space-y-4 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Prateleira</label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    placeholder={`Ex: Corredor ${selectedCorridorForNewShelf} - Prateleira 1`}
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Linhas</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                      value={newShelfRows}
                      onChange={(e) => setNewShelfRows(parseInt(e.target.value) || 1)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Colunas</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                      value={newShelfCols}
                      onChange={(e) => setNewShelfCols(parseInt(e.target.value) || 1)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    📁 <strong>Corredor:</strong> {selectedCorridorForNewShelf}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    A prateleira será criada neste corredor
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 md:mt-6">
                <button
                  onClick={createShelfInCorridor}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  Criar Prateleira
                </button>
                <button
                  onClick={() => {
                    setShowAddShelfToCorridor(false);
                    setSelectedCorridorForNewShelf('');
                    setNewShelfName('');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Novo Corredor */}
        {showAddShelf && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-md'}`}>
              <h3 className="text-lg font-semibold mb-4 md:mb-4 text-center md:text-left">Novo Corredor</h3>
              
              <div className="space-y-4 md:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome da Primeira Prateleira</label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    placeholder="Ex: Corredor C - Prateleira 1"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Linhas</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                      value={newShelfRows}
                      onChange={(e) => setNewShelfRows(parseInt(e.target.value) || 1)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Colunas</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg text-16px"
                      value={newShelfCols}
                      onChange={(e) => setNewShelfCols(parseInt(e.target.value) || 1)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    🏗️ <strong>Novo Corredor:</strong> Será criado um novo corredor baseado na primeira letra do nome
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Você poderá adicionar mais prateleiras a este corredor depois
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 md:mt-6">
                <button
                  onClick={createShelf}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  Criar Corredor
                </button>
                <button
                  onClick={() => setShowAddShelf(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar Produto */}
        {showEditProduct && editingProduct && editingPosition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-lg max-h-[90vh] overflow-y-auto'}`}>
              <h3 className="text-lg font-semibold mb-4 text-center md:text-left">
                Produto - L{currentShelf.rows - editingPosition.row}, C{editingPosition.col + 1}
              </h3>
              
              <div className="space-y-4 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">SKU do Produto</label>
                    <input
                      type="text"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                      value={editingProduct.sku}
                      onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value.toUpperCase()})}
                      placeholder="Ex: FO130"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unidade</label>
                    <select
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                      value={editingProduct.unit}
                      onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})}
                      style={{ fontSize: '16px' }}
                    >
                      <option value="caixas">Caixas</option>
                      <option value="peças">Peças</option>
                      <option value="unidades">Unidades</option>
                      <option value="pacotes">Pacotes</option>
                      <option value="metros">Metros</option>
                      <option value="quilos">Quilos</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <label className="block text-sm font-medium">Cores e Quantidades</label>
                    <button
                      onClick={addColor}
                      disabled={(editingProduct.colors?.length || 0) >= 12}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400 min-h-[44px]"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Cor
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(editingProduct.colors || []).map((color, index) => (
                      <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                        <input
                          type="text"
                          placeholder="Código (ex: 102)"
                          className="w-24 px-2 py-2 md:py-1 border border-gray-300 rounded text-sm text-16px"
                          value={color.code}
                          onChange={(e) => updateColor(index, 'code', e.target.value)}
                          style={{ fontSize: '16px' }}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateColor(index, 'quantity', Math.max(0, (color.quantity || 0) - 1))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-600 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            className="w-16 px-2 py-2 md:py-1 border border-gray-300 rounded text-sm text-center text-16px"
                            value={color.quantity}
                            onChange={(e) => updateColor(index, 'quantity', parseInt(e.target.value) || 0)}
                            style={{ fontSize: '16px' }}
                          />
                          <button
                            onClick={() => updateColor(index, 'quantity', (color.quantity || 0) + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-600 font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeColor(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {(!editingProduct.colors || editingProduct.colors.length === 0) && (
                      <div className="text-sm text-gray-500 p-4 text-center">
                        Nenhuma cor adicionada. Toque em "Adicionar Cor" para começar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveProduct}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[48px]"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={() => setShowEditProduct(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
              
              {isMobile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    💡 Dicas: Para remover o produto, apague o SKU e salve. Máximo de 12 cores por produto.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto flex flex-col justify-center' : 'max-w-md'}`}>
              <div className="flex flex-col items-center gap-3 mb-4 text-center">
                <div className="w-16 h-16 md:w-12 md:h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-8 h-8 md:w-6 md:h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-600">Excluir Prateleira</h3>
                  <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 text-center">
                  ⚠️ Todos os produtos desta prateleira serão removidos permanentemente.
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-center md:text-left">Digite a senha para confirmar:</label>
                <input
                  type="password"
                  className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-16px"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Senha de segurança"
                  onKeyPress={(e) => e.key === 'Enter' && confirmDeleteShelf()}
                  style={{ fontSize: '16px' }}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmDeleteShelf}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 min-h-[48px]"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteShelfId(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Mover Produto */}
        {showMoveModal && moveSourcePosition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-lg max-h-[90vh] overflow-y-auto'}`}>
              <h3 className="text-lg font-semibold mb-4 text-center md:text-left">
                Mover Produto
              </h3>
              
              {/* Informações do produto */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
                <div className="font-medium text-blue-800 mb-2">📦 {moveSourcePosition.product.sku}</div>
                <div className="text-sm text-blue-600">
                  <strong>Origem:</strong> {moveSourcePosition.shelfName} - L{currentShelf.rows - moveSourcePosition.row}:C{moveSourcePosition.col + 1}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {moveSourcePosition.product.colors?.length || 0} cor(es) cadastrada(s)
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Seleção da prateleira destino */}
                <div>
                  <label className="block text-sm font-medium mb-2">Prateleira Destino</label>
                  <select
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-16px"
                    value={moveTargetShelf}
                    onChange={(e) => {
                      setMoveTargetShelf(e.target.value);
                      setMoveTargetPosition(null);
                    }}
                    style={{ fontSize: '16px' }}
                  >
                    <option value="">Selecione uma prateleira</option>
                    {shelves.map(shelf => (
                      <option key={shelf.id} value={shelf.id}>
                        {shelf.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Seleção da posição destino */}
                {moveTargetShelf && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Posição Destino ({getAvailablePositions(moveTargetShelf).length} disponíveis)
                    </label>
                    {getAvailablePositions(moveTargetShelf).length === 0 ? (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Nenhuma posição disponível nesta prateleira
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-1 p-2">
                          {getAvailablePositions(moveTargetShelf).map(position => (
                            <button
                              key={position.key}
                              onClick={() => setMoveTargetPosition(position)}
                              className={`p-2 text-sm rounded border transition-colors min-h-[44px] ${
                                moveTargetPosition?.key === position.key
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {position.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Resumo do movimento */}
                {moveTargetPosition && moveTargetShelf && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>✅ Movimento:</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      <strong>De:</strong> {moveSourcePosition.shelfName} - L{currentShelf.rows - moveSourcePosition.row}:C{moveSourcePosition.col + 1}
                    </p>
                    <p className="text-xs text-green-600">
                      <strong>Para:</strong> {shelves.find(s => s.id === parseInt(moveTargetShelf))?.name} - {moveTargetPosition.label}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={executeMoveProduct}
                  disabled={!moveTargetPosition || !moveTargetShelf}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[48px]"
                >
                  <Package className="w-4 h-4" />
                  Mover Produto
                </button>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setMoveSourcePosition(null);
                    setMoveTargetShelf('');
                    setMoveTargetPosition(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
              
              {isMobile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    💡 <strong>Dica:</strong> Para mover produtos entre prateleiras rapidamente, use o toque longo sobre o produto.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Adicionar Administrador */}
        {showAddAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-md'}`}>
              <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                <User className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold">Adicionar Administrador</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ID do Usuário *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-16px"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    placeholder="user_1234567890abcdef"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cole aqui o ID único do usuário (obrigatório)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nome Personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-16px"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Ex: João Silva, Maria Santos..."
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nome amigável para identificar o usuário (recomendado)
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 mb-2">
                    📋 <strong>Como obter o ID do usuário:</strong>
                  </p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>1. <strong>O usuário deve acessar o sistema primeiro</strong></div>
                    <div>2. <strong>Mobile:</strong> ID aparece abaixo do nome (canto superior direito)</div>
                    <div>3. <strong>Desktop:</strong> ID aparece no menu de usuário</div>
                    <div>4. <strong>Copie o ID completo:</strong> user_xxxxxxxxxxxxxxxxx</div>
                    <div>5. <strong>Cole aqui</strong> e defina um nome amigável</div>
                  </div>
                  <div className="mt-2 p-2 bg-blue-100 rounded">
                    <div className="text-xs text-blue-600">
                      <strong>💡 Seu ID:</strong> <span className="font-mono">{user.id}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Atenção:</strong> Administradores têm acesso total ao sistema, incluindo edição de estruturas e gerenciamento de usuários.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    console.log('🔥 CLIQUE DETECTADO - Executando addAdministrator');
                    console.log('📝 newAdminId:', newAdminId);
                    console.log('📝 newAdminName:', newAdminName);
                    console.log('👥 securitySettings.adminUsers:', securitySettings.adminUsers);
                    
                    if (!newAdminId.trim()) {
                      console.log('❌ ID vazio');
                      alert('❌ ID do usuário é obrigatório!');
                      return;
                    }

                    const adminId = newAdminId.trim();
                    const currentAdmins = securitySettings.adminUsers || [];
                    
                    console.log('🔍 Verificando se já é admin...');
                    if (currentAdmins.includes(adminId)) {
                      console.log('⚠️ Já é admin');
                      alert('⚠️ Este usuário já é administrador!');
                      return;
                    }

                    console.log('🔍 Validando formato do ID...');
                    // Validar se é um ID válido (aceitar user_, USER_, apenas números ou formato alfanumérico com hífen)
                    const isValidId = (
                      adminId.toLowerCase().startsWith('user_') ||
                      adminId.startsWith('USER_') ||
                      /^\d+$/.test(adminId) || // Aceitar apenas números
                      /^[A-Z0-9]+-[A-Z0-9]+$/i.test(adminId) // Aceitar formato como KLYGHMZG362K-18DKC9DB
                    ) && adminId.length >= 5; // Pelo menos 5 caracteres
                    
                    if (!isValidId) {
                      console.log('❌ ID inválido');
                      alert('❌ ID inválido! Deve começar com "user_", "USER_", ser numérico ou formato alfanumérico (ex: ABC123-DEF456).');
                      return;
                    }

                    console.log('✅ Adicionando à lista de admins...');
                    try {
                      const updatedAdmins = [...currentAdmins, adminId];
                      const updatedSettings = {...securitySettings, adminUsers: updatedAdmins};
                      console.log('📦 updatedSettings:', updatedSettings);
                      setSecuritySettings(updatedSettings);

                      if (newAdminName.trim()) {
                        console.log('📝 Salvando nome personalizado...');
                        const updatedNames = {
                          ...userNames,
                          [adminId]: newAdminName.trim()
                        };
                        setUserNames(updatedNames);
                      }

                      console.log('🧹 Limpando formulário...');
                      setNewAdminId('');
                      setNewAdminName('');
                      setShowAddAdmin(false);
                      
                      const displayName = newAdminName.trim() || getUserDisplayName(adminId);
                      console.log('✅ Sucesso! displayName:', displayName);
                      alert(`✅ Administrador "${displayName}" adicionado com sucesso!`);
                      
                    } catch (error) {
                      console.error('💥 Erro ao adicionar administrador:', error);
                      alert('❌ Erro ao adicionar administrador. Tente novamente.');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[48px]"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Admin
                </button>
                <button
                  onClick={() => {
                    setShowAddAdmin(false);
                    setNewAdminId('');
                    setNewAdminName('');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Configurações de Admin (novo, minimalista) */}
        {showSecuritySettings && isAdmin() && (
          <UserManagementModal
            user={user}
            setShowSecuritySettings={setShowSecuritySettings}
            isMobile={isMobile}
          />
        )}

        {/* Modal: Relatório de Estoque */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className={`bg-white rounded-lg p-4 md:p-6 w-full ${isMobile ? 'max-w-full h-full max-h-full overflow-y-auto' : 'max-w-6xl max-h-[90vh] overflow-y-auto'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-semibold flex items-center gap-2 justify-center md:justify-start">
                    <Package className="w-5 h-5 text-green-600" />
                    JR Localização de Estoque
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {reportData.length} {reportData.length === 1 ? 'item encontrado' : 'itens encontrados'}
                  </p>
                </div>
                
                {/* Botões de ação */}
                <div className="flex flex-wrap justify-center md:justify-end gap-2">
                  <button
                    onClick={copyReportToClipboard}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 min-h-[40px]"
                    title="Copiar para área de transferência"
                  >
                    📋 Copiar
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 min-h-[40px]"
                    title="Exportar para Excel/CSV"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 min-h-[40px]"
                    title="Imprimir relatório"
                  >
                    🖨️ Imprimir
                  </button>
                  {/* Botão fechar */}
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[40px] text-sm"
                  >
                    <X className="w-4 h-4" />
                    Fechar
                  </button>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium mb-3 text-center md:text-left">🔍 Filtros e Ordenação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Filtrar por corredor"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    value={reportFilters.corridor}
                    onChange={(e) => updateReportFilters({ corridor: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por prateleira"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    value={reportFilters.shelf}
                    onChange={(e) => updateReportFilters({ shelf: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por SKU"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    value={reportFilters.sku}
                    onChange={(e) => updateReportFilters({ sku: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Filtrar por código de cor"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    value={reportFilters.color}
                    onChange={(e) => updateReportFilters({ color: e.target.value })}
                  />
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    value={reportFilters.sortBy}
                    onChange={(e) => updateReportFilters({ sortBy: e.target.value })}
                  >
                    <option value="location">Ordenar por Localização</option>
                    <option value="sku">Ordenar por SKU</option>
                    <option value="quantity">Ordenar por Quantidade</option>
                    <option value="color">Ordenar por Cor</option>
                  </select>
                </div>
              </div>
              
              {/* Tabela do relatório */}
              {reportData.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum item encontrado</h3>
                  <p className="text-gray-500">Ajuste os filtros ou verifique se há produtos cadastrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Corredor</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Prateleira</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Localização</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">SKU</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Unidade</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Código Cor</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Quantidade</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((item, index) => (
                        <tr 
                          key={`${item.shelfId}-${item.row}-${item.col}-${item.colorCode}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="border border-gray-300 px-3 py-2 font-medium text-blue-600">
                            {item.corridor}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            {item.shelf}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 font-mono text-center bg-blue-50">
                            {item.location}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-800">
                            {item.sku}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-gray-600">
                            {item.unit}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 font-mono text-center bg-yellow-50">
                            {item.colorCode}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-bold text-green-700">
                            {item.quantity}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <button
                              onClick={() => navigateToItem(item)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 min-h-[32px]"
                              title="Ir para esta posição"
                            >
                              📍 Localizar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Resumo estatístico */}
              {reportData.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {[...new Set(reportData.map(item => item.sku))].length}
                    </div>
                    <div className="text-sm text-blue-600">Produtos Únicos</div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {reportData.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                    <div className="text-sm text-green-600">Quantidade Total</div>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {reportData.length}
                    </div>
                    <div className="text-sm text-purple-600">Cores Diferentes</div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-center">
                    <div className="text-2xl font-bold text-yellow-700">
                      {[...new Set(reportData.map(item => item.corridor))].length}
                    </div>
                    <div className="text-sm text-yellow-600">Corredores</div>
                  </div>
                </div>
              )}
              
              {/* Botão fechar */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 min-h-[48px]"
                >
                  <X className="w-4 h-4" />
                  Fechar Relatório
                </button>
              </div>
              
              {/* Informações adicionais */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 text-center">
                  💡 <strong>Dica:</strong> Use os filtros para refinar os resultados. 
                  Clique em "📍 Localizar" para ir direto ao produto na prateleira.
                </p>
                <p className="text-xs text-blue-600 text-center mt-1">
                  Relatório gerado em {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Backup & Restore */}
        {showBackupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Backup & Restore
                </h3>
                <button
                  onClick={() => setShowBackupModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Exportar Backup */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Exportar Backup
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Baixe uma cópia de segurança de todos os seus dados
                  </p>
                  <button
                    onClick={exportBackup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    Exportar Backup
                  </button>
                </div>

                {/* Importar Backup */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Importar Backup
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Restaure dados de um arquivo de backup
                  </p>
                  
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                    
                    {importData && (
                      <div>
                        <textarea
                          value={importData}
                          onChange={(e) => setImportData(e.target.value)}
                          placeholder="Cole o conteúdo do backup aqui..."
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                        />
                        <div className="mt-3 space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={importDryRun}
                              onChange={(e) => setImportDryRun(e.target.checked)}
                            />
                            Simular antes de aplicar (Dry-Run)
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Modo:</span>
                            <select
                              className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                              value={importMode}
                              onChange={(e) => setImportMode(e.target.value)}
                            >
                              <option value="replace">Substituir</option>
                              <option value="merge">Mesclar</option>
                            </select>
                          </div>
                        </div>
                        {importSummary && (
                          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>Prateleiras: <strong>{importSummary.shelvesCount}</strong></div>
                              <div>Posições: <strong>{importSummary.productPositions}</strong></div>
                              <div>Registros: <strong>{importSummary.locationRecords}</strong></div>
                              <div>Quantidade total: <strong>{importSummary.totalQuantity}</strong></div>
                              <div>SKUs únicos: <strong>{importSummary.uniqueSkus}</strong></div>
                              <div>Cores únicas: <strong>{importSummary.uniqueColors}</strong></div>
                              <div>Ajustes de IDs: <strong>{importSummary.sanitizedSegments}</strong></div>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => runImportBackup(importDryRun ? false : true)}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Settings className="w-4 h-4" />
                          {importDryRun ? 'Simular Importação' : (isImporting ? 'Aplicando...' : 'Aplicar no Firebase')}
                        </button>
                        {!importDryRun && (
                          <button
                            onClick={() => runImportBackup(true)}
                            disabled={isImporting}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Save className="w-4 h-4" />
                            {isImporting ? 'Processando...' : 'Confirmar Importação'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Aviso */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Importante:</strong> Ao restaurar um backup, todos os dados atuais serão substituídos. 
                    Faça um backup antes de restaurar!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Google Sheets */}
        {showSheetsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Grid className="h-5 w-5 text-green-600" />
                    Sincronização Google Sheets
                  </h2>
                  <button
                    onClick={() => setShowSheetsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Como configurar:</h3>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Acesse <a href="https://script.google.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Google Apps Script</a></li>
                      <li>Crie um novo projeto</li>
                      <li><strong>IMPORTANTE:</strong> No código abaixo, substitua "SEU_ID_DA_PLANILHA_AQUI" pelo ID da sua planilha</li>
                      <li>Para pegar o ID: copie da URL da sua planilha (parte entre /d/ e /edit)</li>
                      <li>Cole o código modificado no Apps Script</li>
                      <li>Publique como Web App (Executar como: Eu, Acesso: Qualquer pessoa)</li>
                      <li>Cole a URL do Web App no campo abaixo</li>
                      <li>Clique em "Sincronizar" para enviar os dados</li>
                    </ol>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-md mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Como encontrar o ID da sua planilha:</h4>
                    <p className="text-xs text-yellow-700">
                      Na URL da sua planilha: <code className="bg-yellow-100 px-1 rounded">https://docs.google.com/spreadsheets/d/<span className="font-bold">1ABC123XYZ456</span>/edit</code><br/>
                      O ID é: <span className="font-bold">1ABC123XYZ456</span>
                    </p>
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Google Apps Script Web App:
                  </label>
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={async (e) => {
                      const url = e.target.value;
                      try {
                        setSheetsUrl(url);
                        const sRef = ref(database, 'settings/sheetsUrl');
                        await set(sRef, url);
                        setSyncStatus('URL da planilha atualizada');
                        setTimeout(() => setSyncStatus(''), 3000);
                      } catch (err) {
                        setSyncStatus('Erro ao salvar URL da planilha');
                        setTimeout(() => setSyncStatus(''), 3000);
                      }
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                  {syncStatus && (
                    <div className={`p-3 rounded-md text-sm ${
                      syncStatus.includes('Erro') 
                        ? 'bg-red-100 text-red-700' 
                        : syncStatus.includes('Sincronizando') 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {syncStatus}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={syncWithGoogleSheets}
                      disabled={!sheetsUrl || syncStatus.includes('Sincronizando')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Grid className="h-4 w-4" />
                      {syncStatus.includes('Sincronizando') ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </button>

                    <button
                      onClick={() => setShowSheetsModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Código para Google Apps Script:</h4>
                    <p className="text-xs text-blue-600 mb-2">
                      Cole este código em um novo projeto do Google Apps Script:
                    </p>
                    <div className="bg-white p-3 rounded border text-xs font-mono text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{`function doPost(e) {
  try {
    // SUBSTITUA pelo ID da sua planilha
    const PLANILHA_ID = 'SEU_ID_DA_PLANILHA_AQUI';
    
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let sheet = ss.getSheetByName('Prateleira');
    
    // Criar aba se não existir
    if (!sheet) {
      sheet = ss.insertSheet('Prateleira');
      sheet.getRange(1, 1, 1, 4).setValues([['SKU', 'COR', 'QUANTIDADE', 'DATA MOVIMENTAÇÃO']]);
    }
    
    // Criar aba de teste
    let testSheet = ss.getSheetByName('TESTE');
    if (!testSheet) {
      testSheet = ss.insertSheet('TESTE');
    }
    testSheet.getRange(testSheet.getLastRow() + 1, 1).setValue(new Date() + ' - Script executado');
    
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'updateSingleProduct' && data.data) {
      const values = sheet.getDataRange().getValues();
      let found = false;
      
      // Busca exata
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.sku && values[i][1] == data.color) {
          // ATUALIZAR
          const newRow = [data.data.sku, data.data.cor, data.data.quantidade, data.data.dataMovimentacao];
          sheet.getRange(i + 1, 1, 1, 4).setValues([newRow]);
          testSheet.getRange(testSheet.getLastRow() + 1, 1).setValue(new Date() + ' - ATUALIZADO: ' + data.sku + ' ' + data.color);
          found = true;
          break;
        }
      }
      
      if (!found) {
        // INSERIR
        const newRow = [data.data.sku, data.data.cor, data.data.quantidade, data.data.dataMovimentacao];
        sheet.appendRow(newRow);
        testSheet.getRange(testSheet.getLastRow() + 1, 1).setValue(new Date() + ' - INSERIDO: ' + data.sku + ' ' + data.color);
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    if (data.action === 'updateAllProducts') {
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clear();
      }
      
      if (data.data && data.data.length > 0) {
        const values = data.data.map(p => [p.sku, p.cor, p.quantidade, p.dataMovimentacao]);
        sheet.getRange(2, 1, values.length, 4).setValues(values);
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: true}));
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: 'Ação desconhecida'}));
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}));
  }
}
  // SUBSTITUA pelo ID da sua planilha
  const PLANILHA_ID = 'SEU_ID_DA_PLANILHA_AQUI';
  
  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let sheet = ss.getSheetByName('Prateleira');
    
    // Criar aba se não existir
    if (!sheet) {
      sheet = ss.insertSheet('Prateleira');
      const headers = ['SKU', 'COR', 'QUANTIDADE', 'DATA MOVIMENTAÇÃO'];
      sheet.getRange(1, 1, 1, 4).setValues([headers]);
      
      // Formatar cabeçalhos
      const headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      sheet.autoResizeColumns(1, 4);
      sheet.setFrozenRows(1);
    }
    
    const data = JSON.parse(e.postData.contents);
    console.log('📥 Dados recebidos no Google Apps Script:', JSON.stringify(data));
    
    // Criar aba de debug simples
    let debugSheet = ss.getSheetByName('DEBUG_LOG');
    if (!debugSheet) {
      debugSheet = ss.insertSheet('DEBUG_LOG');
      debugSheet.getRange(1, 1, 1, 5).setValues([['TIMESTAMP', 'SKU_BUSCA', 'COR_BUSCA', 'ENCONTROU', 'AÇÃO']]);
    }
    
    // Atualizar produto individual
    if (data.action === 'updateSingleProduct') {
      const values = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      // Normalizar dados para busca (trim, remover espaços extras e uppercase)
      const searchSKU = String(data.sku || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const searchCOR = String(data.color || '').trim().replace(/\s+/g, ' ').toUpperCase();
      
      console.log('🔍 Buscando SKU: "' + searchSKU + '" COR: "' + searchCOR + '"');
      console.log('📝 SKU length: ' + searchSKU.length + ' | COR length: ' + searchCOR.length);
      console.log('📊 Dados existentes na planilha:', values.slice(1, Math.min(6, values.length)).map((row, i) => 
        'Linha ' + (i+2) + ': SKU="' + String(row[0] || '').trim() + '" COR="' + String(row[1] || '').trim() + '"'
      ));
      
      // Busca mais robusta - verificar se planilha tem dados
      if (values.length <= 1) {
        console.log('📝 Planilha vazia - será criado primeiro registro');
        rowIndex = -1;
      } else {
        // Procurar linha existente com busca normalizada
        for (let i = 1; i < values.length; i++) {
          if (!values[i] || values[i].length < 2) continue; // Pular linhas vazias
          
          const existingSKU = String(values[i][0] || '').trim().replace(/\s+/g, ' ').toUpperCase();
          const existingCOR = String(values[i][1] || '').trim().replace(/\s+/g, ' ').toUpperCase();
          
          console.log('🔍 Linha ' + (i+1) + ': SKU="' + existingSKU + '" COR="' + existingCOR + '"');
          console.log('🎯 Procurando: SKU="' + searchSKU + '" COR="' + searchCOR + '"');
          console.log('🔢 Match SKU: ' + (existingSKU === searchSKU) + ' | Match COR: ' + (existingCOR === searchCOR));
          
          if (existingSKU === searchSKU && existingCOR === searchCOR) {
            rowIndex = i + 1;
            console.log('✅ PRODUTO ENCONTRADO na linha:', rowIndex);
            break;
          }
        }
        
        if (rowIndex === -1) {
          console.log('❌ Produto NÃO encontrado - será criado novo registro');
          console.log('📊 Total de linhas verificadas:', values.length - 1);
        }
      }
      
      // Log debug na planilha
      const timestamp = new Date().toLocaleString('pt-BR');
      debugSheet.appendRow([
        timestamp,
        searchSKU,
        searchCOR,
        rowIndex > 0 ? 'SIM (Linha ' + rowIndex + ')' : 'NÃO',
        rowIndex > 0 ? 'ATUALIZAR' : 'INSERIR'
      ]);
      
      if (data.data === null) {
        // Remover produto (quantidade zerou)
        if (rowIndex > 0) {
          sheet.deleteRow(rowIndex);
        }
      } else {
        // Inserir/atualizar produto com dados normalizados
        const newRow = [
          String(data.data.sku || '').trim(),
          String(data.data.cor || '').trim(), 
          Number(data.data.quantidade || 0),
          String(data.data.dataMovimentacao || '')
        ];
        
        if (rowIndex > 0) {
          console.log('Atualizando produto existente na linha:', rowIndex);
          sheet.getRange(rowIndex, 1, 1, 4).setValues([newRow]);
        } else {
          console.log('Inserindo novo produto:', newRow);
          sheet.appendRow(newRow);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        action: 'single',
        debug: {
          searchSKU: searchSKU,
          searchCOR: searchCOR,
          foundAtRow: rowIndex,
          totalRows: values.length - 1,
          operation: rowIndex > 0 ? 'updated' : 'inserted',
          dataReceived: {
            sku: data.sku,
            color: data.color,
            hasData: !!data.data
          }
        }
      }));
    }
    
    // Sincronização completa
    if (data.action === 'updateAllProducts') {
      // Limpar dados mantendo cabeçalhos
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clear();
      }
      
      // Inserir novos dados
      if (data.data && data.data.length > 0) {
        const values = data.data.map(p => [
          p.sku, p.cor, p.quantidade, p.dataMovimentacao
        ]);
        sheet.getRange(2, 1, values.length, 4).setValues(values);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        count: data.data ? data.data.length : 0
      }));
    }
    
    // Função de debug para inspecionar dados da planilha
    if (data.action === 'debugSheet') {
      const values = sheet.getDataRange().getValues();
      const debugData = {
        totalRows: values.length,
        headers: values.length > 0 ? values[0] : [],
        sampleData: values.slice(1, Math.min(11, values.length)).map((row, i) => ({
          row: i + 2,
          sku: '"' + String(row[0] || '') + '"',
          cor: '"' + String(row[1] || '') + '"',
          quantidade: row[2],
          data: row[3],
          skuNormalized: String(row[0] || '').trim().replace(/\s+/g, ' ').toUpperCase(),
          corNormalized: String(row[1] || '').trim().replace(/\s+/g, ' ').toUpperCase()
        }))
      };
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        debug: debugData
      }));
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Ação não reconhecida: ' + (data.action || 'nenhuma')
    }));
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Erro: ' + error.toString()
    }));
  }
`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockControlApp;
