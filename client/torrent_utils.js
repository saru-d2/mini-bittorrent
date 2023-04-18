const crypto = require('crypto');
const bignum = require('bignum');
const bencode = require('bencode');

module.exports.infoHash = torrent => {
    const info = bencode.encode(torrent.info);
    return crypto.createHash('sha1').update(info).digest();
};

module.exports.size = torrent => {
    const size = torrent.info.files ?
        torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
        torrent.info.length;

    return bignum.toBuffer(size, { size: 8 });
};

function pieceLen(torrent, pieceIndex) {
    const totalLength = bignum.fromBuffer(this.size(torrent)).toNumber();
    const pieceLength = torrent.info['piece length'];
    const lastPieceIndex = Math.floor(totalLength / pieceLength);

    if (lastPieceIndex == pieceIndex) return totalLength % pieceLength;
    return pieceLength
}


module.exports.blocksPerPiece = (torrent, pieceIndex) => {
    return Math.ceil(pieceLen(torrent, pieceIndex) / this.BLOCK_LEN);
};

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
    const pieceLength = pieceLen(torrent, pieceIndex);
    const lastPieceIndex = Math.floor(pieceLength / this.BLOCK_LEN);

    if (blockIndex == lastPieceIndex) return pieceLength % this.BLOCK_LEN;
    return this.BLOCK_LEN;
};