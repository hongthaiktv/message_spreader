const fs = require('fs');
const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const path = require('path');
const multer = require('multer');
const { JSDOM, VirtualConsole } = require("jsdom");
const { Logger, FormUpload } = require('./plugin/tutils/index.js');
const motd = require('./assets/json/motd.json');
const port = 3000;
const domain = process.env.DOMAIN || `http://localhost:${port}`;

const rootDir = path.join(__dirname, "public");
const uploadDir = path.join(rootDir, "upload");
getDir(uploadDir, true);

const app = express();
const logger = new Logger("");
const motdLogger = new Logger({prefix: "", record: true});
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
	urlFailed: [],
	urlSuccess: []
};

const puppet = {
	started: false,
	quiet: true,
	rate: 10,
	total: 0,
	counter: 0,
	success: 0,
	failed: 0,
	current: "mainSites",
	mode: "normal",
	quickStart: process.env.PUPPET == 1 ? true : false
};

logger.addEventListener("change", function (e) {
	const { action, log } = e.detail;
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

app.post("/", (req, res) => {
	const code = 23;
	const type = "motd";
	const motdMessage = req.body;
	const { integrity, spreader } = motdMessage;
	const motdLogs = motdLogger.getLogs();
	let existMessage = false;

	for (let i = 0; i < motdLogs.length; i++) {
		const motdIntegrity = motdLogs[i].integrity;
		if (motdIntegrity === integrity) {
			existMessage = true;
			break;
		}
	}

	if (!existMessage) {
		let pageRank = 0;
		const trustSites = listSites.trustSites;
		for (let i = 0; i < trustSites.length; i++) {
			let trustSpreader = trustSites[i];
			if (trustSpreader instanceof Object) trustSpreader = trustSpreader.url;
			if (trustSpreader === spreader) {
				pageRank = i + 1;
				break;
			}
		}

		motdLogger.addLog(motdMessage, type, {code, pageRank});
		if (!puppet.quiet) logger.addLog(motdMessage, type, {code, pageRank});
		else {
			delete motdMessage.spreader;
			logger.addLog(motdMessage, type, {code, quiet: puppet.quiet});
		}
		const message = "Motd forwarding...";
		console.log(message);
		postTrustSites(motdMessage, spreader);
		res.json({message});
	} else {
		const message = "Motd has already forwarded";
		console.log(message);
		res.json({message});
	}
});

app.get("/query", (req, res) => {
	if (!req.query || !req.query.action) {
		const message = "Missing query action";
		res.status(500).json({message});
		return;
	}
	const action = req.query.action;
	switch (action) {
		case "getDir":
			const dirName = req.query.dirName || "upload";
			const dirPath = path.join(rootDir, dirName);
			const dirInfo = getDir(dirPath);
			if (dirInfo.isError) {
				res.status(500).json(dirInfo);
				return;
			}
			if (!puppet.quiet) {
				console.log(dirInfo.message);
				res.json(dirInfo);
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getMotdMsg":
			if (!puppet.quiet) {
				const message = motd.data.message;
				const motdMessages = motdLogger.getLogs();
				console.log("Motd:", message);
				res.json({message, motdMessages});
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getListSites":
			const mainSitesLength = listSites.mainSites.length;
			const trustSitesLength = listSites.trustSites.length;
			const blackSitesLength = listSites.blackSites.length;
			const message = `"mainSites" got ${mainSitesLength}, "trustSites" got ${trustSitesLength}, "blackSites" got ${blackSitesLength} url(s)`;
			const listSitesInfo = {
				message,
				mainSitesLength,
				trustSitesLength,
				blackSitesLength,
				mainSites: listSites.mainSites.slice(0, 100),
				trustSites: listSites.trustSites.slice(0, 100),
				blackSites: listSites.blackSites.slice(0, 100)
			};
			if (!puppet.quiet) {
				console.log(message);
				res.json(listSitesInfo);
			}
			else res.json({quiet: puppet.quiet});
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
	if (!puppet.quiet) logger.addClient(res, "log", {code: 5, sitesLength: listSites[puppet.current].length, urlSuccess: listSites.urlSuccess, urlFailed: listSites.urlFailed, ...puppet});
	else logger.addClient(res, "log", {code: 5, sitesLength: listSites[puppet.current].length, ...puppet});
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

		case "changeCounter":
			puppet.counter = req.body.counter;
			break;

		case "changeMode":
			puppet.quiet = req.body.quiet;
			puppet.mode = puppet.quiet ? "quiet" : "normal";
			break;
	}
	runPuppet(reqAct, res);
});

app.post("/motd", (req, res) => {
	let code, message, type;
	const action = req.query.action;
	switch (action) {
		case "update":
			code = 24;
			message = `Motd updated: "${req.body.message}"`;
			type = "success";
			motd.data.message = req.body.message;
			break;
	}

	const file = path.join(__dirname, "assets", "json", "motd.json");
	const data = JSON.stringify(motd, null, "\t");
	try {
		fs.writeFileSync(file, data);
	} catch(err) {
		code = 44;
		message = err.toString();
		type = "error";
	}

	logger.addLog(message, type, {code, ...motd});
	res.json({code, message, type, ...motd});
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
		return {code: 22, message, content, dirs, files, links, pathContent, pathDirs, pathFiles, pathLinks, dirName, dirPath, total: content.length};
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
			return {code: 22, message, created, dirName, dirPath, total: 0};
		}
		const message = err.toString();
		console.error(message);
		return {code: 42, message, isError: true, ...err};
	}
}

function getRandomInList(list) {
	const length = list.length;
	if (puppet.counter < 10 && length >= 10) return Math.floor(Math.random() * 10);
	else if (puppet.counter < 100 && length >= 100) return Math.floor(Math.random() * 100);
	else if (puppet.counter < 1000 && length >= 1000) return Math.floor(Math.random() * 1000);
	else if (puppet.counter < 10000 && length >= 10000) return Math.floor(Math.random() * 10000);
	else if (puppet.counter < 100000 && length >= 100000) return Math.floor(Math.random() * 100000);
	else if (puppet.counter < 1000000 && length >= 1000000) return Math.floor(Math.random() * 1000000);
	else return Math.floor(Math.random() * length);
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

			randRequest();
			randPost(motd);
			randUpload(uploadDir);

			logger.addLog(msg, "success", {
				code: 7,
				started: puppet.started,
				current: puppet.current,
				counter: puppet.counter
			});
			if (res) res.json({
				code: 7,
				message: msg,
				type: "success",
				started: puppet.started,
				current: puppet.current,
				counter: puppet.counter
			});
			break;

		case "stop":
			msg = `Puppet stopped with ${puppet.total} request, ${puppet.success} success, ${puppet.failed} failed`;
			puppet.started = false;
			if (!puppet.quiet) {
				logger.addLog(msg, "success", {code: 8, started: puppet.started, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed, urlSuccess: listSites.urlSuccess, urlFailed: listSites.urlFailed});
				const urlFailed = [];
				for (const {url} of listSites.urlFailed) {
					urlFailed.push(url);
				}
				console.log('URL failed:', urlFailed);
			}
			else logger.addLog(msg, "success", {code: 8, started: puppet.started, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed});
			if (res) res.json({
				code: 8,
				message: msg,
				type: "success",
				started: puppet.started,
				counter: puppet.counter,
				total: puppet.total,
				success: puppet.success,
				failed: puppet.failed,
				urlSuccess: !puppet.quiet ? listSites.urlSuccess : undefined,
				urlFailed: !puppet.quiet ? listSites.urlFailed : undefined
			});
			clear();
			break;

		case "changeList":
			msg = `Puppet URLs list changed to "${puppet.current}"`;
			puppet.counter = 0;
			logger.addLog(msg, "success", {code: 9, current: puppet.current, counter: puppet.counter, sitesLength: listSites[puppet.current].length});
			if (res) res.json({
				code: 9,
				message: msg,
				type: "success",
				current: puppet.current,
				counter: puppet.counter,
				sitesLength: listSites[puppet.current].length
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

		case "changeCounter":
			msg = `Puppet counter changed to "${puppet.counter}"`;
			logger.addLog(msg, "success", {code: 11, counter: puppet.counter});
			if (res) res.json({
				code: 11,
				message: msg,
				type: "success",
				counter: puppet.counter
			});
			break;

		case "changeMode":
			msg = `Puppet mode changed to "${puppet.mode}"`;
			logger.addLog(msg, "success", {code: 12, mode: puppet.mode, quiet: puppet.quiet});
			if (res) res.json({
				code: 12,
				message: msg,
				type: "success",
				mode: puppet.mode,
				quiet: puppet.quiet
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

function linkParse(origin) {
	let protocol = "https://";
	let host = origin;
	const patt = /^.*:\/\//i;
	if (patt.test(host)) {
		protocol = patt.exec(host)[0];
		host = host.replace(patt, "");
	}
	const url = `${protocol}${host}`;
	return {protocol, host, url, origin,
		src: function (url) {
			if (/^data/i.test(url) || /^http/i.test(url)) return url;
			else {
				if (/^\/\//i.test(url)) {
					const srcPath = url.slice(2);
					return `${this.protocol}${srcPath}`;
				}
				else if (/^\//i.test(url)) {
					const srcPath = url.slice(1);
					return `${this.protocol}${path.join(this.host, srcPath)}`;
				} else return `${this.protocol}${path.join(this.host, url)}`;
			}
		}
	};
}

function parseHTML(html) {
	let dom, document;
	const virtualConsole = new VirtualConsole();
	try {
		dom = new JSDOM(html, { virtualConsole, pretendToBeVisual: true });
	} catch(err) {
		console.error("Error parsing HTML:", err.toString());
	}
	if (dom && dom.window && dom.window.document) document = dom.window.document;
	return document;
}

function clear() {
	puppet.total = 0;
	puppet.counter = 0;
	puppet.success = 0;
	puppet.failed = 0;
	listSites.urlFailed.length = 0;
	listSites.urlSuccess.length = 0;
	logger.clear();
}

async function randRequest() {
	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				if (!puppet.started) {
					resolve(puppet);
					return;
				}
				const rand = getRandomInList(listSites[puppet.current]);
				const link = linkParse(listSites[puppet.current][rand]);
				const url = link.url;
				const pageRank = rand + 1;
				const msg = `Rank ${pageRank}: ${url}`;
				if (!puppet.quiet) console.log(msg);
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
					if (!puppet.started) return;
					if (error) {
						const code = 1;
						const message = error.toString();
						if (!puppet.quiet) listSites.urlFailed.push({code, message, url, errorCode: error.code, errorMessage: error.syscall});
						++puppet.failed;
						const msg = `Failed (${puppet.failed}/${puppet.total}) : ${error.code} : ${url}`;
						if (!puppet.quiet) logger.addLog(msg, "error", {code, url, pageRank, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: error.code, errorMessage: error.syscall});
						else logger.addLog("", "error", {code, quiet: puppet.quiet, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
						return;
					}
					if (response.statusCode !== 200) {
						const code = 1;
						const message = response.statusMessage;
						if (!puppet.quiet) listSites.urlFailed.push({code, message, url, errorCode: response.statusCode, errorMessage: message});
						++puppet.failed;
						const msg = `Failed (${puppet.failed}/${puppet.total}) : ${response.statusCode} : ${url}`;
						if (!puppet.quiet) logger.addLog(msg, "error", {code, url, pageRank, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: response.statusCode, errorMessage: message});
						else logger.addLog("", "error", {code, quiet: puppet.quiet, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
					} else {
						const urlData = {url, pageRank};
						if (!puppet.quiet) listSites.urlSuccess.push(urlData);
						++puppet.success;
						const msg = `Success (${puppet.success}/${puppet.total})`;
						if (!puppet.quiet) console.log(msg);
						const document = parseHTML(body); 
						if (document) {
							const paras = document.querySelectorAll("p");
							if (paras.length) {
								const rand = Math.floor(Math.random() * paras.length);
								const para = paras[rand];
								const paraText = para.textContent.trim();
								if (paraText) {
									console.log(paraText);
									const code = 20;
									const elements = para.querySelectorAll("*");
									const aLinks = para.querySelectorAll("a");
									const images = para.querySelectorAll("img");
									for (const element of elements) {
										element.removeAttribute("class");
										element.removeAttribute("style");
									}
									for (const aLink of aLinks) {
										aLink.setAttribute("target", "_blank");
										aLink.href = link.src(aLink.href);
									}
									for (const image of images) {
										image.src = link.src(image.src);
									}
									const paraHTML = para.innerHTML;
									if (!puppet.quiet) logger.addLog(paraHTML, "info", {code, url, pageRank, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
									else logger.addLog(paraHTML, "info", {code, quiet: puppet.quiet, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
									urlData.code = code;
									urlData.message = "paragraph";
								}
							}
							else if (document.querySelectorAll("img").length) {
								let image;
								if (document.querySelectorAll('img[src*=".jpg" i]').length) {
									const imageJPGs = document.querySelectorAll('img[src*=".jpg" i]');
									const rand = Math.floor(Math.random() * imageJPGs.length);
									image = imageJPGs[rand];
								}
								else if (document.querySelectorAll('img[src*=".webp" i]').length) {
									const imageWEBPs = document.querySelectorAll('img[src*=".webp" i]');
									const rand = Math.floor(Math.random() * imageWEBPs.length);
									image = imageWEBPs[rand];
								}
								else if (document.querySelectorAll('img[src*=".png" i]').length) {
									const imagePNGs = document.querySelectorAll('img[src*=".png" i]');
									const rand = Math.floor(Math.random() * imagePNGs.length);
									image = imagePNGs[rand];
								}
								else {
									const images = document.querySelectorAll("img");
									const rand = Math.floor(Math.random() * images.length);
									image = images[rand];
								}
								image.removeAttribute("class");
								image.removeAttribute("style");
								image.src = link.src(image.src);
								image = image.outerHTML;
								const code = 21;
								if (!puppet.quiet) {
									console.log("Image found:", url);
									logger.addLog(image, "info", {code, url, pageRank, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
								} else logger.addLog(image, "info", {code, quiet: puppet.quiet, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
								urlData.code = code;
								urlData.message = "image";
							}
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

function postTrustSites(data, spreader) {
	const trustSites = listSites.trustSites;
	for (let url of trustSites) {
		if (url instanceof Object) url = url.url;
		if (url === domain || url === spreader) continue;
		if (!/^http/i.test(url)) url = `https://${url}`;
		const options = {
			method: "POST",
			url,
			strictSSL: false,
			json: true,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
			},
			body: data
		};

		request(options, function (error, response, body) {
			if (error) {
				if (!puppet.quiet) console.error("Motd forward error:", error.toString());
				return;
			}
		});
	}
}

async function randPost(data) {
	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				const rand = getRandomInList(listSites[puppet.current]);
				let url = listSites[puppet.current][rand];
				if (!/^http/i.test(url)) url = `https://${url}`;
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
// 						if (!puppet.quiet) console.error("====> Post:", error.toString());
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
		formData.append("message", `File(s) upload by "Message Spreader"`);
	}

	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				const rand = getRandomInList(listSites[puppet.current]);
				let url = listSites[puppet.current][rand];
				if (!/^http/i.test(url)) url = `https://${url}`;
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
// 						if (!puppet.quiet) console.error("====> Upload:", error.toString());
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

