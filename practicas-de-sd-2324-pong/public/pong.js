'use strict'

// Constantes básicas del juego
const FRAME_PER_SECOND = 50;

const NUM_BALLS = 5;

const BG_COLOR = 'BLACK';

const FONT_COLOR = 'GREEN';
const FONT_SCORE_COLOR = 'WHITE';
const FONT_GAME_OVER_COLOR = 'BLUE';
const FONT_FAMILY = 'impact';
const FONT_SIZE = '45px';

const NET_COLOR = 'WHITE';
const NET_WIDTH = 4;
const NET_HEIGHT = 10;
const NET_PADDING = 15;

const PADDLE_RIGHT_COLOR = 'WHITE';
const PADDLE_LEFT_COLOR = 'WHITE';
const PADDLE_ACTIVE_COLOR = 'RED';
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;

const BALL_COLOR = 'WHITE';
const BALL_RADIUS = 10;
const BALL_DELTA_VELOCITY = 0.5;
const BALL_VELOCITY = 5;

const gameStateEnum = {
    SYNC: 0,
    PLAY: 1,
    PAUSE: 2,
    END: 3,
};

//--------------------------------------------------------------------------------------
// CLIENTE WEBSOCKET (del Network Engine)
//--------------------------------------------------------------------------------------

const  WEBSOCKET_SERVER = ''; // ws://127.0.0.1:3000
let socket;

function initServerConnection(){
    // Iniciamos la conexion con el servidor (Motor de red)
    socket = io(WEBSOCKET_SERVER);

    // Solicitamos la incorporacion del jugador
    socket.emit('new player');

    // Indicamos como atender una nueva conexion
    socket.on('connect' , ()=>{
        console.log(`Conexion de ${socket.id}`);
    });

    socket.on('state', update);
}

//--------------------------------------------------------------------------------------
// MOTOR DE JUEGO
//--------------------------------------------------------------------------------------

// Manejador de eventos del raton (handle del raton)
function initPaddleMovement(){
    cvs.addEventListener("mousemove",(event) => {
        if(gameState !== gameStateEnum.PLAY) return;

        const rect = cvs.getBoundingClientRect();

        const localPlayer = players[socket.id];
        localPlayer.y = event.clientY - localPlayer.height/2 - rect.top;
        socket.emit('move player', localPlayer.y);
    });
}

const CANVAS_WIDTH = cvs.width;
const CANVAS_HEIGHT = cvs.height;

// OBJETOS DEL JUEGO -------------------------------------------------------------------

// Declaramos los objetos del juego
let gameState = gameStateEnum.SYNC;
let players = {};
let ball = {};

// BUCLE DEL JUEGO-----------------------------------------------------------------------

function update(gameObjects){
    players = gameObjects.players;
    ball = gameObjects.ball;
    gameState = gameObjects.gameState;

    players[socket.id].color = PADDLE_ACTIVE_COLOR;
}

function render() {
    if (gameState === gameStateEnum.PAUSE) {
        drawText('PAUSA', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
        return;
    }


    if (gameState === gameStateEnum.SYNC) {
        drawText('Esperando rival...', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
        return;
    }

    if (gameState === gameStateEnum.PLAY) {
        drawBoard();
        drawScore(players);
        for (let id in players) {
            drawPaddle(players[id]);
        }
        drawBall(ball);
    }
    if (gameState === gameStateEnum.END) {
        drawBoard();
        drawScore(players);
        for (let id in players) {
            drawPaddle(players[id]);
        }
        drawText('GAME OVER', CANVAS_WIDTH/3, CANVAS_HEIGHT/2);
    }
}

function next() {
    //si ha terminado la partida
    if (gameState === gameStateEnum.END) {
        console.log('Game over');
        stopGameLoop();
        socket.disconnect();
        return;
    }

    // if ((getPlayer(0).score >= NUM_BALLS) || (getPlayer(1).score >= NUM_BALLS)) {
    //     gameState = gameStateEnum.END;
    // }
}


function gameLoop() {
    render();
    next();
}

let gameLoopId;

function initGameLoop() {
    gameLoopId = setInterval(gameLoop, 1000 / FRAME_PER_SECOND);
    // gameState = gameStateEnum.PLAY;
}

function stopGameLoop() {
    clearInterval(gameLoopId);
}


//------------------------------------------------------------------------------------------
// Inicializacion del Motor del Juego
//------------------------------------------------------------------------------------------


function init() {
    initServerConnection();
    drawBoard();
    initGameLoop();
    initPaddleMovement();
}

//Punto de entrada del juego
init();