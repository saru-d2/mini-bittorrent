'use strict';

const tp = require('./torrent-parser');

const is2DArrayTrue = (arr) => { return arr.every(l1 => l1.every(Boolean) == true); }

const Pieces = class {
  constructor(torrent) {
    const nPieces = torrent.info.pieces.length / 20;
    const arr = new Array(nPieces).fill(null);
    this._requested = arr.map((_, i) => new Array(tp.blocksPerPiece(torrent, i)).fill(false));
    this._received = [...this._requested];
    this.nPieces = nPieces;
  }

  addRequested(pieceBlock) { this._requested[pieceBlock.index][pieceBlock.begin / tp.BLOCK_LEN] = true; }

  addReceived(pieceBlock) { this._received[pieceBlock.index][pieceBlock.begin / tp.BLOCK_LEN] = true; }

  needed(pieceBlock) {
    if (is2DArrayTrue(this._requested)) { this._requested = this._received.map(blocks => blocks.slice()); }
    return !this._requested[pieceBlock.index][pieceBlock.begin / tp.BLOCK_LEN];
  }

  isDone() { return is2DArrayTrue(this._received); }

  printPercentDone() {
    let completedCount = 0;
    let totalCount = 0;
    this._received.forEach(blocks => {
      completedCount += blocks.filter(Boolean).length;
      totalCount += blocks.length;
    })

    // Print a Unicode progress bar
    var all_status = this._received.flat();
    var blockSize = all_status.length / 101;
    var progress_unicode = " ⠁⠃⠋⠛⠟⠿⡿⣿";

    process.stdout.write(`Progress: |`)
    for (const x of Array(100).keys()) {
        var progress = all_status.slice(x * blockSize, (x + 1) * blockSize).filter(Boolean).length / all_status.slice(x * blockSize, (x + 1) * blockSize).length;
        process.stdout.write(progress_unicode.charAt(Math.floor(progress * 8)));
        // process.stdout.write(Math.floor(progress * 9).toString());
    }
    process.stdout.write(`| ${Math.floor(completedCount / totalCount * 100)}% (${completedCount} / ${totalCount})\r`);

    // process.stdout.write('⠁⠃⠋⠛⠟⠿⡿⣿ \r')
    // process.stdout.write('⣿'.repeat(100) + '\r');

    // process.stdout.write(`Completed: (${completedCount} / ${totalCount}) - ${this.nPieces} : ` + Math.floor(completedCount / totalCount * 100) + '%\r');
  }
};

module.exports = { Pieces }
