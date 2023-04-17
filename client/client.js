bencode = require('bencode')
fs = requre('fs')
download = require('download.js')

torrent = bencode.decode(fs.readFileSync())
