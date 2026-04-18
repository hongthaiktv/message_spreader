const fs = require('fs');
const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const multer = require('multer');
const { JSDOM, VirtualConsole } = require("jsdom");
const { Logger, FormUpload } = require('./plugin/tutils/index.js');
const motd = require('./assets/json/motd.json');

const rootDir = path.join(__dirname, "public");
const uploadDir = path.join(rootDir, "upload");
getDir(uploadDir, true);

const app = express();
const port = 3000;
const logger = new Logger("");
const storage = multer.diskStorage({
	destination: uploadDir,
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
});
const uploader = multer({ storage });

let server;
const listSites = {
	mainSites: require('./assets/json/mainSites.json'),
	trustSites: require('./assets/json/trustSites.json'),
	blackSites: require('./assets/json/blackSites.json'),
	urlFailed: []
};
const puppet = {
	started: false,
	rate: 10,
	total: 0,
	counter: 0,
	success: 0,
	failed: 0,
	current: "mainSites",
	quickStart: process.env.PUPPET == 1 ? true : false
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

app.get("/query", (req, res) => {
	if (!req.query || !req.query.action) {
		const message = "Missing query action";
		res.status(500).json({message});
		return;
	}
	const action = req.query.action;
	const dirName = req.query.dirName || "upload";
	const dirPath = path.join(rootDir, dirName);
	let message = "";
	switch (action) {
		case "getDir":
			const dirInfo = getDir(dirPath);
			if (dirInfo.isError) {
				res.status(500).json(dirInfo);
				return;
			}
			console.log(dirInfo.message);
			res.json(dirInfo);
			break;
	}
});

app.get("/logger", (req, res) => {
	res.on("close", () => {
		logger.removeClient(res, "log", {code: 6});
	});
	res.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache"
	});
	logger.addClient(res, "log", {code: 5, urlFailed: listSites.urlFailed, ...puppet});
});

app.post("/puppet", (req, res) => {
	const reqAct = req.body.action;
	switch (reqAct) {
		case "changeList":
			puppet.current = req.body.list || "mainSites";
			break;

		case "changeRate":
			puppet.rate = req.body.rate;
			break;
	}
	runPuppet(reqAct, res);
});

app.post("/upload", uploader.array("files"), (req, res) => {
	const message = req.files && req.files.length ? `Total ${req.files.length} file(s) uploaded.` : "No file(s) uploaded.";
	console.log(message);
	if (req.body && req.body.message) console.log(req.body.message);
	res.json({message});
});

app.use(serveIndex(rootDir, {
	'icons': true,
	'view': 'details'
}));

app.get("*", (req, res) => res.status(404).sendFile(path.join(rootDir, "404.html")));

server = app.listen(port, () => {
	console.log(`Web server running at http://localhost:${port}`);
});

function getDir(dirPath, created = false) {
	const dirName = dirPath.replace(/^.*\//g, '');
	const content = [], dirs = [], files = [], links = [];
	const pathContent = [], pathDirs = [], pathFiles = [], pathLinks = [];
	try {
		const dirContent = fs.readdirSync(dirPath, {withFileTypes: true});
		for (const file of dirContent) {
			content.push(file.name);
			pathContent.push(path.join(dirPath, file.name));
			if (file.isFile()) {files.push(file.name); pathFiles.push(path.join(dirPath, file.name));}
			else if (file.isDirectory()) {dirs.push(file.name); pathDirs.push(path.join(dirPath, file.name));}
			else if (file.isSymbolicLink()) {links.push(file.name); pathLinks.push(path.join(dirPath, file.name));}
		}
		const message = `Directory "${dirName}" got ${dirs.length} directori(es), ${files.length} file(s), ${links.length} link(s). Total: ${content.length}`;
		return {message, content, dirs, files, links, pathContent, pathDirs, pathFiles, pathLinks, dirName, dirPath, total: content.length};
	} catch(err) {
		if (err.errno === -2 && created) {
			try {
				fs.unlinkSync(dirPath);
			} catch(err) {
				console.error(err.toString());
			}
			fs.mkdirSync(dirPath, {recursive: true});
			const message = `Directory created: ${dirPath}`;
			console.log(message);
			return {message, created, dirName, dirPath, total: 0};
		}
		const message = err.toString();
		console.error(message);
		return {message, isError: true, ...err};
	}
}

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

			randRequest();
			randPost(motd);
			randUpload(uploadDir);

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
			logger.addLog(msg, "success", {code: 8, total: puppet.total, success: puppet.success, failed: puppet.failed, urlFailed: listSites.urlFailed});
			console.log('URL failed:', listSites.urlFailed);
			if (res) res.json({
				code: 8,
				message: msg,
				type: "success",
				total: puppet.total,
				success: puppet.success,
				failed: puppet.failed,
				urlFailed: listSites.urlFailed
			});
			break;

		case "changeList":
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

		case "changeRate":
			msg = `Puppet rate changed to "${puppet.rate}s"`;
			logger.addLog(msg, "success", {code: 10, rate: puppet.rate});
			if (res) res.json({
				code: 10,
				message: msg,
				type: "success",
				rate: puppet.rate
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

async function randRequest() {
	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				let rand;
				if (puppet.counter < 10 && listSites[puppet.current].length >= 10) rand = Math.floor(Math.random() * 10);
				else if (puppet.counter < 100 && listSites[puppet.current].length >= 100) rand = Math.floor(Math.random() * 100);
				else if (puppet.counter < 1000 && listSites[puppet.current].length >= 1000) rand = Math.floor(Math.random() * 1000);
				else if (puppet.counter < 10000 && listSites[puppet.current].length >= 10000) rand = Math.floor(Math.random() * 10000);
				else if (puppet.counter < 100000 && listSites[puppet.current].length >= 100000) rand = Math.floor(Math.random() * 100000);
				else rand = Math.floor(Math.random() * listSites[puppet.current].length);

				const url = `https://${listSites[puppet.current][rand]}`;
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
						listSites.urlFailed.push(url);
						++puppet.failed;
						const msg = `Failed (${puppet.failed}/${puppet.total}) : ${error.code} : ${url}`;
						logger.addLog(msg, "error", {code: 1, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: error.code, url});
						console.error(error);
						return;
					}
					if (response.statusCode !== 200) {
						listSites.urlFailed.push(url);
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
								if (para[rand].innerText !== '') logger.addLog(para[rand].innerHTML, "info", {code: 10, pageRank, url, total: puppet.total, success: puppet.success, failed: puppet.failed});
							}
							else logger.addLog(`Paragraph not found: ${url}`, "log", {code: 2, pageRank, url, total: puppet.total, success: puppet.success, failed: puppet.failed});
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

async function randPost(data) {
	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				let rand;
				if (puppet.counter < 10 && listSites[puppet.current].length >= 10) rand = Math.floor(Math.random() * 10);
				else if (puppet.counter < 100 && listSites[puppet.current].length >= 100) rand = Math.floor(Math.random() * 100);
				else if (puppet.counter < 1000 && listSites[puppet.current].length >= 1000) rand = Math.floor(Math.random() * 1000);
				else if (puppet.counter < 10000 && listSites[puppet.current].length >= 10000) rand = Math.floor(Math.random() * 10000);
				else if (puppet.counter < 100000 && listSites[puppet.current].length >= 100000) rand = Math.floor(Math.random() * 100000);
				else rand = Math.floor(Math.random() * listSites[puppet.current].length);

				const url = `https://${listSites[puppet.current][rand]}`;
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

async function randUpload(formData) {
	if (typeof formData === "string") {
		const dirPath = formData;
		const dirInfo = getDir(dirPath);
		if (dirInfo.isError) return;
		formData = new FormUpload(dirInfo.pathFiles);
		formData.append("message", `Path upload: ${dirPath}`);
	}

	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				let rand;
				if (puppet.counter < 10 && listSites[puppet.current].length >= 10) rand = Math.floor(Math.random() * 10);
				else if (puppet.counter < 100 && listSites[puppet.current].length >= 100) rand = Math.floor(Math.random() * 100);
				else if (puppet.counter < 1000 && listSites[puppet.current].length >= 1000) rand = Math.floor(Math.random() * 1000);
				else if (puppet.counter < 10000 && listSites[puppet.current].length >= 10000) rand = Math.floor(Math.random() * 10000);
				else if (puppet.counter < 100000 && listSites[puppet.current].length >= 100000) rand = Math.floor(Math.random() * 100000);
				else rand = Math.floor(Math.random() * listSites[puppet.current].length);

				const url = `https://${listSites[puppet.current][rand]}`;
// 				const url = `http://localhost:3000/upload`;
				const options = {
					method: "POST",
					url: url,
					strictSSL: false,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
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
	while (puppet.started) {
		await wait();
	}
}

