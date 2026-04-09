//
//  CONFIGURATION
// 

const LEVELS = {
    facile:    { cols: 11, rows: 15 },
    moyen:     { cols: 19, rows: 29 },
    difficile: { cols: 31, rows: 43 },
};

const gameData = {
    couleur: '#e63946',
    motif:   'rayures',
};

// Couleurs du labyrinthe
const C_WALL    = '#3b2b1f';  // murs
const C_PATH    = '#f2e8d5';  // passages
const C_VISITED = '#e9dcc3';  // cellules visitées pendant la génération
const C_PLAYER  = '#2f3e6b';  // joueur (Henriette)
const C_END     = '#8b2e2e';  // case d'arrivée
const C_CURRENT = '#d8c7a0';  // cellule active pendant la génération

const MOVE_DELAY = 100; // délai en ms entre chaque déplacement maintenu

const CHAT_SESSIONS = {
    intro: {
        historyId: 'history-intro',
        screenId: 'screen-chat-intro',
        messagesId: 'chat-messages-intro',
        choicesId: 'chat-choices-intro',
        actionId: 'btn-launch-intro',
        actionLabel: 'Lancer le jeu',
        lines: [
            { from: 'h', text: 'Cette rue... elle porte mon nom.' },
            { from: 'h', text: 'On a la couleur et le motif, mais les pieces sont encore separees.' },
            { from: 'h', text: 'Aide moi a assembler le tissu. C est ici que tout doit se reunir.' }
        ],
        choices: [
            'Je suis la, on assemble tout ensemble.',
            'On y va, montre moi la suite.'
        ]
    },
    outro: {
        historyId: 'history-outro',
        screenId: 'screen-chat-outro',
        messagesId: 'chat-messages-outro',
        choicesId: 'chat-choices-outro',
        actionId: 'btn-launch-outro',
        actionLabel: 'Voir le resultat',
        lines: [
            { from: 'h', text: 'Tu aurais vu son sourire...' },
            { from: 'h', text: 'Elle a deplie le tissu lentement et l a regarde longtemps.' },
            { from: 'h', text: 'Merci, tu m as aidee a creer bien plus qu un tissu.' }
        ],
        choices: [
            'C etait une belle aventure.',
            'Bravo Henriette, c etait magnifique.'
        ]
    }
};


// 
//  ÉTAT DU JEU
// 

const canvas = document.getElementById('maze');
const ctx    = canvas.getContext('2d');

let COLS, ROWS, CELL;

// grid : tableau 1D, true = mur / false = passage
let grid, player, generating;
let visited_path = [];

let selectedLevel = 'moyen';
let startTime     = null;

// État des touches/boutons directionnels
let left = false, right = false, up = false, down = false;

let temps1    = performance.now();
let moveTimer = 0;
let activeChatSession = null;


// 
//  INITIALISATION DU NIVEAU
// 

function choixNiv(level) {
    COLS = LEVELS[level].cols;
    ROWS = LEVELS[level].rows;

    const padding = 32;
    const uiSpace = 260;

    // Calcule la taille maximale d'une cellule selon l'espace disponible
    CELL = Math.floor(Math.min(
        (window.innerWidth  - padding) / COLS,
        (window.innerHeight - uiSpace) / ROWS
    ));

    canvas.width  = COLS * CELL;
    canvas.height = ROWS * CELL;

    newMaze();
}


// 
//  GÉNÉRATION DU LABYRINTHE (DFS animé)
// 

function newMaze() {
    visited_path = [];
    generating   = true;
    document.getElementById('status').textContent = 'Génération en cours...';

    // Initialise toutes les cellules en tant que murs
    grid = new Array(COLS * ROWS).fill(true);

    ctx.fillStyle = C_WALL;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stack  = [];
    const startC = 1, startR = 1;

    function carve(c, r) {
        grid[idx(c, r)] = false;
        drawCell(c, r, C_VISITED);
        stack.push([c, r]);
    }

    carve(startC, startR);

    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];

    // Avance de 3 étapes par frame pour équilibrer vitesse et fluidité
    function step() {
        for (let i = 0; i < 3; i++) {
            if (stack.length === 0) {
                generating = false;
                player = { c: 1, r: 1 };
                visited_path.push({ c: 1, r: 1 });
                redrawAll();
                document.getElementById('status').textContent = 'Utilisez les flèches pour vous déplacer';
                return;
            }

            const [c, r] = stack[stack.length - 1];
            const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
            let moved = false;

            for (const [dc, dr] of shuffled) {
                const nc = c + dc, nr = r + dr;
                if (inBounds(nc, nr) && grid[idx(nc, nr)]) {
                    // Supprime le mur entre la cellule courante et la voisine
                    grid[idx(c + dc / 2, r + dr / 2)] = false;
                    drawCell(c + dc / 2, r + dr / 2, C_VISITED);
                    carve(nc, nr);
                    drawCell(nc, nr, C_CURRENT);
                    moved = true;
                    break;
                }
            }

            if (!moved) stack.pop();
        }

        requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}


// 
//  RENDU
// 

function redrawAll() {
    // Dessine chaque cellule selon son type
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawCell(c, r, grid[idx(c, r)] ? C_WALL : C_PATH);
        }
    }

    // Superpose le tracé du joueur
    visited_path.forEach(p => {
        ctx.fillStyle = gameData.couleur;
        ctx.fillRect(p.c * CELL, p.r * CELL, CELL, CELL);
    });

    drawEnd();
    drawPlayer();
}

function drawCell(c, r, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
}

function drawPlayer() {
    ctx.fillStyle = C_PLAYER;
    ctx.beginPath();
    ctx.arc(player.c * CELL + CELL / 2, player.r * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawEnd() {
    ctx.fillStyle = C_END;
    ctx.fillRect((COLS - 2) * CELL + 4, (ROWS - 2) * CELL + 4, CELL - 8, CELL - 8);
}

function updateChrono() {
    if (!startTime || generating) return;
    const elapsed  = Math.floor((performance.now() - startTime) / 1000);
    const minutes  = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secondes = String(elapsed % 60).padStart(2, '0');
    document.getElementById('chrono').textContent = `${minutes}:${secondes}`;
}


// 
//  BOUCLE DE JEU
// 

function boucle() {
    moteur();
    afficher();
    window.requestAnimationFrame(boucle);
}

function moteur() {
    if (generating || isUiBlocked()) return;

    const temps2 = performance.now();
    const duree  = temps2 - temps1;
    temps1 = temps2;

    moveTimer += duree;
    if (moveTimer < MOVE_DELAY) return;
    moveTimer = 0;

    if (up)    move(0, -1);
    if (down)  move(0,  1);
    if (left)  move(-1, 0);
    if (right) move(1,  0);
}

function afficher() {
    if (generating) return;
    redrawAll();
    updateChrono();
}


// 
//  DÉPLACEMENT DU JOUEUR
// 

function move(dc, dr) {
    if (generating || isUiBlocked()) return;

    const nc = player.c + dc;
    const nr = player.r + dr;

    if (!inBounds(nc, nr) || grid[idx(nc, nr)]) return;

    player.c = nc;
    player.r = nr;

    // Mémorise la position si elle n'a pas encore été visitée
    if (!visited_path.some(p => p.c === player.c && p.r === player.r))
        visited_path.push({ c: player.c, r: player.r });

    if (player.c === COLS - 2 && player.r === ROWS - 2)
        showEnd();
}


// 
//  TRUC UTILES EN PLUS
// 

// Convertit des coordonnées (col, row) en index dans le tableau 1D
function idx(c, r) { return r * COLS + c; }

// Vérifie qu'une cellule est dans les limites de la grille
function inBounds(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

function isUiBlocked() {
    return !document.getElementById('screen-start').classList.contains('hidden')
        || !document.getElementById('screen-end').classList.contains('hidden');
}


// 
//  CONTRÔLES CLAVIER
// 

window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':    up    = true; break;
        case 'ArrowLeft':  left  = true; break;
        case 'ArrowRight': right = true; break;
        case 'ArrowDown':  down  = true; break;
    }
});

window.addEventListener('keyup', e => {
    switch (e.key) {
        case 'ArrowUp':    up    = false; break;
        case 'ArrowLeft':  left  = false; break;
        case 'ArrowRight': right = false; break;
        case 'ArrowDown':  down  = false; break;
    }
});


// 
//  CONTRÔLES TACTILES / SOURIS
// 

// Lie un bouton directionnel à un setter booléen (pression maintenue)
function bindBtn(id, setter) {
    const el  = document.getElementById(id);
    const on  = () => setter(true);
    const off = () => setter(false);

    el.addEventListener('mousedown',   on);
    el.addEventListener('mouseup',     off);
    el.addEventListener('mouseleave',  off);
    el.addEventListener('touchstart',  e => { e.preventDefault(); on();  }, { passive: false });
    el.addEventListener('touchend',    e => { e.preventDefault(); off(); }, { passive: false });
    el.addEventListener('touchcancel', off);
}

bindBtn('btn-up',    v => up    = v);
bindBtn('btn-left',  v => left  = v);
bindBtn('btn-right', v => right = v);
bindBtn('btn-down',  v => down  = v);


// 
//  SÉLECTEUR DE DIFFICULTÉ (en cours de partie)
// 

document.querySelector('#btn-facile').addEventListener('click',    () => choixNiv('facile'));
document.querySelector('#btn-moyen').addEventListener('click',     () => choixNiv('moyen'));
document.querySelector('#btn-difficile').addEventListener('click', () => choixNiv('difficile'));


// 
//  ÉCRAN D'ACCUEIL
// 

// Sélection du niveau avant de lancer la partie
document.querySelectorAll('#niveau-start button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#niveau-start button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedLevel = btn.id.replace('start-', '');
    });
});

document.getElementById('start-moyen').classList.add('selected');

document.getElementById('btn-jouer').addEventListener('click', () => {
    document.getElementById('screen-start').classList.add('hidden');
    document.getElementById('niveau').style.display = 'none';
    startGame();
});

document.getElementById('btn-home').addEventListener('click', () => {
    document.getElementById('screen-start').classList.remove('hidden');
    document.getElementById('screen-end').classList.add('hidden');
    document.getElementById('niveau').style.display = 'flex';
});


// 
//  ÉCRAN DE FIN DE PARTIE
// 

function showEnd() {
    const elapsed  = Math.floor((performance.now() - startTime) / 1000);
    const minutes  = Math.floor(elapsed / 60);
    const secondes = elapsed % 60;
    document.getElementById('end-temps').textContent =
        `Temps : ${minutes > 0 ? minutes + 'min ' : ''}${secondes}s`;
    document.getElementById('screen-end').classList.remove('hidden');
}

document.getElementById('btn-rejouer').addEventListener('click', () => {
    document.getElementById('screen-end').classList.add('hidden');
    document.getElementById('screen-start').classList.remove('hidden');
});

document.getElementById('btn-next-game').addEventListener('click', () => {
    window.location.href = '../messages.html?step=3';
});

function startGame() {
    choixNiv(selectedLevel);
    startTime = performance.now();
}

function pushMessage(targetId, from, text) {
    const list = document.getElementById(targetId);
    const bubble = document.createElement('div');
    bubble.className = `msg ${from === 'h' ? 'msg-h' : 'msg-j'}`;
    bubble.textContent = text;
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
}

function clearSessionUi(session) {
    document.getElementById(session.messagesId).innerHTML = '';
    document.getElementById(session.choicesId).innerHTML = '';
}

function startChatSession(key) {
    const session = CHAT_SESSIONS[key];
    activeChatSession = key;
    clearSessionUi(session);

    const screen = document.getElementById(session.screenId);
    const history = document.getElementById(session.historyId);
    const messages = document.getElementById(session.messagesId);
    const choices = document.getElementById(session.choicesId);
    const action = document.getElementById(session.actionId);

    screen.classList.remove('hidden');
    history.classList.remove('hidden');
    messages.classList.add('hidden');
    choices.classList.add('hidden');
    action.classList.add('hidden');
    action.textContent = session.actionLabel;

    const revealMessages = () => {
        history.classList.add('hidden');
        messages.classList.remove('hidden');
        playHenrietteLines(session, 0);
        screen.removeEventListener('click', revealMessages);
    };
    screen.addEventListener('click', revealMessages);
}

function playHenrietteLines(session, index) {
    if (activeChatSession === null) return;
    if (index >= session.lines.length) {
        showChoices(session);
        return;
    }
    pushMessage(session.messagesId, session.lines[index].from, session.lines[index].text);
    window.setTimeout(() => playHenrietteLines(session, index + 1), 700);
}

function showChoices(session) {
    const choices = document.getElementById(session.choicesId);
    choices.classList.remove('hidden');
    choices.innerHTML = '';

    session.choices.forEach(choiceText => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choiceText;
        btn.addEventListener('click', () => {
            pushMessage(session.messagesId, 'j', choiceText);
            choices.classList.add('hidden');
            showChatAction(session);
        });
        choices.appendChild(btn);
    });
}

function showChatAction(session) {
    const action = document.getElementById(session.actionId);
    action.classList.remove('hidden');
}

document.getElementById('btn-launch-intro').addEventListener('click', () => {
    activeChatSession = null;
    document.getElementById('screen-chat-intro').classList.add('hidden');
    startGame();
});

document.getElementById('btn-launch-outro').addEventListener('click', () => {
    activeChatSession = null;
    document.getElementById('screen-chat-outro').classList.add('hidden');
    document.getElementById('screen-end').classList.remove('hidden');
});


// 
//  DÉMARRAGE
// 

choixNiv('moyen');
boucle();