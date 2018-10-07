var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.PORT || 3003);

var clients = [];
var clientsInRoomGame = [];
var count = 0;
var roomName = "";
var numOfAccept = 0;
var countHero = 0;
var version = "1.2";

io.on("connection", function (socket)
{
    var currentUser;

    socket.on("USER_CONNECT", function ()
    {
        for(var i =0; i < clients.length; i++)
        {
            socket.emit("USER_CONNECTED", {name: clients[i].name});
            console.log("============ USER "+ clients[i].name +" CONNECT ============");
        }
    });

    socket.on("VERSION", function (data)
    {
        versionGame = {
            version: version,
        }
        socket.emit("VERSION", versionGame);
        console.log("VERSION: "+ version);
    });

    socket.on("PLAY", function (data)
    {
        currentUser = {
            name: data.name,
            room: "",
            numberID: 0,
            enemy: "",
            enemyDevice: "",
            isLive: true,
            device: "",
            tower: "",
            random: data.random,
        }

        clientsInRoomGame.push(currentUser)
        socket.emit("PLAY", currentUser);
        socket.broadcast.emit("USER_CONNECTED", currentUser);

        if(clientsInRoomGame.length == 1)
        {
            count += 1;
            roomName = "room-" + count;
            socket.join(roomName);
            currentUser.room = roomName;
            currentUser.numberID = 1;
            currentUser.tower = data.tower;
            currentUser.device = data.device;
        }
        else if(clientsInRoomGame.length == 2)
        {
            socket.join(roomName);
            currentUser.room = roomName;
            currentUser.numberID = 2;
            currentUser.tower = data.tower;
            currentUser.device = data.device;

            var playerVersus = {
                player1: clientsInRoomGame[0].name,
                player2: clientsInRoomGame[1].name,
                player1Device: clientsInRoomGame[0].device,
                player2Device: clientsInRoomGame[1].device,
                tower1: clientsInRoomGame[0].tower,
                tower2: clientsInRoomGame[1].tower,
                random: clientsInRoomGame[0].random,
                room: roomName
            }

            socket.emit("CREATE_ROOM", playerVersus);
            socket.broadcast.to(roomName).emit("CREATE_ROOM", playerVersus);
            clientsInRoomGame.splice(0, clientsInRoomGame.length);
        }
        clients.push(currentUser);

        console.log("PLAY GAME ============ USER: "+ currentUser.name +"-"+ data.device +" ============");
    });

    socket.on("ADD_ENEMY", function (data)
    {
        if(currentUser.name == data.player1)
        {
            currentUser.enemy = data.player2;
            currentUser.enemyDevice = data.player2Device;
        }
        else
        {
            currentUser.enemy = data.player1;
            currentUser.enemyDevice = data.player1Device;
        }

        console.log("ADD_ENEMY ============ USER: "+ currentUser.name +" ENEMY: "+ currentUser.enemy +" DEVICE: "+ currentUser.enemyDevice +" ============");
    });

    socket.on("ACCEPT", function (data)
    {
        numOfAccept++;
        if(numOfAccept == 2)
        {
            socket.emit("ACCEPT", data);
            socket.broadcast.to(data.room).emit("ACCEPT", data);
            numOfAccept = 0;
        }
        console.log("ACCEPT ============ USER: "+ currentUser.name +" NUMER OF ACCEPT: "+ numOfAccept +" ============");
    });

    socket.on("CREATE_HERO", function (data)
    {
        countHero++;
        data.position =  data.position + "_" + countHero;
        socket.emit("ADD_HERO_PLAYER", data);
        socket.broadcast.to(data.room).emit("ADD_HERO_ENEMY", data);
        console.log("CREATE_HERO ============ USER: "+ currentUser.name +" ROOM: "+ data.room +" PLAYERID: "+ data.playerID +" CREATE: "+ data.position +"============");
    });

    socket.on("ATTACK_HERO", function (data)
    {
        socket.emit("ATTACK_HERO", data);
        socket.broadcast.to(data.room).emit("ATTACK_HERO", data);
        console.log("ATTACK_HERO ============ USER: "+ currentUser.name +" ROOM: "+ data.room +" ATTACK: "+ data.attack +" TARGET: "+ data.target +" ============");
    });

    socket.on("SUB_HERO", function (data)
    {
        socket.emit("SUB_HERO", data);
        socket.broadcast.to(data.room).emit("SUB_HERO", data);
        console.log("SUB_HERO =========== USER: "+ currentUser.name +" ROOM: "+ data.room +" ATTACK: "+ data.attack +" TARGET: "+ data.target +" DAMGE: "+ data.damge  +" ============");
    });

    socket.on("DEALTH_HERO", function (data)
    {
        socket.emit("DEALTH_HERO", data);
        socket.broadcast.to(data.room).emit("DEALTH_HERO", data);
        console.log("DEALTH_HERO =========== USER: "+ currentUser.name +" ROOM: "+ data.room +" ============");

    });

    socket.on("RESULT", function (data)
    {
        console.log("============ USER: "+ currentUser.name +" ROOM: "+ data.room +" RESULT WIN: "+ data.name +"============");

        currentUser.isLive = false;
        socket.emit("RESULT", data);
        socket.broadcast.to(data.room).emit("RESULT", data);
    });

    socket.on("LEAVE_MATCH", function (data)
    {
        console.log("============ USER: "+ currentUser.name +" LEAVE MATCH ============");

        for (var i = 0; i < clients.length; i++)
        {
            if(clients[i].name == currentUser.name)
            {
                console.log("User "+clients[i].name + " dis game");
                socket.broadcast.to(clients[i].room).emit("LEAVE_MATCH", data);
                socket.leave(clients[i].room);
                socket.broadcast.to(clients[i].room).emit("USER_DISCONNECTED", currentUser);
                clients.splice(i,1);

                console.log(clientsInRoomGame.length +" == "+ 1 +" && "+ currentUser.room +" == "+ roomName)
                if(clientsInRoomGame.length == 1 && currentUser.room == roomName)
                {
                    clientsInRoomGame.splice(0, clientsInRoomGame.length);
                }
            }
        };
    });

    socket.on("LEAVE_ROOM", function (data)
    {
        console.log("============ USER: "+ currentUser.name +"  LEAVE ROOM ============");

        for (var i = 0; i < clients.length; i++)
        {
            if(clients[i].name == currentUser.name)
            {
                console.log("User "+clients[i].name + " leave room");
                socket.leave(clients[i].room);
                clients.splice(i,1);
            }
        };
    });

    socket.on("disconnect", function ()
    {
        for (var i = 0; i < clients.length; i++)
        {
            if(clients[i].name == currentUser.name)
            {
                console.log("============ USER: "+ clients[i].name +"  DISCONNNECT ============");

                if(clientsInRoomGame.length == 1 && currentUser.room == roomName)
                {

                    clientsInRoomGame.splice(0, clientsInRoomGame.length);
                    socket.broadcast.to(clients[i].room).emit("USER_DISCONNECTED", currentUser);
                }
                else
                {
                    if(currentUser.isLive == true)
                    {
                        socket.broadcast.to(clients[i].room).emit("RESULT", {name: currentUser.enemy, room: clients[i].room, device: currentUser.enemyDevice});
                    }
                }

                socket.leave(clients[i].room);
                clients.splice(i,1);
            }
        };
    });

    socket.on('uncaughtException', function (err) {
        console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
        console.error(err.stack)
        socket.exit(1)
    })
});

server.listen(app.get('port'), function (){
    console.log("============ SERVER IS RUNNING ============");
});
