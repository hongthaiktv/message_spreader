const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const request = require('request');
const motd = require('./assets/json/motd.json');

const app = express();
const port = 3001;
const rootDir = path.join(__dirname, "pub_test");

const storage = multer.diskStorage({
	destination: path.join(rootDir, "upload"),
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
});
const uploader = multer({ storage });

motd.spreader = "http://localhost:3001";
// randPost(motd);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(rootDir));

app.post("/", uploader.array("files"), (req, res) => {
	let message;
	console.log(req.query);
	const contentType = req.get("Content-Type");
	if (/application\/json/i.test(contentType)) {
		message = "Motd received.";
		console.log("Motd:", req.body.data.message);
	}
	else {
		message = req.files ? `Total ${req.files.length} file(s) received.` : "No file(s) uploaded.";
		console.log(req.files);
		console.log(message);
		console.log(req.body.spreader);
		console.log(req.body.message);
	}
	res.json({message});
});

app.post("/post", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	const msg = "post data received";
	res.json({result: msg});
});

app.post("/upload", uploader.array("files"), (req, res) => {
	console.log(req.headers);
	const message = req.files ? `Total ${req.files.length} file(s) uploaded.` : "No file(s) uploaded.";
	console.log(req.files);
	console.log(message);
	console.log(req.body.message);
	res.json({message});
});

app.get("/query", (req, res) => {
	if (!req.query || !req.query.action) {
		const message = "Missing query action";
		res.status(500).json({message});
		return;
	}
	const action = req.query.action;
	const dirName = req.query.dirName || "upload";
	const result = {};
	const dirPath = path.join(__dirname, "assets", dirName);
	switch (action) {
		case "getDir":
			const dirContent = fs.readdirSync(dirPath);
			result.message = `${dirName}: ${dirContent.length} file(s) and directories`;
			result.dirContent = dirContent;
			result.dirPath = dirPath;
			result.dirName = dirName;
			break;
	}
	res.json(result);
});

app.listen(port, () => {
	console.log(`Testing web server running at http://localhost:${port}`);
});

async function randPost(data) {
	let counter = 1;
	function wait() {
		return new Promise((resolve) => {
			const time = 5000;
			const randTime = Math.floor(Math.random() * time + 1);
			const url = `http://localhost:3000`;
			const postData = JSON.parse(JSON.stringify(data));
			if (counter === 2) {
				postData.integrity = `counter 2: ${postData.integrity}`;
				postData.spreader = "https://onepage.web.app";
				postData.data.message = `new message with <a href="https://google.com" target="_blank">link</a>`;
			}
			if (counter === 3) postData.data.message = `<a href="https://google.com" target="_blank">link</a>`;
			if (counter === 4) postData.spreader = `http://localhost:3002`;
			if (counter === 5) {
				postData.integrity = `new integ: ${postData.integrity}`;
				postData.spreader = "http://localhost:3002";
				postData.data.message = "message from 3002";
			}

			console.log("Sending to:", url, "| Wait:", randTime);

			setTimeout(() => {
				const options = {
					method: "POST",
					url: url,
					strictSSL: false,
					json: true,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:78.0) Gecko/78.0 Firefox/78.0'
					},
					body: postData
				};

				request(options, function (error, response, body) {
					if (error) {
						console.error("====> Post:", error.toString());
						return;
					}
				});
				resolve(data);
			}, randTime);
		});
	}
	while (counter <= 10) {
		await wait();
		++counter;
	}
}

