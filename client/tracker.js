"use strict";

const dgram = require("dgram");
const Buffer = require("buffer").Buffer;
const urlParse = require("url").parse;
const crypto = require("crypto");
const torrentParser = require("./torrent_utils");
const util = require("./util");

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket("udp4");

  let assoc = {};

  if ("announce-list" in torrent) {
    for (const url of torrent["announce-list"]) {
      // console.log(url.toString('utf-8'))
      var urlCorrected = Array.isArray(url) ? url[0] : url;
      var ret = buildConnReq();
      assoc[ret.tid.readInt32BE()] = urlCorrected.toString("utf-8");
      try {
        udpSend(socket, ret.buf, urlCorrected.toString("utf-8"));
      } catch {
        continue;
      }
    }
  }
  if ("announce" in torrent) {
    const url = torrent.announce.toString("utf8");
    var urlCorrected = Array.isArray(url) ? url[0] : url;
    var ret = buildConnReq();
    assoc[ret.tid.readInt32BE()] = urlCorrected.toString("utf-8");
    try {
      udpSend(socket, ret.buf, urlCorrected.toString("utf-8"));
    } catch { }
  }

  // udpSend(socket, buildConnReq(), url);
  var isOne = false;

  socket.on("message", (response) => {
    if (respType(response) === "connect") {
      const connResp = {
        action: response.readUInt32BE(0),
        transactionId: response.readUInt32BE(4),
        connectionId: response.slice(8),
      };
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      if (assoc[connResp.transactionId]) {
        // console.log(announceReq, assoc[connResp.transactionId])
        udpSend(socket, announceReq, assoc[connResp.transactionId]);
      }
    } else if (respType(response) === "announce" && !isOne) {
      const announceResp = parseAnnounceResp(response);
      // isOne = true
      callback(announceResp.peers);
    }
  });
};

function udpSend(socket, message, rawUrl, callback = () => { }) {
  socket.send(message, 0, message.length, urlParse(rawUrl).port, urlParse(rawUrl).hostname, callback);
}

respType = (resp) => {
  return resp.readUInt32BE(0) == 0 ? "connect" : "announce";
}


buildConnReq = () => {
  const buf = Buffer.allocUnsafe(16);

  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);

  buf.writeUInt32BE(0, 8);

  let tid = crypto.randomBytes(4);
  tid.copy(buf, 12);

  return {
    buf,
    tid, // Use TID to keep track of URL for using to announce after connect
  };
}


function buildAnnounceReq(connId, torrent, port = 6881) {
  const buf = Buffer.allocUnsafe(98);

  // connection id
  connId.copy(buf, 0);
  buf.writeUInt32BE(1, 8);
  crypto.randomBytes(4).copy(buf, 12);
  torrentParser.infoHash(torrent).copy(buf, 16);
  util.genId().copy(buf, 36);
  Buffer.alloc(8).copy(buf, 56);
  torrentParser.size(torrent).copy(buf, 64);
  Buffer.alloc(8).copy(buf, 72);
  buf.writeUInt32BE(0, 80);
  buf.writeUInt32BE(0, 84);
  crypto.randomBytes(4).copy(buf, 88);
  buf.writeInt32BE(-1, 92);
  buf.writeUInt16BE(port, 96);

  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let i = 0;
    let groups = [];
    iterable.forEach((_, index) => {
      if (index % groupSize === 0) {
        groups.push(iterable.slice(i, i + groupSize));
        i = index;
      }
    });
    return groups;
  }

  const addresses = group(resp.slice(20), 6);
  const results = [];
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    results.push({
      ip: address.slice(0, 4).join("."),
      port: address.readUInt16BE(4),
    });
  }

  return {
    transactionId: resp.readUInt32BE(4),
    action: resp.readUInt32BE(0),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: results
  };
}
