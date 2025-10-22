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

// -----------------------------------------------
// SERVIDOR DE JUEGO: Servidor web + Servidor de Websocket (Motor de Red)
// -----------------------------------------------

// Incluimos las bibliotecas
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;

// Servidor web -----------------------------------------------------------

// Iniciamos un servidor http para proporcionar la interfaz (frontend) del juego
function initWebServer(){
    // Configuramos la carpeta publica
    app.use(express.static(__dirname + '/public'));

    // Configuramos la pagina por defecto
    app.get('/',(req,res)=>{
        res.sendFile(__dirname + '/index.html');
    });

    // Lanzamos el servidor
    server.listen(port,()=>{
        console.log(`Game Server running on port ${port}`);
    });
}

// Servidor webSocket -------------------------------------------------------

// Iniciamos el servidor webSocket (Motor de Red)
function initNetworkEngine(){
    // Definir la interaccion con el cliente del juego (interfaz)
    io.on('connection' , (socket)=>{
        console.log(`Nuevo jugador que quiere entrar: ${socket.id}`);
        
        socket.on('new player', ()=>{
            // Calculamos el numero de jugadores a partir de players
            const numberOfPlayers = Object.keys(players).length;

            // Atendemos el evento
            onNewPlayer(socket, numberOfPlayers);
        });

        socket.on('move player', (data)=>{
            let player = players[socket.id];
            player.y = data;
        });

        socket.on('disconnect', ()=>{
            console.log(`Player ${socket.id} disconnected`);
            delete players[socket.id];
        });

    });
}

function sendStatus(){
    io.emit('state', { players, ball, gameState });
}

//--------------------------------------------------------------------------------------
// MOTOR DE RED (NETWORK ENGINE)
//--------------------------------------------------------------------------------------

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// GENERIC HELPERS-----------------------------------------------------------------------

function getRandomDirection() {
    return Math.floor(Math.random() * 2) === 0 ? -1 : 1;
}

function getPlayer(index) {
    return Object.values(players).find(player=>
        (index===0 && player.x===0 || index!==0 && player.x!==0)
    )

}

// OBJETOS DEL JUEGO -------------------------------------------------------------------

// Declaramos los objetos del juego
let gameState = gameStateEnum.SYNC;
let players = {};
let ball = {};

// Inicializamos los objetos del juego y el juego
function onNewPlayer(socket, numberOfPlayers) {
    console.log(`Solicitud de juego para ${socket.id}`);
    console.log(`Por el momento habia ${numberOfPlayers} jugadores registrados`);

    if(numberOfPlayers === 0){
        console.log(`Dando de alta al jugador A con indice ${numberOfPlayers}:${socket.id}`);
        players[socket.id] = {
            x: 0,
            y: CANVAS_HEIGHT/2 - PADDLE_HEIGHT/2,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            color: PADDLE_LEFT_COLOR,
            score: 0
        };
    }

    if(numberOfPlayers === 1){
        console.log(`Dando de alta al jugador B con indice ${numberOfPlayers}:${socket.id}`);
        players[socket.id] = {
            x: CANVAS_WIDTH - PADDLE_WIDTH,
            y: CANVAS_HEIGHT/2 - PADDLE_HEIGHT/2,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            color: PADDLE_RIGHT_COLOR,
            score: 0
        };
        
        console.log('Ya hay dos jugadores...');
        console.log('Generando una pelota nueva...');
        newBall(true);

        console.log('Iniciando el bucle de juego');
        initGameLoop();
    }

    if(numberOfPlayers>=2){
        console.log('Demasiados jugadores. Espere su turno');
        socket.disconnect();
    }
}

function newBall(init = false) {
    //Si la pelota ya estaba definida es que viene de un gol
    const directionX = init ? getRandomDirection() : (ball.velocityX > 0 ? -1 : 1);
    ball = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: BALL_RADIUS,
        speed: BALL_VELOCITY,
        velocityX: BALL_VELOCITY * directionX,
        velocityY: BALL_VELOCITY * getRandomDirection(),
        color: BALL_COLOR
    };
}

// BUCLE DEL JUEGO-----------------------------------------------------------------------

//UPDATE HELPERS

function collision(b,p){
    //calcular el collider de la pelota
    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;
        
    //Calcular el collider de la pala
    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;
    
    return b.right > p.left && b.bottom > p.top && b.left < p.right && b.top < p.bottom; 
}

// //IA del juego
// const COMPUTER_LEVEL = 0.1;

// function updateNPC() {
//     const npc = getPlayer(1);

//     npc.y += (ball.y - (npc.y + npc.height / 2)) * COMPUTER_LEVEL;
// }


function update() {
    //Si no estamo en modo PLAY, saltamos la actualizacion
    if (gameState != gameStateEnum.PLAY) {
        return;
    }

    //PLayer: actualizamos la posicion de la pelota
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    //Actualizamos la posicion de la IA
    // updateNPC();

    //Si la pelota golpea los laterales del campo rebotará
    const ballBottom = ball.y + ball.radius;
    const ballTop = ball.y - ball.radius;
    if (ballBottom > CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - ball.radius;
        ball.velocityY = -ball.velocityY;
    } else if (ballTop < 0) {
        ball.y = ball.radius;
        ball.velocityY = -ball.velocityY;
    }

    //verificamos si la pelota golpea alguna pala
    let whatPlayer = (ball.x < CANVAS_WIDTH / 2) ? getPlayer(0) : getPlayer(1);

    if (collision(ball, whatPlayer)) {
        // calculamos donde golpea la pelota en la pala
        let collidePoint = ball.y - (whatPlayer.y + whatPlayer.height / 2);

        // Normalizamos el punto de colision
        collidePoint /= (whatPlayer.height / 2);

        // Calculamos el angulo de rebote (en radianes)
        const angleRad = collidePoint * Math.PI / 4;

        // calculamos el sentido de la pelota en la direccion x
        const direction = (ball.x < CANVAS_WIDTH / 2) ? 1 : -1;

        // Calculamos la velocidad de la pelota en los ejes x e y
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // Cada vez que la bola golpea la pala se incrementa la velocidad
        ball.speed += BALL_DELTA_VELOCITY;
    }

    //Si la pelota se fue por la izquierda
    if (ball.x - ball.radius < 0) {
        console.log('Gol para el jugador de la derecha');
        getPlayer(1).score++;
        newBall();
    } else if (ball.x + ball.radius > CANVAS_WIDTH) {
        console.log('Gol para el jugador de la izquierda');
        getPlayer(0).score++;
        newBall();
    }

    sendStatus();
}

// function render() {
//     if (gameState === gameStateEnum.PAUSE) {
//         drawText('PAUSA', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
//         return;
//     }


//     if (gameState === gameStateEnum.SYNC) {
//         drawText('Esperando rival...', CANVAS_WIDTH / 4, CANVAS_HEIGHT / 2);
//         return;
//     }

//     if (gameState === gameStateEnum.PLAY) {
//         drawBoard();
//         drawScore(players);
//         for (let id in [0, 1]) {
//             drawPaddle(getPlayer(id));
//         }
//         drawBall(ball);
//     }
//     if (gameState === gameStateEnum.END) {
//         drawBoard();
//         drawScore(players);
//         for (let id in players) {
//             drawPaddle(getPlayer(id));
//         }
//         drawText('GAME OVER', CANVAS_WIDTH / 3, CANVAS_HEIGHT / 2);
//     }
// }

function next() {
    //si ha terminado la partida
    if (gameState === gameStateEnum.END) {
        console.log('Game over');
        stopGameLoop();
        return;
    }

    if ((getPlayer(0).score >= NUM_BALLS) || (getPlayer(1).score >= NUM_BALLS)) {
        gameState = gameStateEnum.END;
        sendStatus();
    }


}


function gameLoop() {
    update();
    // render();
    next();
}

let gameLoopId;

function initGameLoop() {
    gameLoopId = setInterval(gameLoop, 1000 / FRAME_PER_SECOND);
    gameState = gameStateEnum.PLAY;
    sendStatus();
}

function stopGameLoop() {
    clearInterval(gameLoopId);
}

// -----------------------------------------------
// Inicializacion del Servidor del Juego: Servidor web + Servidor webSocket (Motor de Red)
// -----------------------------------------------

function init(){
    initWebServer();
    initNetworkEngine();
}

// Punto de entrada al programa
init();