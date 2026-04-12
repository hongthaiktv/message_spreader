const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const app = express();
const port = 3001;
const rootDir = path.join(__dirname, "public");

const storage = multer.diskStorage({
	destination: path.join(rootDir, "uploads"),
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	}
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(rootDir));

app.post("/post", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	const msg = "post data received";
	res.json({result: msg});
});

app.post("/upload", upload.array("files"), (req, res) => {
	console.log(req.headers);
	const msg = req.files ? `Total ${req.files.length} file(s) uploaded.` : "No file(s) uploaded.";
	console.log(req.files);
	console.log(msg);
	console.log(req.body.message);
	res.json({result: msg});
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
			result.message = `Total ${dirContent.length} file(s) and directories`;
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

