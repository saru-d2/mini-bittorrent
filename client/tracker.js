'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');
const torrentParser = require('./torrent-parser');
const util = require('./util');

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket('udp4');

  let assoc = {}

  if ('announce-list' in torrent) {
    for (const url of torrent['announce-list']) {
      // console.log(url.toString('utf-8'))
      var urlCorrected = Array.isArray(url) ? url[0] : url;
      var ret = buildConnReq();
      assoc[ret.tid.readInt32BE()] = urlCorrected.toString('utf-8')
      try {
        udpSend(socket, ret.buf, urlCorrected.toString('utf-8'));
      } catch {
        continue
      }
    }
  }
  if ('announce' in torrent) {
    const url = torrent.announce.toString('utf8');
    var urlCorrected = Array.isArray(url) ? url[0] : url;
    var ret = buildConnReq();
    assoc[ret.tid.readInt32BE()] = urlCorrected.toString('utf-8')
    try {
      udpSend(socket, ret.buf, urlCorrected.toString('utf-8'));
    } catch {}
  }

  
  // udpSend(socket, buildConnReq(), url);
  var isOne = false;

  socket.on('message', response => {
    if (respType(response) === 'connect') {
      const connResp = parseConnResp(response);
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      if (assoc[connResp.transactionId]) {
        // console.log(announceReq, assoc[connResp.transactionId])
        udpSend(socket, announceReq, assoc[connResp.transactionId]);
      }
    } else if (respType(response) === 'announce' && !isOne) {
      const announceResp = parseAnnounceResp(response);
      // isOne = true
      callback(announceResp.peers);
    }
  });
};

function udpSend(socket, message, rawUrl, callback=()=>{}) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.hostname, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
}

function buildConnReq() {
  const buf = Buffer.allocUnsafe(16);

  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);

  // action
  buf.writeUInt32BE(0, 8);

  // transaction id
  var tid = crypto.randomBytes(4)
  tid.copy(buf, 12);

  return {
    buf, tid // Use TID to keep track of URL for using to announce after connect
  };
}

function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}

function buildAnnounceReq(connId, torrent, port=6881) {
  const buf = Buffer.allocUnsafe(98);

  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);
  // peerId
  util.genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  torrentParser.size(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);

  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}