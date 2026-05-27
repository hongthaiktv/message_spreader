const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');
const localFile = fs.readFileSync("./README.md");

const random = Math.floor(Math.random() * 50);
const file = Buffer.alloc(random);
crypto.randomFillSync(file, 0, file.length);
console.log("length:", file.length);
let fname = "";
// console.log("check:", file instanceof Buffer);
const key = crypto.generateKeySync("aes", {length: 256});
// console.log(key.export().toString("hex"));
// console.log(localFile);
// console.log(file.toString("utf8"));
const options = {
	method: "POST",
	url: "http://localhost:3001",
	strictSSL: false,
	headers: {
		'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
	},
	formData: {
		files: [{
			value: file,
			options: {filename: fname || ""}
		}]
	}
};

request(options, function (error, response, body) {
	if (error) {
		console.error(error);
		return;
	}
	console.log(body);
});

