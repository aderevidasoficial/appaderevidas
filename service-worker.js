const CACHE_NAME = 'aderevidas-v4';

self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativado!');
  event.waitUntil(clients.claim());
});

// Notificações push
self.addEventListener('push', event => {
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
      screen: data.screen || 'home'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'AdereVidas',
      options
    )
  );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const data = event.notification.data || {};
  const urlToOpen = data.url || '/app.html';
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('app.html') && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

console.log('Service Worker carregado!');