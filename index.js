"use strict";

const download = require("./client/download");
const torrentParser = require("./client/torrent_utils");

const torrent = torrentParser.open(process.argv[2]);

console.log(torrent);

download(torrent, torrent.info.name);
