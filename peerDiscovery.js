"use strict";

const torrentParser = require("./client/torrent_utils");
const tracker = require("./client/tracker");

const torrent = torrentParser.open(process.argv[2]);

tracker.getPeers(torrent, (peers) => {
  console.log(`${peers.length} peers found`);
  let i = 1;
  for (const peer of peers) {
    i += 1;
    console.log(`${peer.ip}: ${peer.port}`);

    if (i > 10) {
      break;
    }
  }
});
