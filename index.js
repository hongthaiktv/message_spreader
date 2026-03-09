const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const app = express();
const port = 3000;
const rootDir = path.join(__dirname, "public");
const websites = require('./websites.json');
let puppet;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(rootDir));

app.post("/post", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	res.json({result: "server response"});
});

app.post("/puppet", (req, res) => {
	let reqAct = req.body.action;
	let msg = "";
	let counter = 0, errCounter = 0;
	switch (reqAct) {
		case "start":
			msg = 'Puppet starting...';
			console.log(msg);
			puppet = setInterval(() => {
				let rand = Math.floor(Math.random() * 4970);
				const url = `https://${websites[rand]}`;
				console.log(url);
				const options = {
					url: url,
					strictSSL: false,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0'
					}
				};

				request(options, function (error, response, body) {
					if (error) {
						console.log(`Failed: ${++errCounter}`);
						console.error(error);
// 						res.json({result: error});
						return;
					}
					if (response.statusCode !== 200) {
						console.log(`Failed: ${++errCounter}`);
						let err = `Error ${response.statusCode}: ${url}`;
						console.error(err);
// 						res.json({result: err});
					} else {
						console.log(`Success: ${++counter}`);
// 						console.log('body:', body.substr(0, 20));
					}
				});
			}, 5000);
			res.json({result: msg});
			break;

		case "stop":
			msg = 'Puppet stopped.';
			clearInterval(puppet);
			console.log(msg);
			res.json({result: msg});
			break;

		default:
			res.json({result: "Wrong action!"});
			break;
	}
});

app.get("/test", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	res.send("test");
});

app.use(serveIndex(rootDir, {
	'icons': true,
	'view': 'details'
}));

app.get("*", (req, res) => res.status(404).sendFile(path.join(rootDir, "404.html")));

app.listen(port, () => {
  console.log(`Web server running at http://localhost:${port}`);
});

