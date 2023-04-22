const parser = require("./torrent_utils");

class Queue {
  constructor(torrent) {
    this._torrent = torrent;
    this._queue = [];
    this._choked = true;
  }

  _getBlockCnt(idx) {
    return parser.blocksPerPiece(this._torrent, idx);
  }

  _getBlockLenPerChunk(idx, chunkIdx) {
    return parser.blockLen(this._torrent, chunkIdx, idx);
  }

  _costructChunkBlock(idx, chunkIdx) {
    const index = chunkIdx;
    const begin = idx * parser.BLOCK_LEN;
    const length = this._getBlockLenPerChunk(idx, chunkIdx);

    return {
      index,
      begin,
      length,
    };
  }

  queue(chunkIdx) {
    const blockCnt = this._getBlockCnt(chunkIdx);
    for (let i = 0; i < blockCnt; i++) {
      this._queue.push(this._costructChunkBlock(i, chunkIdx));
    }
  }

  deque() {
    const ret = this._queue[0];
    this._queue.shift();
    return ret;
  }

  peek() {
    return this._queue[0];
  }

  length() {
    return this._queue.length;
  }

  get choked() {
    return this._choked;
  }

  set choked(val) {
    if (typeof val === "boolean") {
      this._choked = val;
    } else {
      throw new TypeError("choked must be a bool");
    }
  }
}

module.exports = Queue;
