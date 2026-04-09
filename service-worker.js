const CACHE_NAME = "henriette-pwa-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/jeux.html",
  "/messages.html",
  "/finale.html",
  "/style/style.css",
  "/js/script.js",
  "/js/messages.js",
  "/js/pwa.js",
  "/jeu_1/index.html",
  "/jeu_1/css/styles.css",
  "/jeu_1/js/script.js",
  "/jeu_1/js/game.js",
  "/jeu_2/index.html",
  "/jeu_2/style/style.css",
  "/jeu_2/JS/script.js",
  "/jeu_3/index.html",
  "/jeu_3/Style/style.css",
  "/jeu_3/JavaScript/script.js",
  "/jeu_4/index.html",
  "/jeu_4/Style/style.css",
  "/jeu_4/Script/script.js",
  "/img/PageAccueil.png",
  "/img/image_fin.webp",
  "/jeu_3/Img/maison_henriette.png",
  "/jeu_4/Assets/Images/ImageJeu.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return caches.match("/index.html");
      })
  );
});
