/* Service worker do Racha: só cuida das notificações no celular (Web Push).
 * Não guarda o app em cache: as atualizações continuam chegando normalmente. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { title: 'Racha', body: event.data ? event.data.text() : '' };
  }
  const base = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(dados.title || 'Racha', {
      body: dados.body || '',
      icon: `${base}icon-192.png`,
      badge: `${base}icon-192.png`,
      tag: dados.tag,
      renotify: Boolean(dados.tag),
      data: { url: dados.url || base },
    })
  );
});

// tocar na notificação abre (ou traz para frente) o Racha na tela certa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of abertas) {
        if (c.url.startsWith(self.registration.scope)) {
          await c.focus();
          if ('navigate' in c) return c.navigate(url);
          return undefined;
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
