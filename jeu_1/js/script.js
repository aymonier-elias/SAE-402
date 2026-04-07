// Gestion du lancement en 2 etapes :
// 1) bouton "Lancer le jeux" => affiche les regles
// 2) bouton "Commencer" => lance reellement la partie
const btn = document.querySelector(".start");
const startConfirmBtn = document.querySelector(".start-confirm");
const game = document.querySelector("canvas");
const intro = document.querySelector(".intro");
const rulesModal = document.querySelector(".rules-modal");

if (btn) {
  btn.addEventListener("click", () => {
    btn.ariaExpanded = "true";
    if (rulesModal) rulesModal.ariaHidden = "false";
  });
}

if (startConfirmBtn) {
  startConfirmBtn.addEventListener("click", () => {
    if (rulesModal) rulesModal.ariaHidden = "true";
    if (game) game.ariaHidden = "false";
    if (intro) intro.ariaHidden = "true";

    window.dispatchEvent(new Event("game:start"));
  });
}

// Animation de texte : un span par lettre
const animatedTexts = document.querySelectorAll(".anime");

animatedTexts.forEach((element) => {
  const text = element.textContent;
  const fragment = document.createDocumentFragment();

  Array.from(text).forEach((letter) => {
    const span = document.createElement("span");
    span.textContent = letter === " " ? "\u00A0" : letter;
    span.className = "lettre";
    fragment.appendChild(span);
  });

  element.textContent = "";
  element.appendChild(fragment);
});