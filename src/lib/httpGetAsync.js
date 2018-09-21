'use strict';
const http = require("http");
const https = require("https");

const get = (handler) => (function (options, ok, error) {
  handler.get(options, (res) => {
    const data = [];
    res.on('data', (chunk) => {
      data.push(chunk);
    }).on('end', function () {
      const buffer = Buffer.concat(data);
      const json = JSON.parse(buffer);
      ok(json);
    });
  }).on('error', (e) => {
    error(`error[${options}]: ${e}`);
  });
});

module.exports.http = get(http);
module.exports.https = get(https);
