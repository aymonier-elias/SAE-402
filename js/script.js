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
    let audioLance = false;

    // Lance la musique au premier contact (requis par les navigateurs mobiles)
    function lancerAudio() {
        if (!audioLance) {
            audio.play().catch(() => {});
            audioLance = true;
        }
    }

    document.addEventListener('touchstart', lancerAudio, { once: true });
    document.addEventListener('click', lancerAudio, { once: true });

    // Bouton toggle son
    boutonSon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (audio.paused) {
            audio.play().catch(() => {});
            boutonSon.classList.remove('muet');
        } else {
            audio.pause();
            boutonSon.classList.add('muet');
        }
    });
}
