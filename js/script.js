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
