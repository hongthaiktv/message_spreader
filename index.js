const fs = require('fs');
const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const multer = require('multer');
const { JSDOM, VirtualConsole } = require("jsdom");
const { Logger, FormUpload } = require('./plugin/tutils/index.js');
const motd = require('./assets/json/motd.json');

const app = express();
const port = 3000;
const rootDir = path.join(__dirname, "public");
const logger = new Logger("");
const storage = multer.diskStorage({
	destination: path.join(rootDir, "uploads"),
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
});
const upload = multer({ storage });

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
	mainSites: require('./assets/json/mainSites.json'),
	trustSites: require('./assets/json/trustSites.json'),
	blackSites: require('./assets/json/blackSites.json')
};

logger.addEventListener("change", function (e) {
	const { action, log, client } = e.detail;
	const msg = `data: ${JSON.stringify(log)}\n\n`;

	switch (action) {
		case "add": case "update": case "remove":
			const clients = logger.getClients();
			for (const client of clients) {
				client.write(msg);
			}
			break;
	}
});

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
		logger.removeClient(res, "log", {code: 6});
	});
	res.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache"
	});
	logger.addClient(res, "log", {code: 5, started: puppet.started, current: puppet.current, total: puppet.total, success: puppet.success, failed: puppet.failed});
});

app.post("/upload", upload.single("file"), (req, res) => {
	console.log(req.headers);
	const msg = req.file ? req.file.path : "no file";
	console.log(msg);
	console.log(req.file);
	res.json({result: msg});
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
				if (res) res.json({
					message: msg,
					type: "log",
					nosse: true
				});
				return;
			}
			msg = `Puppet starting with "${puppet.current}"...`;
			puppet.started = true;
			puppet.counter = 0;
			async function randRequest(time) {
				//test post json data
				randPost(motd, time);
				//test file upload
// 				const uploadDir = path.join(__dirname, 'assets', 'images');
// 				const image = path.join(uploadDir, "resampled.jpg");
// 				randUpload(formData, time);

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
							const pageRank = rand + 1;
							const msg = `Rank ${pageRank}: ${url}`;
							logger.addLog(msg, "log", { code: 4, pageRank, url });
							const options = {
								url: url,
								strictSSL: false,
								headers: {
									'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
								}
							};

							++puppet.total;
							++puppet.counter;
							request(options, function (error, response, body) {
								if (error) {
									puppet.urlFailed.push(url);
									++puppet.failed;
									const msg = `Failed (${puppet.failed}/${puppet.total}) : ${error.code} : ${url}`;
									logger.addLog(msg, "error", {code: 1, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: error.code, url});
									console.error(error);
									return;
								}
								if (response.statusCode !== 200) {
									puppet.urlFailed.push(url);
									++puppet.failed;
									const msg = `Failed (${puppet.failed}/${puppet.total}) : ${response.statusCode} : ${url}`;
									logger.addLog(msg, "error", {code: 1, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: response.statusCode, url});
								} else {
									const document = parseHTML(body); 
									++puppet.success;
									const msg = `Success (${puppet.success}/${puppet.total})`;
									logger.addLog(msg, "log", {code: 3, success: puppet.success, total: puppet.total});
									if (document) {
										const para = document.querySelectorAll("p");
										if (para.length) {
											const rand = Math.floor(Math.random() * para.length);
											if (para[rand].innerText !== '') logger.addLog(para[rand].innerHTML, "info", {code: 10, total: puppet.total, success: puppet.success, failed: puppet.failed});
										}
										else logger.addLog(`Paragraph not found: ${url}`, "log", {code: 2, total: puppet.total, success: puppet.success, failed: puppet.failed, url});
									}
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
			logger.addLog(msg, "success", {
				code: 7,
				current: puppet.current
			});
			if (res) res.json({
				code: 7,
				message: msg,
				type: "success",
				current: puppet.current
			});
			break;

		case "stop":
			msg = `Puppet stopped with ${puppet.total} request, ${puppet.success} success, ${puppet.failed} failed`;
			puppet.started = false;
			logger.addLog(msg, "success", {code: 8, total: puppet.total, success: puppet.success, failed: puppet.failed, urlFailed: puppet.urlFailed});
			console.log('URL failed:', puppet.urlFailed);
			if (res) res.json({
				code: 8,
				message: msg,
				type: "success",
				total: puppet.total,
				success: puppet.success,
				failed: puppet.failed,
				urlFailed: puppet.urlFailed
			});
			break;

		case "change":
			msg = `Puppet URLs list changed to "${puppet.current}"`;
			puppet.counter = 0;
			logger.addLog(msg, "success", {code: 9, current: puppet.current});
			if (res) res.json({
				code: 9,
				message: msg,
				type: "success",
				current: puppet.current
			});
			break;

		default:
			msg = "Wrong action!";
			console.log(msg);
			if (res) res.json({
				message: msg,
				type: "error",
				nosse: true
			});
			break;
	}
}

function parseHTML(html) {
	let dom, document;
	const virtualConsole = new VirtualConsole();
	try {
		dom = new JSDOM(html, { virtualConsole });
	} catch(err) {
		console.error("Error parsing HTML:", err);
	}
	if (dom && dom.window && dom.window.document) document = dom.window.document;
	return document;
}

async function randPost(data, time) {
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
				const options = {
					method: "POST",
					url: url,
					strictSSL: false,
					json: true,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
					},
					body: data
				};

				request(options, function (error, response, body) {
					if (error) {
						console.error(error);
						return;
					}
				});
				resolve(data);
			}, randTime);
		});
	}
	while (puppet.started) {
		await wait();
	}
}

async function randUpload(formData, time) {
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

// 				const url = `https://${puppet[puppet.current][rand]}`;
				const url = `http://localhost:3001/upload`;
				const options = {
					method: "POST",
					url: url,
					strictSSL: false,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0',
						"Content-Type": "multipart/form-data"
					},
					formData
				};

				request(options, function (error, response, body) {
					if (error) {
						console.error(error);
						return;
					}
				});
				resolve(`Upload complete: ${formData.length} file(s)`);
			}, randTime);
		});
	}
// 	await wait();
	while (puppet.started) {
		await wait();
	}
}

