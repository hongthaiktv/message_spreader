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
	const msg = req.files ? req.files[0].destination : "text only";
	console.log(msg);
	console.log(req.files);
	res.json({result: msg});
});

app.listen(port, () => {
	console.log(`Testing web server running at http://localhost:${port}`);
});

