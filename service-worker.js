const CACHE_NAME = 'aderevidas-v7';
const DYNAMIC_CACHE = 'aderevidas-dynamic-v7';
const API_CACHE = 'aderevidas-api-v7';

// Arquivos para cache inicial (essenciais)
const urlsToCache = [
  '/',
  '/app.html',
  '/index.html',
  '/manifest.json',
  'https://i.ibb.co/1G3ctD9b/logo-igreja.png'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');
  
  // Forçar ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto, adicionando arquivos...');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('❌ Erro ao cachear:', error);
          // Continuar mesmo com erro
          return Promise.resolve();
        });
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker ativado!');
  
  // Limpar caches antigos
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar controle de todas as páginas abertas
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker ativo e controlando todas as abas');
      
      // Notificar todos os clientes que o SW foi ativado
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            timestamp: Date.now()
          });
        });
      });
    })
  );
});

// ========== ESTRATÉGIA DE CACHE (STALE-WHILE-REVALIDATE) ==========
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições de análise e extensões
  if (event.request.url.includes('chrome-extension') || 
      event.request.url.includes('analytics') ||
      event.request.url.includes('firebase')) {
    return;
  }

  // Estratégia: Stale-while-revalidate
  event.respondWith(
    caches.open(API_CACHE).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Cache da resposta da rede (apenas se for bem-sucedida)
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(error => {
            console.log('Erro na rede, usando cache:', error);
            return cachedResponse;
          });
        
        // Retorna cache ou promessa de rede
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// ========== NOTIFICAÇÕES PUSH ==========
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);
  
  let data = {
    title: 'AdereVidas',
    body: 'Nova mensagem',
    icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      // Se não for JSON, usa o texto
      data.body = event.data.text();
    }
  }
  
  // Adicionar ações personalizadas
  data.actions = [
    {
      action: 'open',
      title: '🔍 Abrir'
    },
    {
      action: 'close',
      title: '❌ Fechar'
    }
  ];
  
  // Garantir que tem data
  if (!data.data) {
    data.data = {
      url: '/app.html',
      screen: 'home',
      timestamp: new Date().toISOString()
    };
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

// ========== CLIQUE EM NOTIFICAÇÃO ==========
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notificação clicada:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'close') {
    return;
  }
  
  // URL para abrir
  const urlToOpen = data.url || '/app.html';
  const screenToOpen = data.screen || 'home';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Verificar se já existe uma janela aberta
      for (const client of windowClients) {
        if (client.url.includes('/app.html') && 'focus' in client) {
          // Enviar mensagem para a janela
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            screen: screenToOpen,
            notificationId: data.id,
            timestamp: Date.now()
          });
          return client.focus();
        }
      }
      
      // Se não existir, abrir nova
      return clients.openWindow(urlToOpen);
    })
  );
});

// ========== NOTIFICAÇÃO FECHADA ==========
self.addEventListener('notificationclose', event => {
  console.log('❌ Notificação fechada:', event.notification);
  
  // Registrar que a notificação foi fechada (opcional)
  const data = event.notification.data;
  if (data && data.id) {
    // Aqui você pode enviar para o Firebase que a notificação foi fechada
    console.log('Notificação fechada ID:', data.id);
  }
});

// ========== MENSAGENS DO CLIENTE ==========
self.addEventListener('message', event => {
  console.log('📨 Mensagem recebida no SW:', event.data);
  
  const { data, source } = event;
  
  if (!data || !data.type) return;
  
  switch (data.type) {
    case 'SEND_NOTIFICATION':
      // Enviar notificação para este dispositivo
      self.registration.showNotification(
        data.notification.titulo || 'AdereVidas',
        {
          body: data.notification.mensagem || 'Nova mensagem',
          icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
          badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
          vibrate: [200, 100, 200],
          data: {
            url: data.notification.link || '/app.html',
            screen: data.notification.screen || 'home',
            id: data.notification.id || Date.now(),
            timestamp: new Date().toISOString()
          },
          actions: [
            {
              action: 'open',
              title: '🔍 Abrir'
            },
            {
              action: 'close',
              title: '❌ Fechar'
            }
          ],
          requireInteraction: true
        }
      );
      break;
      
    case 'NOTIFICATION_TEST':
      // Enviar notificação de teste
      self.registration.showNotification('🔔 Teste de Notificação', {
        body: 'Esta é uma notificação de teste do AdereVidas',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        vibrate: [200, 100, 200],
        data: {
          screen: 'home',
          test: true
        },
        requireInteraction: false
      });
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      // Limpar caches antigos
      event.waitUntil(
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                return caches.delete(cacheName);
              }
            })
          );
        }).then(() => {
          // Responder ao cliente
          if (source) {
            source.postMessage({
              type: 'CACHE_CLEARED',
              success: true
            });
          }
        })
      );
      break;
      
    case 'GET_STATUS':
      // Retornar status do SW
      if (source) {
        source.postMessage({
          type: 'SW_STATUS',
          active: true,
          cacheName: CACHE_NAME,
          timestamp: Date.now()
        });
      }
      break;
  }
});

// ========== NOTIFICAÇÕES PERIÓDICAS (BACKGROUND SYNC) ==========
self.addEventListener('periodicsync', event => {
  console.log('🔄 Periodic Sync:', event.tag);
  
  if (event.tag === 'verificar-eventos') {
    event.waitUntil(verificarEventosHoje());
  } else if (event.tag === 'verificar-aniversarios') {
    event.waitUntil(verificarAniversariosHoje());
  }
});

async function verificarEventosHoje() {
  try {
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0];
    
    // Aqui você pode buscar eventos do Firebase IndexedDB
    // Por enquanto, notificação genérica
    
    const eventosHoje = false; // Simular verificação
    
    if (eventosHoje) {
      self.registration.showNotification('📅 Eventos Hoje!', {
        body: 'Você tem eventos programados para hoje',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        tag: 'eventos-hoje',
        data: {
          screen: 'eventos'
        }
      });
    }
  } catch (error) {
    console.error('Erro ao verificar eventos:', error);
  }
}

async function verificarAniversariosHoje() {
  try {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth();
    
    // Verificar aniversariantes (simulado)
    const temAniversario = false; // Simular
    
    if (temAniversario) {
      self.registration.showNotification('🎂 Aniversariantes Hoje!', {
        body: 'Hoje tem aniversariante na igreja!',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        tag: 'aniversarios-hoje',
        data: {
          screen: 'aniversariantes'
        }
      });
    }
  } catch (error) {
    console.error('Erro ao verificar aniversários:', error);
  }
}

// ========== SINCronização EM BACKGROUND ==========
self.addEventListener('sync', event => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-notificacoes') {
    event.waitUntil(sincronizarNotificacoes());
  }
});

async function sincronizarNotificacoes() {
  try {
    // Aqui você pode sincronizar notificações pendentes com o servidor
    console.log('Sincronizando notificações...');
    
    // Notificar o usuário que a sincronização foi concluída
    self.registration.showNotification('✅ Sincronizado', {
      body: 'Suas notificações foram sincronizadas',
      icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
      badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
      tag: 'sync-completo'
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}

// ========== GERENCIAMENTO DE ERROS ==========
self.addEventListener('error', event => {
  console.error('❌ Erro no Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('❌ Promise rejeitada no SW:', event.reason);
});

// ========== FUNÇÕES UTILITÁRIAS ==========

// Função para verificar se o dispositivo está online
function isOnline() {
  return self.navigator.onLine;
}

// Função para enviar mensagem para todos os clientes
async function broadcastMessage(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Função para limpar notificações antigas
async function limparNotificacoesAntigas() {
  const registrations = await self.registration.getNotifications();
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;
  
  registrations.forEach(notification => {
    if (notification.timestamp && (agora - notification.timestamp) > umDia) {
      notification.close();
    }
  });
}

// Executar limpeza periódica
setInterval(limparNotificacoesAntigas, 60 * 60 * 1000); // A cada hora

// ========== INICIALIZAÇÃO ==========
console.log('🚀 Service Worker carregado e pronto!');
console.log('📦 Cache principal:', CACHE_NAME);
console.log('🔄 Cache dinâmico:', DYNAMIC_CACHE);
console.log('🌐 Cache API:', API_CACHE);

// Notificar que o SW foi carregado
self.clients.matchAll().then(clients => {
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_LOADED',
      timestamp: Date.now()
    });
  });
});

// ========== INTERCEPTAÇÃO DE REQUISIÇÕES DA API ==========
self.addEventListener('fetch', event => {
  // Cache específico para Firebase (opcional)
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            return cache.match(event.request);
          });
      })
    );
  }
});

// ========== SUPORTE A WEB PUSH ==========
self.addEventListener('pushsubscriptionchange', event => {
  console.log('🔄 Assinatura push mudou:', event);
  
  // Aqui você pode renovar a assinatura push com o servidor
  const subscription = event.newSubscription;
  if (subscription) {
    // Enviar nova assinatura para o servidor
    fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });
  }
});

// ========== MODO OFFLINE ==========
self.addEventListener('fetch', event => {
  // Página offline personalizada
  if (event.request.mode === 'navigate' && !navigator.onLine) {
    event.respondWith(
      caches.match('/offline.html').then(response => {
        return response || caches.match('/app.html');
      })
    );
  }
});

console.log('✅ Service Worker configurado completamente!');