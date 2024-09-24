const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let users = {}; // Keep track of connected users and their rooms

io.on('connection', (socket) => {
    console.log('A user connected.');

    // Handle login event
    socket.on('login', (username) => {
        if (Object.keys(users).length < 2) {
            users[socket.id] = { username, room: null };
            console.log(`${username} has logged in.`);
            socket.emit('logged');
            matchUsers();
        } else {
            socket.emit('full', 'Room is full. Please try again later.');
        }
    });

    // Try to match two users for a video call
    function matchUsers() {
        const userIDs = Object.keys(users);
        if (userIDs.length === 2) {
            const [user1ID, user2ID] = userIDs;
            const roomName = user1ID + '#' + user2ID;
            users[user1ID].room = roomName;
            users[user2ID].room = roomName;

            io.to(user1ID).emit('ready');
            io.to(user2ID).emit('ready');
        }
    }

    // Handle ready signal
    socket.on('ready', () => {
        const room = users[socket.id]?.room;
        if (room) {
            socket.join(room);
            socket.to(room).emit('ready');
        }
    });

    // Handle offer
    socket.on('offer', (offer) => {
        const room = users[socket.id]?.room;
        if (room) {
            socket.to(room).emit('offer', offer);
        }
    });

    // Handle answer
    socket.on('answer', (answer) => {
        const room = users[socket.id]?.room;
        if (room) {
            socket.to(room).emit('answer', answer);
        }
    });

    // Handle ICE candidate
    socket.on('candidate', (candidate) => {
        const room = users[socket.id]?.room;
        if (room) {
            socket.to(room).emit('candidate', candidate);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected.');
        const room = users[socket.id]?.room;
        socket.leave(room);
        delete users[socket.id];

        // Notify other user in the room about disconnection
        if (room) {
            socket.to(room).emit('disconnected', 'User has left the chat.');
        }
    });
});

http.listen(3000, () => {
    console.log('Server is running on port 3000');
});
