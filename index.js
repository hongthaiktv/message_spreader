const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const app = express();
const port = 3000;
const rootDir = path.join(__dirname, "public");
const websites = require('./websites.json');
let puppet = {
	started: true,
	total: 0,
	success: 0,
	failed: 0,
	urlFailed: []
};

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
	switch (reqAct) {
		case "start":
			msg = 'Puppet starting...';
			console.log(msg);
			puppet.started = true;
			async function randRequest(time) {
				function wait() {
					return new Promise((resolve) => {
						let randTime = Math.floor(Math.random() * time + 1);
						setTimeout(() => {
							let rand;
							if (puppet.total <= 10) rand = Math.floor(Math.random() * 10 + 1);
							else if (puppet.total <= 100) rand = Math.floor(Math.random() * 100 + 1);
							else if (puppet.total <= 1000) rand = Math.floor(Math.random() * 1000 + 1);
							else if (puppet.total <= 10000) rand = Math.floor(Math.random() * 10000 + 1);
							else rand = Math.floor(Math.random() * 100000 + 1);
							const url = `https://${websites[rand]}`;
							console.log(`Rank ${rand}: ${url}`);
							const options = {
								url: url,
								strictSSL: false,
								headers: {
									'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0'
								}
							};

							request(options, function (error, response, body) {
								++puppet.total;
								if (error) {
									puppet.urlFailed.push(url);
									console.log(`Failed: ${++puppet.failed}`);
									console.error(error);
									return;
								}
								if (response.statusCode !== 200) {
									puppet.urlFailed.push(url);
									console.log(`Failed: ${++puppet.failed}`);
									let err = `Error ${response.statusCode}: ${url}`;
									console.error(err);
								} else {
									console.log(`Success: ${++puppet.success}`);
								}
							});
							resolve(puppet);
						}, randTime);
					});
				}
				while (puppet.started) {
					await wait();
				}
			}
			randRequest(10000);
			res.json({result: msg});
			break;

		case "stop":
			msg = `Puppet stopped with ${puppet.total} request and ${puppet.urlFailed.length} failed.`;
			puppet.started = false;
			console.log(msg);
			console.log('URL failed:', puppet.urlFailed);
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

