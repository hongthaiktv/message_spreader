const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const app = express();
const port = 3000;
const rootDir = path.join(__dirname, "public");
const websites = require('./websites.json');
let server;
let puppet = {
	started: false,
	total: 0,
	success: 0,
	failed: 0,
	urlFailed: [],
	quickStart: process.env.PUPPET == 1 ? true : false
};

let trustSites = [
	"example.com",
	"example.com",
	"example.com",
	"example.com",
	"example.com",
	"test.com",
	"test.com",
	"test.com",
	"test.com",
	"test.com",
	"test.com"
];

if (puppet.quickStart) runPuppet("start", websites);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(rootDir));

app.post("/post", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	res.json({result: "server response"});
});

app.post("/puppet", (req, res) => {
	const reqAct = req.body.action;
	let urls = req.body.urls;
	if (!urls) urls = websites;
	else urls = trustSites;
	runPuppet(reqAct, urls, res);
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

server = app.listen(port, () => {
  console.log(`Web server running at http://localhost:${port}`);
});

function runPuppet(act, urls, res) {
	let msg = "";
	switch (act) {
		case "start":
			if (puppet.started) {
				msg = "Puppet already started.";
				console.log(msg);
				if (res) res.json({result: msg});
				return;
			}
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

							const url = `https://${urls[rand]}`;
							console.log(`Rank ${rand}: ${url}`);
							const options = {
								url: url,
								strictSSL: false,
								headers: {
									'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0'
								}
							};

							++puppet.total;
							request(options, function (error, response, body) {
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
			if (res) res.json({result: msg});
			break;

		case "stop":
			msg = `Puppet stopped with ${puppet.total} request and ${puppet.urlFailed.length} failed.`;
			puppet.started = false;
			console.log(msg);
			console.log('URL failed:', puppet.urlFailed);
			if (res) res.json({result: msg});
			break;

		default:
			console.log("Wrong action!");
			if (res) res.json({result: "Wrong action!"});
			break;
	}
}

