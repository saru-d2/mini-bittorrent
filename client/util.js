"use strict";

const crypto = require("crypto");

let id = null;

const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from("-RT0001-").copy(id, 0); // ID = -(RoSA Torrent)(Version 1)-(Rand Bytes)
  }
  return id;
};

module.exports = { genId };
