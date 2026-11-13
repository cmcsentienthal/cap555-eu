/* Service worker de cap555.eu
 *
 * ════════════════════════════════════════════════════════════════════
 *  À CHAQUE MISE EN LIGNE D'UNE NOUVELLE VERSION, CHANGER LE NUMÉRO
 *  CI-DESSOUS. Sinon les visiteurs qui ont déjà installé l'appli
 *  gardent l'ancien contenu en cache, et tu n'as aucun moyen de le voir.
 * ════════════════════════════════════════════════════════════════════
 */
const VERSION = 'v2';

const CACHE = `cap555-eu-${VERSION}`;

const A_PRECHARGER = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

// Installation : on remplit le cache, puis skipWaiting() pour que cette
// version n'attende pas la fermeture de tous les onglets avant de prendre
// la main. Sans ça, une correction peut mettre des jours à arriver.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(A_PRECHARGER);
    await self.skipWaiting();
  })());
});

// Activation : on supprime les caches des versions précédentes, puis
// clients.claim() pour prendre le contrôle des pages déjà ouvertes.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(
      noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// Stratégie : le réseau d'abord, le cache en secours.
//
// Connectée, la visiteuse voit donc TOUJOURS la dernière version mise en
// ligne. Hors ligne, elle voit la dernière version qu'elle a consultée.
// C'est l'inverse de la stratégie « cache d'abord », qui est plus rapide
// mais sert du contenu périmé.
self.addEventListener('fetch', (e) => {
  const requete = e.request;

  if (requete.method !== 'GET') return;
  if (new URL(requete.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const reponse = await fetch(requete);
      if (reponse && reponse.ok) {
        const cache = await caches.open(CACHE);
        cache.put(requete, reponse.clone());
      }
      return reponse;
    } catch (erreur) {
      const enCache = await caches.match(requete);
      if (enCache) return enCache;

      // Navigation hors ligne vers une adresse jamais visitée :
      // on sert la page d'accueil plutôt qu'une erreur du navigateur.
      if (requete.mode === 'navigate') {
        const accueil = await caches.match('./');
        if (accueil) return accueil;
      }
      throw erreur;
    }
  })());
});
