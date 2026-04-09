const step = Number(new URLSearchParams(window.location.search).get("step") || 0);

const FLOW = [
  {
    title: "Prologue",
    rappel:
      "Mulhouse est une ville textile. Chaque etape du parcours reprend un lieu reel et un savoir-faire local.",
    lines: [
      { from: "h", text: "Bonjour... Je m'appelle Henriette." },
      { from: "h", text: "J'ai besoin d'aide pour creer un tissu unique pour ma mere." },
      { from: "h", text: "Tu peux venir au Cours des Chaines avec moi ?" }
    ],
    choices: ["J'arrive !", "Oui, je te suis."],
    location: {
      name: "Cours des Chaines, Mulhouse",
      coords: [47.7487, 7.3382]
    },
    nextUrl: "jeu_1/index.html",
    cta: "Créer la couleur"
  },
  {
    title: "Avant le jeu 2",
    rappel:
      "Le Cours des Chaines etait un lieu de teinture. Les couleurs des tissus y etaient des secrets d'atelier.",
    lines: [
      { from: "h", text: "Super, on a trouve la couleur." },
      { from: "h", text: "Maintenant, il faut imaginer le motif du tissu." },
      { from: "h", text: "Direction la Rue des Tanneurs." }
    ],
    choices: ["On continue.", "Je suis pret."],
    location: {
      name: "Rue des Tanneurs, Mulhouse",
      coords: [47.7483, 7.3393]
    },
    nextUrl: "jeu_2/index.html",
    cta: "Trouver le patern"
  },
  {
    title: "Avant le jeu 3",
    rappel:
      "La Rue des Tanneurs rappelle les artisans qui transformaient la matiere avec patience et precision.",
    lines: [
      { from: "h", text: "Le motif est en place." },
      { from: "h", text: "Il faut maintenant assembler toutes les pieces." },
      { from: "h", text: "Rendez-vous Rue Henriette." }
    ],
    choices: ["On y va.", "Je t'aide a assembler."],
    location: {
      name: "Rue Henriette, Mulhouse",
      coords: [47.74659371580632, 7.337241670299067]
    },
    nextUrl: "jeu_3/index.html",
    cta: "Assembler le tissu"
  },
  {
    title: "Avant le jeu 4",
    rappel:
      "Le Parc Steinbach est un lieu de pause et de memoire collective dans l'histoire de Mulhouse.",
    lines: [
      { from: "h", text: "Le tissu est presque pret." },
      { from: "h", text: "Il reste le moment le plus important : l'offrir." },
      { from: "h", text: "On termine au Parc Steinbach." }
    ],
    choices: ["Allons-y.", "On finit l'aventure."],
    location: {
      name: "Parc Steinbach, Mulhouse",
      coords: [47.7446, 7.3365]
    },
    nextUrl: "jeu_4/index.html",
    cta: "Donné le cadeau"
  },
  {
    title: "Epilogue",
    rappel: "La creation est terminee.",
    lines: [{ from: "h", text: "Merci pour ton aide. C'etait une belle aventure." }],
    choices: ["Merci Henriette."],
    nextUrl: "/index.html",
    cta: "Retour a l'accueil"
  }
];

const current = FLOW[Math.min(Math.max(step, 0), FLOW.length - 1)];

const etapeEl = document.getElementById("messages-etape");
const rappelEl = document.getElementById("rappel-texte");
const rappelCard = document.getElementById("rappel-historique");
const btnRappel = document.getElementById("btn-rappel");
const listEl = document.getElementById("messages-list");
const choicesEl = document.getElementById("messages-choices");
const btnLancer = document.getElementById("btn-lancer-jeu");
const mapWrapEl = document.getElementById("messages-map-wrap");
const mapTitleEl = document.getElementById("messages-map-title");
const mapEl = document.getElementById("messages-map");
const btnUserLocate = document.getElementById("btn-user-locate");
const mapStatusEl = document.getElementById("messages-map-status");

etapeEl.textContent = current.title;
rappelEl.textContent = current.rappel;
btnLancer.textContent = current.cta;
let typingEl = null;
let mapInstance = null;
let mapMarker = null;
let userMarker = null;
let userDot = null;
let userWatchId = null;
let userHeadingDeg = null;
let headingBound = false;
let userDistanceMeters = null;
const MAX_START_DISTANCE_M = 15;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getNaturalDelay(text, isTypingPhase = false) {
  const lengthBoost = Math.min((text || "").length * 7, 520);
  if (isTypingPhase) {
    return randomBetween(380, 760) + Math.floor(lengthBoost * 0.35);
  }
  return randomBetween(260, 520) + Math.floor(lengthBoost * 0.2);
}

function addMsg(from, text) {
  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${from === "h" ? "from-h" : "from-j"}`;
  bubble.textContent = text;
  listEl.appendChild(bubble);
  listEl.scrollTop = listEl.scrollHeight;
}

function showTyping() {
  hideTyping();
  typingEl = document.createElement("div");
  typingEl.className = "messages-typing";
  typingEl.innerHTML = "<span></span><span></span><span></span>";
  listEl.appendChild(typingEl);
  listEl.scrollTop = listEl.scrollHeight;
}

function hideTyping() {
  if (!typingEl) return;
  typingEl.remove();
  typingEl = null;
}

function showChoices() {
  choicesEl.innerHTML = "";
  choicesEl.classList.remove("hidden");
  current.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "messages-choice";
    btn.textContent = choice;
    btn.addEventListener("click", () => {
      addMsg("j", choice);
      choicesEl.classList.add("hidden");
      showMapThenLaunch();
    });
    choicesEl.appendChild(btn);
  });
}

function showMapThenLaunch() {
  if (!current.location || typeof L === "undefined") {
    btnLancer.classList.remove("hidden");
    return;
  }

  const [lat, lng] = current.location.coords;
  mapTitleEl.textContent = `Retrouve Henriette a ${current.location.name}`;

  // La carte devient une bulle dans le meme fil de messages.
  mapWrapEl.classList.remove("hidden");
  if (!listEl.contains(mapWrapEl)) {
    mapWrapEl.classList.add("message-bubble", "from-h", "message-map-bubble");
    listEl.appendChild(mapWrapEl);
  }

  if (!mapInstance) {
    mapInstance = L.map(mapEl, { zoomControl: true }).setView([lat, lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapInstance);
  } else {
    mapInstance.setView([lat, lng], 16);
  }

  if (mapMarker) {
    mapMarker.setLatLng([lat, lng]);
  } else {
    mapMarker = L.marker([lat, lng]).addTo(mapInstance);
  }

  mapMarker.bindPopup(current.location.name).openPopup();
  setTimeout(() => mapInstance.invalidateSize(), 150);
  if (btnUserLocate) btnUserLocate.classList.remove("hidden");
  // Demande automatique des permissions quand la carte apparait.
  startUserLocation();
  btnLancer.classList.remove("hidden");
  updateLaunchAvailability();
  listEl.scrollTop = listEl.scrollHeight;
}

function setMapStatus(text) {
  if (mapStatusEl) mapStatusEl.textContent = text;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateLaunchAvailability() {
  if (!current.location) {
    btnLancer.disabled = false;
    return;
  }
  if (typeof userDistanceMeters !== "number") {
    btnLancer.disabled = true;
    return;
  }
  btnLancer.disabled = userDistanceMeters > MAX_START_DISTANCE_M;
}

function normalizeHeading(alpha) {
  if (typeof alpha !== "number") return null;
  return (360 - alpha) % 360;
}

function updateHeadingMarker() {
  if (!userDot || typeof userHeadingDeg !== "number") return;
  userDot.style.setProperty("--heading", `${userHeadingDeg}deg`);
}

function onOrientation(event) {
  if (typeof event.webkitCompassHeading === "number") {
    userHeadingDeg = event.webkitCompassHeading;
  } else {
    userHeadingDeg = normalizeHeading(event.alpha);
  }
  updateHeadingMarker();
}

async function enableCompass() {
  if (headingBound || typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return;
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") {
        setMapStatus("Boussole non autorisee");
        return;
      }
    } catch (_e) {
      setMapStatus("Boussole indisponible");
      return;
    }
  }
  window.addEventListener("deviceorientation", onOrientation, true);
  headingBound = true;
}

function ensureUserMarker(lat, lng) {
  if (!mapInstance) return;
  if (!userMarker) {
    const icon = L.divIcon({
      className: "",
      html: '<div id="user-dot" class="user-heading-icon"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(mapInstance);
    setTimeout(() => {
      userDot = document.getElementById("user-dot");
      updateHeadingMarker();
    }, 50);
    return;
  }
  userMarker.setLatLng([lat, lng]);
}

function startUserLocation() {
  if (!navigator.geolocation) {
    setMapStatus("Geolocalisation non supportee");
    return;
  }

  if (userWatchId !== null) {
    navigator.geolocation.clearWatch(userWatchId);
    userWatchId = null;
  }

  setMapStatus("Recherche de votre position...");
  userWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const [targetLat, targetLng] = current.location.coords;
      userDistanceMeters = distanceMeters(latitude, longitude, targetLat, targetLng);
      updateLaunchAvailability();
      ensureUserMarker(latitude, longitude);
      if (mapInstance) {
        mapInstance.setView([latitude, longitude], 16);
      }
      const roundedDistance = Math.round(userDistanceMeters);
      if (roundedDistance <= MAX_START_DISTANCE_M) {
        setMapStatus(`Position active: ${roundedDistance} m (ok pour lancer)`);
      } else {
        setMapStatus(`Position active: ${roundedDistance} m (~${Math.round(accuracy)} m GPS)`);
      }
    },
    () => {
      userDistanceMeters = null;
      updateLaunchAvailability();
      setMapStatus("Position refusee ou indisponible");
    },
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
  );

  enableCompass();
}

function playMessages(index = 0) {
  if (index >= current.lines.length) {
    hideTyping();
    showChoices();
    return;
  }
  const line = current.lines[index];
  if (line.from === "h") {
    showTyping();
    const typingDelay = getNaturalDelay(line.text, true);
    setTimeout(() => {
      hideTyping();
      addMsg(line.from, line.text);
      setTimeout(() => playMessages(index + 1), getNaturalDelay(line.text, false));
    }, typingDelay);
    return;
  }
  addMsg(line.from, line.text);
  setTimeout(() => playMessages(index + 1), getNaturalDelay(line.text, false));
}

btnRappel.addEventListener("click", () => {
  rappelCard.classList.add("hidden");
  listEl.classList.remove("hidden");
  playMessages();
});

btnLancer.addEventListener("click", () => {
  if (btnLancer.disabled) return;
  window.location.href = current.nextUrl;
});

if (btnUserLocate) {
  btnUserLocate.addEventListener("click", () => {
    startUserLocation();
  });
}
