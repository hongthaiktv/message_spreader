const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const serveIndex = require('serve-index');
const request = require('request');
const multer = require('multer');
const { JSDOM, VirtualConsole } = require("jsdom");
const { Logger, FormUpload } = require('./plugin/tutils/index.js');
const port = 3000;
const domain = process.env.DOMAIN || `http://localhost:${port}`;

const APPJSON = {
	setting: require('./assets/json/setting.json'),
	motd: require('./assets/json/motd.json'),
	mainSites: require('./assets/json/mainSites.json'),
	trustSites: require('./assets/json/trustSites.json'),
	blackSites: require('./assets/json/blackSites.json')
};

const setting = APPJSON.setting;
const motd = APPJSON.motd;
const rootDir = path.join(__dirname, "public");
const uploadDir = path.join(rootDir, "upload");
const uploadDirInfo = getDir(uploadDir, true);
if (uploadDirInfo.isError) console.error(`Get "${uploadDirInfo.dirName}" directory failed`);

const app = express();
const logger = new Logger("");
const motdLogger = new Logger({prefix: "", record: true});
const uploadLogger = new Logger({prefix: "", record: true});
const storage = multer.diskStorage({
	destination: uploadDir,
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
});
const uploader = multer({ storage });

let server;
const listSites = {
	mainSites: APPJSON.mainSites,
	trustSites: APPJSON.trustSites,
	blackSites: APPJSON.blackSites,
	step: 100,
	urlFailed: [],
	urlSuccess: [],
	getRank: function (url, list) {
		let rank = 0;
		list = listSites[list];
		for (let i = 0; i < list.length; i++) {
			let listUrl = list[i];
			if (listUrl instanceof Object) listUrl = listUrl.url;
			if (listUrl === url) {
				rank = i + 1;
				break;
			}
		}
		return rank;
	}
};

const puppet = {
	started: false,
	quiet: setting.quiet,
	rate: setting.rate,
	total: 0,
	counter: 0,
	success: 0,
	failed: 0,
	current: setting.current,
	mode: setting.mode,
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


// Starting point
if (puppet.quickStart) runPuppet("start");

app.post("/", (req, res, next) => {
	const contentType = req.get("Content-Type");
	if (/application\/json/i.test(contentType)) next();
	else if (/multipart\/form-data/i.test(contentType)) {
		if (!req.query || !req.query.integrity) {
			const message = "Missing integrity of url query";
			console.error("Deliver:", message);
			res.status(500).json({message});
			return;
		}

		const integrity = req.query.integrity;
		const uploadLogs = uploadLogger.getLogs();
		let existUpload = false;

		for (let i = 0; i < uploadLogs.length; i++) {
			const uploadIntegrity = uploadLogs[i].integrity;
			if (uploadIntegrity === integrity) {
				existUpload = true;
				break;
			}
		}

		if (!existUpload) uploader.array("files")(req, res, callback);
		else {
			const message = "Upload has already forwarded";
			console.log("Deliver:", message);
			res.json({message});
		}

		function callback() {
			if (req.files && req.files.length) {
				const files = [];
				for (const {path} of req.files) {
					files.push(path);
				}
				const hash = hashGenerate(files, "sha1");
				if (hash !== integrity) {
					const message = "File(s) integrity verify failed";
					console.error("Deliver:", message);
					res.json({message});
					return;
				}
				uploadDirInfo.refresh();

				const code = 25;
				const type = "motd";
				const uploadMessage = req.body.message;
				const { spreader } = req.body;
				const pageRank = listSites.getRank(spreader, "trustSites");
				const upload = {code, integrity, message: uploadMessage};

				uploadLogger.addLog(upload, type, {spreader, pageRank});

				if (!puppet.quiet) {
					const dirInfo = {message: uploadDirInfo.message, content: uploadDirInfo.content, dirs: uploadDirInfo.dirs, files: uploadDirInfo.files, links: uploadDirInfo.links};
					logger.addLog(upload, type, {url: spreader, pageRank, dirInfo});
				}
				else logger.addLog(upload, type, {quiet: puppet.quiet});

				const message = `${req.files.length} file(s) forwarding...`;
				console.log("Deliver:", message);
				deliverUpload(files, spreader, integrity, uploadMessage);
				res.json({message});
			}
			else {
				const message = "No file(s) uploaded.";
				console.log("Deliver:", message);
				res.json({message});
			}
		}
	}
}, (req, res) => {
	if (!req.query || !req.query.integrity) {
		const message = "Missing integrity of url query";
		console.error("Deliver:", message);
		res.status(500).json({message});
		return;
	}

	const integrity = req.query.integrity;
	const motdLogs = motdLogger.getLogs();
	let existMessage = false;

	for (let i = 0; i < motdLogs.length; i++) {
		const motdIntegrity = motdLogs[i].integrity;
		if (motdIntegrity === integrity) {
			existMessage = true;
			break;
		}
	}

	if (!existMessage) express.json()(req, res, callback);
	else {
		const message = "Motd has already forwarded";
		console.log("Deliver:", message);
		res.json({message});
	}

	function callback() {
		const code = 23;
		const type = "motd";
		const motdMessage = req.body;
		const { spreader, data } = motdMessage;
		const pageRank = listSites.getRank(spreader, "trustSites");

		const hash = hashGenerate(JSON.stringify(data, null, "\t"), "sha1");
		if (hash !== integrity) {
			const message = "Motd integrity verify failed";
			console.error("Deliver:", message);
			res.json({message});
			return;
		}

		motdMessage.integrity = integrity;
		motdLogger.addLog(motdMessage, type, {code, pageRank});
		if (!puppet.quiet) logger.addLog(motdMessage, type, {code, pageRank});
		else {
			delete motdMessage.spreader;
			logger.addLog(motdMessage, type, {code, quiet: puppet.quiet});
		}
		const message = "Motd forwarding...";
		console.log("Deliver:", message);
		motdMessage.spreader = domain;
		deliverMotd(motdMessage, spreader, integrity);
		res.json({message});
	}
});

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
	switch (action) {
		case "getDir":
			if (!puppet.quiet) {
				const dirName = req.query.dirName || "upload";
				const dirPath = path.join(rootDir, dirName);
				let dirInfo = getDir(dirPath);
				if (dirInfo.isError) {
					res.status(500).json(dirInfo);
					return;
				}
				dirInfo = {message: dirInfo.message, content: dirInfo.content, dirs: dirInfo.dirs, files: dirInfo.files, links: dirInfo.links};
				console.log(dirInfo.message);
				res.json(dirInfo);
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getUploadMsg":
			if (!puppet.quiet) {
				const uploadMessages = uploadLogger.getLogs();
				res.json({uploadMessages});
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getMotdMsg":
			if (!puppet.quiet) {
				const motdInfo = getMotdMsg();
				console.log("Motd:", motdInfo.message);
				res.json(motdInfo);
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getListSite":
			if (!puppet.quiet) {
				const {listSite} = req.query;
				const start = +req.query.start || 0;
				const listSiteInfo = getListSite(listSite, start);
				console.log(listSiteInfo.message);
				res.json(listSiteInfo);
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getListSites":
			if (!puppet.quiet) {
				const start = +req.query.start || 0;
				const listSitesInfo = getListSites(start);
				console.log(listSitesInfo.message);
				res.json(listSitesInfo);
			}
			else res.json({quiet: puppet.quiet});
			break;

		case "getUrls":
			if (!puppet.quiet) {
				const list = req.query.list;
				const start = +req.query.start || 0;
				const end = start + listSites.step;
				const urls = listSites[list].slice(start, end);
				res.json(urls);
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
	if (!puppet.quiet) {
		const listSitesInfo = getListSites();
		const motdInfo = getMotdMsg();
		uploadDirInfo.refresh();
		const uploadMessages = uploadLogger.getLogs();
		const dirInfo = {message: uploadDirInfo.message, content: uploadDirInfo.content, dirs: uploadDirInfo.dirs, files: uploadDirInfo.files, links: uploadDirInfo.links, uploadMessages};
		logger.addClient(res, "log", {code: 5, sitesLength: listSites[puppet.current].length, urlSuccess: listSites.urlSuccess, urlFailed: listSites.urlFailed, listSitesInfo, motdInfo, dirInfo, ...puppet});
	}
	else logger.addClient(res, "log", {code: 5, sitesLength: listSites[puppet.current].length, ...puppet});
});

app.post("/puppet", (req, res) => {
	const reqAct = req.body.action;
	switch (reqAct) {
		case "changeList":
			puppet.current = req.body.list || "mainSites";
			setting.current = puppet.current;
			updateJSON("setting");
			break;

		case "changeRate":
			puppet.rate = req.body.rate;
			setting.rate = puppet.rate;
			updateJSON("setting");
			break;

		case "changeCounter":
			puppet.counter = req.body.counter;
			break;

		case "changeMode":
			puppet.quiet = req.body.quiet;
			puppet.mode = puppet.quiet ? "quiet" : "normal";
			setting.quiet = puppet.quiet;
			setting.mode = puppet.mode;
			updateJSON("setting");
			break;
	}
	runPuppet(reqAct, res);
});

app.post("/url", (req, res) => {
	const {action} = req.body;
	switch (action) {
		case "create": {
			const {listSite, url, query} = req.body.urlData;
			const data = {url, query};
			APPJSON[listSite].push(data);
			updateJSON(listSite);
			const index = APPJSON[listSite].length - 1;
			const code = 27;
			const type = "success";
			const message = `URL list "${listSite}:${index}" added`;
			const listSiteInfo = getListSite(listSite);
			logger.addLog(message, type, {code, listSite, index, url, query, listSiteInfo});
			res.json({code, message, type, listSite, index, url, query, listSiteInfo});
			break;
		}

		case "update": {
			const {listSite, index, url, query} = req.body.urlData;
			const listSiteUrl = APPJSON[listSite][index].url;
			const listSiteQuery = APPJSON[listSite][index].query;
			if (listSiteUrl === url && listSiteQuery === query) {
				const code = 46;
				const type = "error";
				const message = `URL list "${listSite}:${index}" nothing change to update`;
				logger.addLog(message, type, {code, listSite, index, url, query});
				res.status(500).json({code, message, type, listSite, index, url, query});
				return;
			}
			const data = {url, query};
			APPJSON[listSite][index] = data;
			updateJSON(listSite);
			const code = 26;
			const type = "success";
			const message = `URL list "${listSite}:${index}" updated`;
			logger.addLog(message, type, {code, listSite, index, url, query});
			res.json({code, message, type, listSite, index, url, query});
			break;
		}
	}
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

	try {
		updateJSON("motd");
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
	console.log("Upload:", message);
	if (req.body && req.body.message) console.log(req.body.message);
	if (req.files && req.files.length) uploadDirInfo.refresh();
	res.json({message});
});

app.use(serveIndex(rootDir, {
	'icons': true,
	'view': 'details'
}));

app.get("*", (req, res) => res.status(404).sendFile(path.join(rootDir, "404.html")));

server = app.listen(port, () => {
	console.log(`Web server running at http://localhost:${port}`);
	console.log(getListSites().message);
	console.log(uploadDirInfo.message);
	console.log("Motd:", motd.data.message);
});

function getDir(dirPath, created = false) {
	const dirName = path.basename(dirPath);
	const result = {
		code: 22,
		message: "",
		dirPath, dirName,
		content: [], dirs: [], files: [], links: [],
		pathContent: [], pathDirs: [], pathFiles: [], pathLinks: [],
		total: 0,
		filesIntegrity: "",
		refresh: function () {
			this.content.length = 0; this.dirs.length = 0; this.files.length = 0; this.links.length = 0; 
			this.pathContent.length = 0; this.pathDirs.length = 0; this.pathFiles.length = 0; this.pathLinks.length = 0;
			const dirContent = fs.readdirSync(this.dirPath, {withFileTypes: true});
			for (const file of dirContent) {
				const filePath = path.join(this.dirPath, file.name);
				this.content.push(file.name);
				this.pathContent.push(filePath);
				if (file.isFile()) {this.files.push(file.name); this.pathFiles.push(filePath);}
				else if (file.isDirectory()) {this.dirs.push(file.name); this.pathDirs.push(filePath);}
				else if (file.isSymbolicLink()) {this.links.push(file.name); this.pathLinks.push(filePath);}
			}
			this.total = this.content.length;
			this.message = `Directory "${this.dirName}" got ${this.dirs.length} directori(es), ${this.files.length} file(s), ${this.links.length} link(s). Total: ${this.total}`;
			this.filesIntegrity = hashGenerate(this.pathFiles, "sha1");
		}
	};

	try {
		const dirContent = fs.readdirSync(dirPath, {withFileTypes: true});
		for (const file of dirContent) {
			const filePath = path.join(dirPath, file.name);
			result.content.push(file.name);
			result.pathContent.push(filePath);
			if (file.isFile()) {result.files.push(file.name); result.pathFiles.push(filePath);}
			else if (file.isDirectory()) {result.dirs.push(file.name); result.pathDirs.push(filePath);}
			else if (file.isSymbolicLink()) {result.links.push(file.name); result.pathLinks.push(filePath);}
		}
		result.total = result.content.length;
		result.message = `Directory "${dirName}" got ${result.dirs.length} directori(es), ${result.files.length} file(s), ${result.links.length} link(s). Total: ${result.total}`;
		result.filesIntegrity = hashGenerate(result.pathFiles, "sha1");
		return result;
	} catch(err) {
		if (err.errno === -2 && created) {
			try {
				fs.unlinkSync(dirPath);
			} catch(err) {
				console.error(err.toString());
			}
			fs.mkdirSync(dirPath, {recursive: true});
			result.created = true;
			const message = `Directory created: ${dirPath}`;
			result.message = message;
			console.log(message);
			return result;
		}
		const message = err.toString();
		console.error(message);
		return {code: 42, message, dirName, isError: true, ...err};
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

		case "changeMode": {
			const code = 12;
			const type = "success";
			const mode = puppet.mode;
			const quiet = puppet.quiet;
			msg = `Puppet mode changed to "${mode}"`;
			if (!quiet) {
				const listSitesInfo = getListSites();
				const motdInfo = getMotdMsg();
				uploadDirInfo.refresh();
				const uploadMessages = uploadLogger.getLogs();
				const dirInfo = {message: uploadDirInfo.message, content: uploadDirInfo.content, dirs: uploadDirInfo.dirs, files: uploadDirInfo.files, links: uploadDirInfo.links, uploadMessages};
				logger.addLog(msg, type, {code, mode, quiet, listSitesInfo, motdInfo, dirInfo});
				if (res) res.json({code, message: msg, type, mode, quiet, listSitesInfo, motdInfo, dirInfo});
			}
			else {
				logger.addLog(msg, type, {code, mode, quiet});
				if (res) res.json({code, message: msg, type, mode, quiet});
			}
			break;
		}

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
	let host = origin instanceof Object ? origin.url : origin;
	const patt = /^.*:\/\//i;
	if (patt.test(host)) {
		protocol = patt.exec(host)[0];
		host = host.replace(patt, "");
	}
	const url = `${protocol}${host}`;
	return {protocol, host, url, origin,
		query: origin instanceof Object ? origin.query || "p" : "p",
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
	FormUpload.closeAll();
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
				let url = listSites[puppet.current][rand];
				const link = linkParse(url);
				url = link.url;
				const pageRank = rand + 1;
				const msg = `Rank ${pageRank}: ${url}`;
				if (!puppet.quiet) console.log(msg);
				const options = {
					url,
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
						if (!puppet.quiet) logger.addLog(msg, "error", {code, url, pageRank, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed, errorCode: error.code, errorMessage: error.syscall || "server error"});
						else logger.addLog("", "error", {code, quiet: puppet.quiet, counter: puppet.counter, total: puppet.total, success: puppet.success, failed: puppet.failed}, false);
						return;
					}
					if (response.statusCode !== 200) {
						const code = 1;
						const message = response.statusMessage || "request error";
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
							const paras = document.querySelectorAll(link.query);
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

function deliverMotd(data, spreader, integrity) {
	const trustSites = listSites.trustSites;
	for (let url of trustSites) {
		if (url instanceof Object) url = url.url;
		if (url === domain || url === spreader) continue;
		if (!/^http/i.test(url)) url = `https://${url}`;
		url += `?integrity=${integrity}`;
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
// 				if (!puppet.quiet) console.error("Motd forward error:", error.toString());
				return;
			}
		});
	}
}

function deliverUpload(files, spreader, integrity, message) {
	const trustSites = listSites.trustSites;
	for (let url of trustSites) {
		if (url instanceof Object) url = url.url;
		if (url === domain || url === spreader) continue;
		if (!/^http/i.test(url)) url = `https://${url}`;
		url += `?integrity=${integrity}`;

		const formData = new FormUpload(files);
		formData.append("spreader", domain);
		formData.append("message", message);

		const options = {
			method: "POST",
			url,
			strictSSL: false,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
			},
			formData
		};

		request(options, function (error, response, body) {
			if (error) {
// 				if (!puppet.quiet) console.error("File(s) forward error:", error.toString());
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
				if (url instanceof Object) url = url.url;
				if (!/^http/i.test(url)) url = `https://${url}`;
				if (data.integrity) url += `?integrity=${data.integrity}`;
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

async function randUpload(dirPath) {
	const files = uploadDirInfo.pathFiles;

	function wait() {
		return new Promise((resolve) => {
			const time = puppet.rate === 0 ? 500 : puppet.rate * 1000;
			const randTime = Math.floor(Math.random() * time + 1);
			setTimeout(() => {
				const rand = getRandomInList(listSites[puppet.current]);
				let url = listSites[puppet.current][rand];
				if (url instanceof Object) url = url.url;
				if (!/^http/i.test(url)) url = `https://${url}`;
				const integrity = uploadDirInfo.filesIntegrity;
				url += `?integrity=${integrity}`;

				const randByte = Math.floor(Math.random() * 10000);
				const dummyFile = Buffer.alloc(randByte);
				crypto.randomFillSync(dummyFile, 0, dummyFile.length);

				const formData = new FormUpload(files);
				formData.append("message", `File(s) upload by "Message Spreader"`);
				formData.append("spreader", domain);
				formData.append(dummyFile);

				const options = {
					method: "POST",
					url,
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

function updateJSON(file) {
	const filePath = path.join(__dirname, "assets", "json", `${file}.json`);
	const jsonObj = APPJSON[file];

	if (file === "motd") {
		const motd = JSON.stringify(jsonObj.data, null, "\t");
		const hash = hashGenerate(motd, "sha1");
		jsonObj.integrity = hash;
		jsonObj.spreader = domain;
	}

	const data = JSON.stringify(jsonObj, null, "\t");
	fs.writeFileSync(filePath, data);
}

function hashGenerate(data, algorithm = "sha256") {
	const hash = crypto.createHash(algorithm);
	if (data instanceof Array) {
		for (const file of data) {
			const fileBuffer = fs.readFileSync(file);
			hash.update(fileBuffer);
		}
	}
	else hash.update(data);
	return hash.digest("hex");
}

function getListSite(listSite, start = 0, step = listSites.step) {
	const listSiteLength = listSites[listSite].length;
	const message = `"${listSite}" got ${listSiteLength} url(s)`;

	start = +start;
	const end = start + step;

	return {
		message,
		listSiteLength,
		listSite: listSites[listSite].slice(start, end)
	};
}

function getListSites(start = 0, step = listSites.step) {
	const mainSitesLength = listSites.mainSites.length;
	const trustSitesLength = listSites.trustSites.length;
	const blackSitesLength = listSites.blackSites.length;
	const message = `"mainSites" got ${mainSitesLength}, "trustSites" got ${trustSitesLength}, "blackSites" got ${blackSitesLength} url(s)`;

	start = +start;
	step = +step;
	const end = start + step;
	return {
		message,
		mainSitesLength,
		trustSitesLength,
		blackSitesLength,
		mainSites: listSites.mainSites.slice(start, end),
		trustSites: listSites.trustSites.slice(start, end),
		blackSites: listSites.blackSites.slice(start, end)
	};
}

function getMotdMsg() {
	const message = motd.data.message;
	const motdMessages = motdLogger.getLogs();
	return {message, motdMessages};
}
