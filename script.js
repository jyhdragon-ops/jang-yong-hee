const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-button');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

// Set canvas dimensions
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Colors for tetrominoes
const COLORS = [
    null,
    '#38bdf8', // I - Cyan
    '#3b82f6', // J - Blue
    '#f97316', // L - Orange
    '#fbbf24', // O - Yellow
    '#22c55e', // S - Green
    '#a855f7', // T - Purple
    '#ef4444'  // Z - Red
];

// Tetromino definitions
const PIECES = [
    [],
    // I
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    // J
    [[2,0,0], [2,2,2], [0,0,0]],
    // L
    [[0,0,3], [3,3,3], [0,0,0]],
    // O
    [[4,4], [4,4]],
    // S
    [[0,5,5], [5,5,0], [0,0,0]],
    // T
    [[0,6,0], [6,6,6], [0,0,0]],
    // Z
    [[7,7,0], [0,7,7], [0,0,0]]
];

let board = [];
let piece = null;
let score = 0;
let gameInterval = null;
let gameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function createBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBlock(x, y, colorIndex) {
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#020617';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Slight inner highlight for 3D effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE * 0.2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE * 0.8, BLOCK_SIZE, BLOCK_SIZE * 0.2);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    ctx.strokeStyle = '#1e293b';
    for(let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
    }
    for(let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    // Draw settled pieces
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
                drawBlock(c, r, board[r][c]);
            }
        }
    }

    // Draw active piece
    if (piece) {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    drawBlock(piece.x + c, piece.y + r, piece.shape[r][c]);
                }
            }
        }
    }
}

function spawnPiece() {
    const typeId = Math.floor(Math.random() * 7) + 1;
    piece = {
        shape: PIECES[typeId],
        x: Math.floor(COLS / 2) - Math.floor(PIECES[typeId][0].length / 2),
        y: 0
    };

    // If starting position collides, game over
    if (collide()) {
        gameOver = true;
        cancelAnimationFrame(gameInterval);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        startButton.innerText = 'RESTART';
        startButton.disabled = false;
    }
}

function collide() {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                let newX = piece.x + c;
                let newY = piece.y + r;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX] !== 0)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function mergePiece() {
    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] !== 0) {
                if (piece.y + r >= 0) {
                    board[piece.y + r][piece.x + c] = piece.shape[r][c];
                }
            }
        }
    }
    clearLines();
    spawnPiece();
}

function clearLines() {
    let linesCleared = 0;
    outer: for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 0) continue outer;
        }

        const row = board.splice(r, 1)[0].fill(0);
        board.unshift(row);
        r++; // Check the new row that dropped down
        linesCleared++;
    }

    if (linesCleared > 0) {
        const scores = [0, 100, 300, 500, 800];
        score += scores[linesCleared];
        scoreElement.innerText = score;
        dropInterval = Math.max(100, 1000 - (score / 10)); // Speed up
    }
}

function moveDown() {
    piece.y++;
    if (collide()) {
        piece.y--;
        mergePiece();
    }
    dropCounter = 0;
}

function moveLeft() {
    piece.x--;
    if (collide()) {
        piece.x++;
    }
}

function moveRight() {
    piece.x++;
    if (collide()) {
        piece.x--;
    }
}

function rotate() {
    const originalShape = piece.shape;
    const N = piece.shape.length;
    let rotated = Array.from({ length: N }, () => Array(N).fill(0));
    
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            rotated[c][N - 1 - r] = piece.shape[r][c];
        }
    }
    
    piece.shape = rotated;
    if (collide()) {
        piece.shape = originalShape; // Revert if collides
    }
}

function hardDrop() {
    while (!collide()) {
        piece.y++;
    }
    piece.y--;
    mergePiece();
    dropCounter = 0;
}

function update(time = 0) {
    if (gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        moveDown();
    }

    drawBoard();
    gameInterval = requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    // Only handle gameplay keys when game is active
    if (gameOver || !piece) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault(); // Prevent page scrolling
    }

    if (event.key === 'ArrowLeft') {
        moveLeft();
        drawBoard();
    } else if (event.key === 'ArrowRight') {
        moveRight();
        drawBoard();
    } else if (event.key === 'ArrowDown') {
        moveDown();
        drawBoard();
    } else if (event.key === 'ArrowUp') {
        rotate();
        drawBoard();
    } else if (event.key === ' ') { // Space
        hardDrop();
        drawBoard();
    }
});

startButton.addEventListener('click', () => {
    if (startButton.innerText === 'RESTART') {
        score = 0;
        scoreElement.innerText = 0;
        dropInterval = 1000;
        gameOver = false;
    }
    
    startButton.disabled = true;
    createBoard();
    spawnPiece();
    lastTime = performance.now();
    update();
});

// Initial empty board draw
createBoard();
drawBoard();
