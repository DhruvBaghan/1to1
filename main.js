let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let loginPage = document.getElementById('loginPage');
let chatPage = document.getElementById('chatPage');
let callStatus = document.getElementById('callStatus');
const socket = io();

let localStream;
let peerConnection;
const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Google's free STUN server
        }
    ]
};

// Login function
function login() {
    const username = document.getElementById('username').value.trim();
    if (username.length > 0) {
        socket.emit('login', username);
        loginPage.style.display = 'none';
        chatPage.style.display = 'block';
    }
}

// When logged in successfully
socket.on('logged', function() {
    callStatus.textContent = 'Logged in successfully. Waiting for connection...';
});

// Get media stream from user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
        socket.emit('ready'); // Notify server when media is ready
        callStatus.textContent = 'Media ready. Waiting for connection...';
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
        callStatus.textContent = 'Error accessing media devices.';
    });

// Handle offer from another peer
socket.on('offer', (offer) => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.addStream(localStream);

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('answer', answer);
        });

    peerConnection.onaddstream = (event) => {
        remoteVideo.srcObject = event.stream;
    };
});

// Handle answer from another peer
socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle ICE candidates
socket.on('candidate', (candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection.addIceCandidate(iceCandidate);
});

// Initiate WebRTC connection
socket.on('ready', () => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(config);
        peerConnection.addStream(localStream);

        peerConnection.onaddstream = (event) => {
            remoteVideo.srcObject = event.stream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('offer', offer);
            });
    }
});

// Add event listeners for the mute audio and toggle video buttons
document.getElementById('muteAudio').addEventListener('click', () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    document.getElementById('muteAudio').textContent = localStream.getAudioTracks()[0].enabled ? 'Mute Audio' : 'Unmute Audio';
});

document.getElementById('toggleVideo').addEventListener('click', () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    document.getElementById('toggleVideo').textContent = localStream.getVideoTracks()[0].enabled ? 'Toggle Video' : 'Enable Video';
});
