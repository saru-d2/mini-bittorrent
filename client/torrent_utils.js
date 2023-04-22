const crypto = require("crypto");
const bignum = require("bignum");
const bencode = require("bencode");
const fs = require("fs");

module.exports.open = (fp) => {
    return bencode.decode(fs.readFileSync(fp));
};

module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.infoHash = (torrent) => {
    const info = bencode.encode(torrent.info);
    return crypto.createHash("sha1").update(info).digest();
};


module.exports.pieceLen = (torrent, pieceIndex) => {
    let torrSize = this.size(torrent);
    const totalLength = bignum.fromBuffer(torrSize).toNumber();
    const lastPieceIndex = Math.floor(totalLength / torrent.info["piece length"]);

    if (lastPieceIndex != pieceIndex)
        return torrent.info["piece length"];
    return totalLength % torrent.info["piece length"];

};

module.exports.size = (torrent) => {
    let size = -1;
    if (torrent.info.files) size = torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    else torrent.info.length
    return bignum.toBuffer(size, { size: 8 });
};

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
    const pieceLength = this.pieceLen(torrent, pieceIndex);

    if (blockIndex == Math.floor(pieceLength / this.BLOCK_LEN)) return pieceLength % this.BLOCK_LEN;
    return this.BLOCK_LEN;
};

module.exports.blocksPerPiece = (torrent, pieceIndex) => {
    return Math.ceil(this.pieceLen(torrent, pieceIndex) / this.BLOCK_LEN);
};
