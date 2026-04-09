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
    nextUrl: "jeu_1/index.html",
    cta: "Lancer le jeu 1"
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
    nextUrl: "jeu_2/index.html",
    cta: "Lancer le jeu 2"
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
    nextUrl: "jeu_3/index.html",
    cta: "Lancer le jeu 3"
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
    nextUrl: "jeu_4/index.html",
    cta: "Lancer le jeu 4"
  },
  {
    title: "Epilogue",
    rappel: "La creation est terminee.",
    lines: [{ from: "h", text: "Merci pour ton aide. C'etait une belle aventure." }],
    choices: ["Merci Henriette."],
    nextUrl: "index.html",
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

etapeEl.textContent = current.title;
rappelEl.textContent = current.rappel;
btnLancer.textContent = current.cta;
let typingEl = null;

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
      btnLancer.classList.remove("hidden");
    });
    choicesEl.appendChild(btn);
  });
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
  window.location.href = current.nextUrl;
});
