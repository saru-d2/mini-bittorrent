import bencode from "bencode";

var data = {
  string: "Hello World",
  integer: 12345,
  dict: {
    key: "This is a string within a dictionary",
  },
  list: [1, 2, 3, 4, "string", 5, {}],
};

var result = bencode.encode(data);

console.log(result);
