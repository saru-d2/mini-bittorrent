const Buffer = require("buffer").Buffer;
const parser = require("./torrent_utils");
const torrentUtil = require("./util");

const HANDSHAKE_BUFFER_LEN = 68;
const CHOKE_BUFFER_LEN = 5;
const INTERESTED_BUFFER_LEN = 5;
const HAVE_BUFFER_LEN = 9;
const REQUEST_BUFFER_LEN = 17;
const PORT_BUFFER_LEN = 7;

function buildHandshake(torrent) {
  const buf = Buffer.alloc(HANDSHAKE_BUFFER_LEN);
  // pstrlen
  buf.writeUInt8(19, 0);
  // pstr
  buf.write("BitTorrent protocol", 1);
  // reserved
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 28);
  // peer id
  util.genId().copy(buf, 48);
  return buf;
}

function buildKeepAlive() {
  const buf = Buffer.alloc(4);
  return buf;
}

function buildChoke() {
  const buf = Buffer.alloc(CHOKE_BUFFER_LEN);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(0, 4);
  return buf;
}

function buildUnchoke() {
  const buf = Buffer.alloc(CHOKE_BUFFER_LEN);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(1, 4);
  return buf;
}

function buildInterested() {
  const buf = Buffer.alloc(INTERESTED_BUFFER_LEND);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(2, 4);
  return buf;
}

function buildUninterested() {
  const buf = Buffer.alloc(INTERESTED_BUFFER_LEN);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(3, 4);
  return buf;
}

function buildHave(payload) {
  const buf = Buffer.alloc(HAVE_BUFFER_LEN);
  // length
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(4, 4);
  // piece index
  buf.writeUInt32BE(payload, 5);
  return buf;
}

function buildBitfield(bitfield) {
  const buf = Buffer.alloc(bitfield.length + 1 + 4);
  // length
  buf.writeUInt32BE(payload.length + 1, 0);
  // id
  buf.writeUInt8(5, 4);
  // bitfield
  bitfield.copy(buf, 5);
  return buf;
}

function buildRequest(payload) {
  const buf = Buffer.alloc(REQUEST_BUFFER_LEN);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(6, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
}

function buildPiece(payload) {
  const buf = Buffer.alloc(payload.block.length + 13);
  // length
  buf.writeUInt32BE(payload.block.length + 9, 0);
  // id
  buf.writeUInt8(7, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // block
  payload.block.copy(buf, 13);
  return buf;
}

function buildCancel(paylod) {
  const buf = Buffer.alloc(REQUEST_BUFFER_LEN);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(8, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
}

function buildPort(payload) {
  const buf = Buffer.alloc(PORT_BUFFER_LEN);
  // length
  buf.writeUInt32BE(3, 0);
  // id
  buf.writeUInt8(9, 4);
  // listen-port
  buf.writeUInt16BE(payload, 5);
  return buf;
}

function _buildParserPayload(payload) {
  const index = payload.readInt32BE(0);
  const begin = payload.readInt32BE(4);
  return {
    index,
    begin,
  };
}

function parse(message) {
  let id = null;
  let payload = null;
  if (message.length > 4) {
    id = message.readInt8(4);
  }
  if (message.length > 5) {
    payload = message.slice(5);
  }

  if (id in [6, 7, 8]) {
    const det = payload.slice(8);
    const payload = _buildParserPayload(payload);
    if (id === 7) payload["block"] = det;
    else payload["length"] = det;
  }

  const size = message.readInt32BE(0);
  return {
    size,
    id,
    payload,
  };
}
