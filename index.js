const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const app = express();
const port = 3000;
const rootDir = path.join(__dirname, "public");
const Logger = require('./Logger.js');
const logger = new Logger();

let server;
let puppet = {
	started: false,
	total: 0,
	counter: 0,
	success: 0,
	failed: 0,
	urlFailed: [],
	current: "mainSites",
	quickStart: process.env.PUPPET == 1 ? true : false,
	mainSites: require('./websites.json'),
	trustSites: require('./trustsites.json')
};

setInterval(function () {
	logger.addLog("test log interval...");
}, 2000);

if (puppet.quickStart) runPuppet("start");

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
	if (reqAct === "change") puppet.current = req.body.urls || "mainSites";
	runPuppet(reqAct, res);
});

app.get("/logger", (req, res) => {
	res.on("close", () => {
		logger.removeClient(res);
	});
	res.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache"
	});
	logger.addClient(res);
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

function runPuppet(act, res) {
	let msg = "";
	switch (act) {
		case "start":
			if (puppet.started) {
				msg = "Puppet already started.";
				console.log(msg);
				if (res) res.json({result: msg});
				return;
			}
			msg = `Puppet starting with "${puppet.current}"...`;
			console.log(msg);
			puppet.started = true;
			puppet.counter = 0;
			async function randRequest(time) {
				function wait() {
					return new Promise((resolve) => {
						let randTime = Math.floor(Math.random() * time + 1);
						setTimeout(() => {
							let rand;
							if (puppet.counter < 10 && puppet[puppet.current].length >= 10) rand = Math.floor(Math.random() * 10);
							else if (puppet.counter < 100 && puppet[puppet.current].length >= 100) rand = Math.floor(Math.random() * 100);
							else if (puppet.counter < 1000 && puppet[puppet.current].length >= 1000) rand = Math.floor(Math.random() * 1000);
							else if (puppet.counter < 10000 && puppet[puppet.current].length >= 10000) rand = Math.floor(Math.random() * 10000);
							else if (puppet.counter < 100000 && puppet[puppet.current].length >= 100000) rand = Math.floor(Math.random() * 100000);
							else rand = Math.floor(Math.random() * puppet[puppet.current].length);

							const url = `https://${puppet[puppet.current][rand]}`;
							console.log(`Rank ${rand + 1}: ${url}`);
							const options = {
								url: url,
								strictSSL: false,
								headers: {
									'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0'
								}
							};

							++puppet.total;
							++puppet.counter;
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

		case "change":
			msg = `Puppet URLs list changed to "${puppet.current}".`;
			console.log(msg);
			puppet.counter = 0;
			if (res) res.json({result: msg});
			break;

		default:
			console.log("Wrong action!");
			if (res) res.json({result: "Wrong action!"});
			break;
	}
}

