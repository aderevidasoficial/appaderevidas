const CACHE_NAME = 'aderevidas-v4';
const DYNAMIC_CACHE = 'aderevidas-dynamic-v4';

// Arquivos para cache inicial
const urlsToCache = [
  '/',
  '/app.html',
  '/index.html',
  '/cadastro-externo.html',
  '/manifest.json',
  'https://i.ibb.co/1G3ctD9b/logo-igreja.png'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');
  
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('❌ Erro ao cachear:', error);
        });
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker ativado!');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// ========== NOTIFICAÇÕES PUSH ==========
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'AdereVidas',
        body: event.data.text(),
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png'
      };
    }
  }
  
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: data.icon || 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    badge: data.badge || 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/app.html',
      screen: data.screen || 'home',
      id: data.id || Date.now()
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
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'AdereVidas',
      options
    )
  );
});

// ========== CLIQUE EM NOTIFICAÇÃO ==========
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notificação clicada:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  const urlToOpen = data.url || '/app.html';
  
  if (action === 'close') {
    return;
  }
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      
      for (const client of clients) {
        if (client.url.includes('app.html') && 'focus' in client) {
          if (data.screen) {
            client.postMessage({
              type: 'NAVIGATE',
              screen: data.screen
            });
          }
          return client.focus();
        }
      }
      
      return clients.openWindow(urlToOpen);
    })()
  );
});

// ========== SYNC EM BACKGROUND ==========
self.addEventListener('sync', event => {
  console.log('🔄 Sync em background:', event.tag);
  
  if (event.tag === 'verificar-eventos') {
    event.waitUntil(verificarEventosBackground());
  }
});

async function verificarEventosBackground() {
  try {
    self.registration.showNotification('📅 Lembrete', {
      body: 'Verifique os eventos de hoje na igreja!',
      icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
      badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
      data: {
        screen: 'eventos',
        url: '/app.html?screen=eventos'
      }
    });
  } catch (error) {
    console.error('Erro no background sync:', error);
  }
}

// ========== MENSAGENS DO CLIENTE ==========
self.addEventListener('message', event => {
  console.log('📨 Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker carregado e pronto!');