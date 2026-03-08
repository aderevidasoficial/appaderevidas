const CACHE_NAME = 'aderevidas-v8';
const DYNAMIC_CACHE = 'aderevidas-dynamic-v8';

// Arquivos para cache inicial
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
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(error => console.error('❌ Erro ao cachear:', error))
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
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// ========== NOTIFICAÇÕES PUSH (FCM) ==========
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);
  
  let data = {
    title: 'AdereVidas',
    body: 'Nova mensagem da igreja',
    icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    vibrate: [200, 100, 200],
    data: {
      screen: 'home',
      url: '/app.html',
      timestamp: new Date().toISOString()
    }
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      
      // Firebase FCM format
      if (pushData.notification) {
        data.title = pushData.notification.title || data.title;
        data.body = pushData.notification.body || data.body;
        data.image = pushData.notification.image;
      }
      
      // Custom data
      if (pushData.data) {
        data.data = { ...data.data, ...pushData.data };
      }
      
      console.log('📦 Dados da push:', pushData);
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      image: data.image,
      vibrate: data.vibrate,
      data: data.data,
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
      requireInteraction: true,
      silent: false,
      tag: 'push-' + Date.now()
    })
  );
});

// ========== CLIQUE EM NOTIFICAÇÃO ==========
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notificação clicada:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'close') return;
  
  const urlToOpen = data.url || data.link || '/app.html';
  const screenToOpen = data.screen || 'home';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('/app.html') && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            screen: screenToOpen,
            data: data
          });
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// ========== MENSAGENS DO CLIENTE ==========
self.addEventListener('message', event => {
  console.log('📨 Mensagem no SW:', event.data);
  
  const data = event.data;
  
  if (!data || !data.type) return;
  
  switch (data.type) {
    case 'SEND_LOCAL_NOTIFICATION':
      // Notificação local (teste)
      self.registration.showNotification(
        data.notification.titulo || 'AdereVidas',
        {
          body: data.notification.mensagem || 'Mensagem',
          icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
          badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
          vibrate: [200, 100, 200],
          data: {
            url: data.notification.link || '/app.html',
            screen: data.notification.screen || 'home',
            timestamp: Date.now()
          },
          requireInteraction: true
        }
      );
      break;
      
    case 'TEST_PUSH':
      self.registration.showNotification('🔔 Teste Push', {
        body: 'Esta é uma notificação de teste',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        vibrate: [200, 100, 200],
        data: { test: true }
      });
      break;
  }
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', event => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-notificacoes') {
    event.waitUntil(sincronizarNotificacoes());
  }
});

async function sincronizarNotificacoes() {
  console.log('Sincronizando notificações pendentes...');
  // Implementar se necessário
}

console.log('✅ Service Worker configurado para PUSH!');