const { log } = require('console');
const express = require('express');
const cors = require('cors')
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Autorise uniquement les requêtes provenant de cette origine
    methods: ["GET", "POST"] // Autorise uniquement les méthodes GET et POST
  }
});

app.use(cors())

let connectedPlayers = 0; // Variable pour compter le nombre de joueurs connectés

let model = {
    IdTireur: "",
    IdGardien: "",
    round: 0,
    choixTireur: 0,
    choixGardien: 0,
    tabRoundTireur: [0, 0, 0],
    tabRoundGardien: [0, 0, 0],
    scoreTireur: 0,
    scoreGardien: 0, 
    restartTireur: false,
    restartGardien: false
}

let restartModel = {
    IdTireur: "",
    IdGardien: "",
    round: 0,
    choixTireur: 0,
    choixGardien: 0,
    tabRoundTireur: [0, 0, 0],
    tabRoundGardien: [0, 0, 0],
    scoreTireur: 0,
    scoreGardien: 0, 
    restartTireur: false,
    restartGardien: false
}

io.on('connection', (socket) => {
    console.log(socket.id)
    let score = {scoreGardien : model.scoreGardien, scoreTireur : model.scoreTireur}

    model = restartModel
    console.log('Un client est connecté');
    connectedPlayers++;
    if (model.IdGardien === "") {
        model.IdGardien = socket.id;
        socket.emit('response', 'Gardien');
        socket.emit("score", score)
    } 
    // Si le rôle de tireur n'est pas attribué, attribuez-le
    else if (model.IdTireur === "") {
        model.IdTireur = socket.id;
        socket.emit('response', 'Tireur');
    } 
    // Si tous les rôles sont déjà attribués, informez le client qu'il n'y a pas de place disponible
    else {
        console.log("Trop de joueurs, impossible d'attribuer un rôle.");
        socket.emit('response', 'Aucune place disponible');
    }

    io.emit('playerCount', connectedPlayers); // Envoyer le nombre de joueurs connectés à tous les clients

    socket.on('disconnect', () => {
        if (model.IdGardien === socket.id) {

            model.IdGardien = ""
            model.choixGardien = 0
            model.tabRoundGardien = [0, 0, 0]
            model.scoreGardien = 0
            model.restartGardien = false
        }
        if (model.IdTireur === socket.id) {

            model.IdTireur = ""
            model.choixTireur = 0
            model.tabRoundTireur = [0, 0, 0]
            model.scoreTireur = 0
            model.restartTireur = false
        }
        console.log('Un client s\'est déconnecté');
        connectedPlayers--;
        io.emit('playerCount', connectedPlayers); // Mettre à jour le nombre de joueurs connectés lorsqu'un joueur se déconnecte
    });
    
    // Vérifier si deux joueurs sont connectés
    if (connectedPlayers === 2) {

        // Début du jeu
        console.log('Début du jeu');
        model.round = 1
        let score = {scoreGardien : model.scoreGardien, scoreTireur : model.scoreTireur}

        io.emit('score', score,  model.round)


        socket.on('choixJoueur', (choice) => {

            if(model.IdGardien == socket.id){
                if(model.choixGardien == 0){
                    model.choixGardien = choice;
                    console.log("Choix gardien : " +  model.choixGardien);
                    io.emit("AttenteJoueur", "tireur" )
                }else{
                    io.emit("AttenteJoueur", "gardien" )
                }
            }

            if(model.IdTireur == socket.id){
                if(model.choixTireur == 0){
                    model.choixTireur = choice;
                    console.log("Choix tireur : " +  model.choixTireur);
                    io.emit("AttenteJoueur", "gardien" )
                    
                }else{
                    io.emit("AttenteJoueur", "tireur" )
                }
            }

            if(model.choixGardien != 0 && model.choixTireur != 0){
                console.log("### BEFORE TIMEOUT DATA BACK ANIM END : " + model.choixGardien + " " + model.choixTireur)
                console.log("ANIMATION : envoi de l'anim !")
                console.log("DATA BACK ANIM END : " + model.choixGardien + " " + model.choixTireur)
                io.emit("anim-end", model.choixGardien, model.choixTireur)
                io.emit("AttenteJoueur", "" )
                if(model.round < 4){
                    if(model.choixGardien == model.choixTireur){
                        model.tabRoundGardien[model.round-1] = 2
                        model.tabRoundTireur[model.round-1] = 0
                    }else{
                        model.tabRoundGardien[model.round-1] = 0
                        model.tabRoundTireur[model.round-1] = 1
                    }
                    console.log(model.tabRoundGardien)
                    console.log(model.tabRoundTireur)
    
                    model.choixGardien = 0
                    model.choixTireur = 0

                    model.round ++

                    model.scoreGardien = 0
                    model.tabRoundGardien.forEach((element, index) => {
                        model.scoreGardien += element;
                    });
                    
                    model.scoreTireur = 0
                    model.tabRoundTireur.forEach((element, index) => {
                        model.scoreTireur += element;
                    });
                    
                    let score = {scoreGardien : model.scoreGardien, scoreTireur : model.scoreTireur}
                    io.emit('score', score)

                    if (model.round == 4) {
                                            
                        if (model.scoreGardien > model.scoreTireur) {
                            io.to(model.IdGardien).emit('win', score); // Utilisation correcte de io.to().emit() pour émettre l'événement à un socket spécifique
                            io.to(model.IdTireur).emit('loose', score);
                        } else if (model.scoreGardien < model.scoreTireur) {
                            io.to(model.IdGardien).emit('loose', score);
                            io.to(model.IdTireur).emit('win', score);
                        } else {
                            io.to(model.IdGardien).emit('egality', score);
                            io.to(model.IdTireur).emit('egality', score);
                        }
                    }
                    
                
                }
            }
        });

        socket.on('restart', () =>{
            if(socket.id == model.IdGardien){
                model.restartGardien = true
                if(model.restartTireur != true){
                    io.emit("Restart?", "1/2")  
                }else{
                    io.emit("Restart?", "2/2")
                    setTimeout(() => {
                        model = restartModel
                        io.emit("score", score)
                        io.emit("RESTART")
                    }, 2000)
                    
                }
                
            }else if(socket.id == model.IdTireur){
                model.restartTireur = true
                if(model.restartGardien != true){
                    io.emit("Restart?", "1/2")  
                }else{
                    io.emit("Restart?", "2/2")
                    setTimeout(() => {
                        model = restartModel
                        io.emit("score", score)
                        io.emit("RESTART")
                    }, 2000)
                   
                }
            }

            if(model.restartGardien == true && model.restartTireur == true){
                model = restartModel
            }
        })


    }
});

server.listen(5100, () => {
    console.log('Serveur en cours d\'écoute sur le port 5100');
});
