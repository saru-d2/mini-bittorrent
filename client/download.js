const net = require('net');
const fs = require('fs');

const tracker = require('./tracker');
const message = require('./message');
const torrent_utils = require('./torrent_utils');
const Pieces = require('./Pieces');
const Queue = require('./Queue');



function download(peer, torrent, pieces, file) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    const socket = new net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {
        socket.write(message.buildHandshake(torrent));
    });
    const queue = new Queue(torrent);
    // onMsg(socket, msg => handle_msg(msg, socket, pieces, queue, torrent, file));
    socket.on('data', recvBuf => {
        // msgLen calculates the length of a whole message
        const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        savedBuf = Buffer.concat([savedBuf, recvBuf]);

        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
            // callback(savedBuf.slice(0, msgLen()));
            handle_msg(savedBuf.slice(0, msgLen()), socket, pieces, queue, torrent, file);
            savedBuf = savedBuf.slice(msgLen());
            handshake = false;
        }
    });
}



function handle_msg(msg, socket, pieces, queue, torrent, file) {
    if (msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1, 20) === 'BitTorrent protocol') {
        socket.write(message.buildInterested());
    } else {
        const m = message.parse(msg);

        if (m.id === 0) socket.end(); // choke
        if (m.id === 1) { queue.choked = false; requestPiece(socket, pieces, queue); } // unchoke
        if (m.id === 4) // have Handler
        {
            const pieceIndex = m.payload.readUInt32BE(0);
            const queueEmpty = queue.length === 0;
            queue.queue(pieceIndex);
            if (queueEmpty) requestPiece(socket, pieces, queue);
        }
        if (m.id === 5) {
            const queueEmpty = queue.length === 0;
            m.payload.forEach((byte, i) => {
                for (let j = 0; j < 8; j++) {
                    if (byte % 2) queue.queue(i * 8 + 7 - j);
                    byte = Math.floor(byte / 2);
                }
            });
            if (queueEmpty) requestPiece(socket, pieces, queue);
        }
        if (m.id === 7) handlePiece(socket, pieces, queue, torrent, file, m.payload);
    }
}


function handlePiece(socket, pieces, queue, torrent, file, pieceResp) {
    pieces.printPercentDone();
    pieces.addReceived(pieceResp);

    fs.write(file, pieceResp.block, 0, pieceResp.block.length, pieceResp.index * torrent.info['piece length'] + pieceResp.begin, () => { });

    if (!pieces.isDone()) {
        requestPiece(socket, pieces, queue);
        return;
    }
    // console.log('handle_piece done');
    socket.end();
    try { fs.closeSync(file); } catch (e) { }
}

function requestPiece(socket, pieces, queue) {
    if (!queue.choked)
        while (queue.length()) {
            const pieceBlock = queue.deque();
            if (pieces.needed(pieceBlock)) {
                socket.write(message.buildRequest(pieceBlock));
                pieces.addRequested(pieceBlock);

                break;
            }
        }

    else
        return null;
}

module.exports = (torrent, path) => {
    tracker.getPeers(torrent, peers => {
        const pieces = new Pieces(torrent);
        const file = fs.openSync(path, 'w');
        peers.forEach(peer => download(peer, torrent, pieces, file));
    });
};