/* ── Menu ── */
const boutonMenu = document.getElementById('boutonMenu');
const menuDeroulant = document.getElementById('menuDeroulant');

if (boutonMenu && menuDeroulant) {
    boutonMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        boutonMenu.classList.toggle('ouvert');
        menuDeroulant.classList.toggle('ouvert');
    });

    document.addEventListener('click', (e) => {
        if (!boutonMenu.contains(e.target) && !menuDeroulant.contains(e.target)) {
            boutonMenu.classList.remove('ouvert');
            menuDeroulant.classList.remove('ouvert');
        }
    });
}

/* ── Audio de fond ── */
const audio = document.getElementById('audioFond');
const boutonSon = document.getElementById('boutonSon');

if (audio && boutonSon) {
    audio.volume = 0.35;
    let musicStarted = false;

    // Tentative d'autoplay immédiate (fonctionne sur desktop)
    audio.play().then(() => {
        musicStarted = true;
    }).catch(() => {});

    // Démarre la musique au premier clic n'importe où SAUF le bouton son
    // (le bouton son a sa propre logique de premier démarrage)
    document.addEventListener('click', function démarrerAuPremierClic(e) {
        if (boutonSon.contains(e.target)) return;
        if (!musicStarted) {
            audio.play().catch(() => {});
            musicStarted = true;
        }
        document.removeEventListener('click', démarrerAuPremierClic);
    }, true); // capture phase : avant tout stopPropagation

    // Bouton son : premier clic = démarrer, clics suivants = bascule muet
    boutonSon.addEventListener('click', (e) => {
        e.stopPropagation();

        if (!musicStarted) {
            audio.play().catch(() => {});
            musicStarted = true;
            boutonSon.classList.remove('muet');
            return;
        }

        if (audio.muted) {
            audio.muted = false;
            boutonSon.classList.remove('muet');
        } else {
            audio.muted = true;
            boutonSon.classList.add('muet');
        }
    });
}
