const step = Number(new URLSearchParams(window.location.search).get("step") || 0);

const FLOW = [
  {
    title: "Prologue",
    rappel:
      "Mulhouse is a textile city. Each step of the journey is tied to a real place and local know-how.",
    lines: [
      { from: "h", text: "Hi... My name is Henriette." },
      { from: "h", text: "I need help creating a unique fabric for my mother." },
      { from: "h", text: "Can you come to Cours des Chaines with me?" }
    ],
    choices: ["I'm on my way!", "Yes, I'm coming with you."],
    location: {
      name: "Cours des Chaines, Mulhouse",
      coords: [47.7487, 7.3382]
    },
    nextUrl: "jeu_1/index.html",
    cta: "Create the color"
  },
  {
    title: "Before game 2",
    rappel:
      "Cours des Chaines was a dyeing place. Fabric colors there were workshop secrets.",
    lines: [
      { from: "h", text: "Great, we found the color." },
      { from: "h", text: "Now we need to imagine the fabric pattern." },
      { from: "h", text: "Next stop: Rue des Tanneurs." }
    ],
    choices: ["Let's continue.", "I'm ready."],
    location: {
      name: "Rue des Tanneurs, Mulhouse",
      coords: [47.7483, 7.3393]
    },
    nextUrl: "jeu_2/index.html",
    cta: "Find the pattern"
  },
  {
    title: "Before game 3",
    rappel:
      "Rue des Tanneurs recalls artisans who transformed materials with patience and precision.",
    lines: [
      { from: "h", text: "The pattern is ready." },
      { from: "h", text: "Now we have to assemble all the pieces." },
      { from: "h", text: "Meet me on Rue Henriette." }
    ],
    choices: ["Let's go.", "I'll help you assemble it."],
    location: {
      name: "Rue Henriette, Mulhouse",
      coords: [47.74659371580632, 7.337241670299067]
    },
    nextUrl: "jeu_3/index.html",
    cta: "Assemble the fabric"
  },
  {
    title: "Before game 4",
    rappel:
      "Parc Steinbach is a place of rest and shared memory in Mulhouse's history.",
    lines: [
      { from: "h", text: "The fabric is almost ready." },
      { from: "h", text: "Only the most important moment is left: giving it." },
      { from: "h", text: "We finish at Parc Steinbach." }
    ],
    choices: ["Let's go.", "Let's finish this adventure."],
    location: {
      name: "Parc Steinbach, Mulhouse",
      coords: [47.7446, 7.3365]
    },
    nextUrl: "jeu_4/index.html",
    cta: "Give the gift"
  },
  {
    title: "Epilogue",
    rappel: "The creation is complete.",
    lines: [{ from: "h", text: "Thank you for your help. It was a wonderful adventure." }],
    choices: ["Thank you, Henriette."],
    nextUrl: "finale.html",
    cta: "See the final scene"
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
      if (!current.location) {
        setMapStatus("");
        setTimeout(() => {
          window.location.href = current.nextUrl;
        }, 900);
        return;
      }
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
  mapTitleEl.textContent = `Meet Henriette at ${current.location.name}`;

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
      setMapStatus("Compass permission denied");
        return;
      }
    } catch (_e) {
      setMapStatus("Compass unavailable");
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
    setMapStatus("Geolocation not supported");
    return;
  }

  if (userWatchId !== null) {
    navigator.geolocation.clearWatch(userWatchId);
    userWatchId = null;
  }

  setMapStatus("Searching for your location...");
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
        setMapStatus(`Location active: ${roundedDistance} m (ready to start)`);
      } else {
        setMapStatus(`Location active: ${roundedDistance} m (~${Math.round(accuracy)} m GPS)`);
      }
    },
    () => {
      userDistanceMeters = null;
      updateLaunchAvailability();
      setMapStatus("Location denied or unavailable");
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
