const CACHE_NAME = 'aderevidas-v3';
const DYNAMIC_CACHE = 'aderevidas-dynamic-v3';
const API_CACHE = 'aderevidas-api-v3';

// Arquivos para cache inicial
const urlsToCache = [
  '/',
  '/app.html',
  '/index.html',
  '/cadastro-externo.html',
  '/consultar-cadastro.html',
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
        console.log('✅ Cache aberto, adicionando arquivos...');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('❌ Erro ao cachear arquivos:', error);
          return Promise.all(
            urlsToCache.map(url => 
              cache.add(url).catch(err => 
                console.warn(`⚠️ Não foi possível cachear: ${url}`, err)
              )
            )
          );
        });
      })
      .then(() => {
        console.log('✅ Service Worker instalado com sucesso!');
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker ativando...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
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

// ========== INTERCEPTAÇÃO DE REQUISIÇÕES ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    event.respondWith(networkFirstStrategy(event.request));
  } 
  else if (event.request.url.includes('.jpg') || 
           event.request.url.includes('.png') || 
           event.request.url.includes('.svg') ||
           event.request.url.includes('ibb.co')) {
    event.respondWith(cacheFirstStrategy(event.request));
  }
  else {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
  }
});

// Estratégia: Cache First
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Erro na estratégia Cache First:', error);
    return new Response('Recurso não disponível offline', { status: 404 });
  }
}

// Estratégia: Network First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'Você está offline. Conecte-se para atualizar.' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estratégia: Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const networkPromise = fetch(request)
    .then(networkResponse => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(error => console.log('Erro ao atualizar cache:', error));
  
  if (cachedResponse) {
    networkPromise.catch(() => {});
    return cachedResponse;
  }
  
  return networkPromise;
}

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
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        vibrate: [200, 100, 200],
        data: {
          url: '/app.html',
          screen: 'home'
        }
      };
    }
  }
  
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: data.icon || 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    badge: data.badge || 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {
      url: '/app.html',
      screen: data.screen || 'home',
      id: data.id || Date.now()
    },
    actions: data.actions || [
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
    requireInteraction: data.requireInteraction || false,
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
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            action: action
          });
          
          if (data.screen) {
            client.postMessage({
              type: 'NAVIGATE',
              screen: data.screen,
              params: data.params || {}
            });
          }
          
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        const url = new URL(urlToOpen, self.location.origin);
        
        if (data.screen) {
          url.searchParams.set('screen', data.screen);
        }
        if (data.id) {
          url.searchParams.set('id', data.id);
        }
        
        return clients.openWindow(url.toString());
      }
    })()
  );
});

// ========== SYNC EM BACKGROUND ==========
self.addEventListener('sync', event => {
  console.log('🔄 Sync em background:', event.tag);
  
  if (event.tag === 'verificar-eventos') {
    event.waitUntil(verificarEventosBackground());
  } else if (event.tag === 'verificar-aniversarios') {
    event.waitUntil(verificarAniversariosBackground());
  } else if (event.tag === 'versiculo-diario') {
    event.waitUntil(enviarVersiculoDiario());
  }
});

// Verificar eventos em background
async function verificarEventosBackground() {
  try {
    const hoje = new Date();
    const hora = hoje.getHours();
    
    if (hora < 6 || hora > 22) return;
    
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
    console.error('Erro no background sync de eventos:', error);
  }
}

// Verificar aniversários em background
async function verificarAniversariosBackground() {
  try {
    const hoje = new Date();
    const hora = hoje.getHours();
    
    if (hora === 7 && hoje.getMinutes() < 5) {
      self.registration.showNotification('🎂 Aniversariantes', {
        body: 'Veja quem está fazendo aniversário hoje!',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        data: {
          screen: 'aniversariantes',
          url: '/app.html?screen=aniversariantes'
        }
      });
    }
  } catch (error) {
    console.error('Erro no background sync de aniversários:', error);
  }
}

// Enviar versículo do dia
async function enviarVersiculoDiario() {
  try {
    const hoje = new Date();
    const hora = hoje.getHours();
    
    if (hora === 7 && hoje.getMinutes() < 5) {
      self.registration.showNotification('📖 Versículo do Dia', {
        body: 'Porque Deus amou o mundo de tal maneira... João 3:16',
        icon: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        badge: 'https://i.ibb.co/1G3ctD9b/logo-igreja.png',
        data: {
          screen: 'biblia',
          url: '/app.html?screen=biblia'
        }
      });
    }
  } catch (error) {
    console.error('Erro ao enviar versículo:', error);
  }
}

// ========== MENSAGENS DO CLIENTE ==========
self.addEventListener('message', event => {
  console.log('📨 Mensagem recebida do cliente:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({
      type: 'SW_VERSION',
      version: CACHE_NAME
    });
  }
});

console.log('🚀 Service Worker carregado e pronto!');