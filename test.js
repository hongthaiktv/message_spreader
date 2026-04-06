const path = require('path');
const express = require('express');
const app = express();
const port = 3001;
const rootDir = path.join(__dirname, "public");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(rootDir));

app.post("/post", (req, res) => {
	console.log(req.headers);
	console.log(req.body);
	res.json({result: "server response"});
});

app.listen(port, () => {
	console.log(`Testing web server running at http://localhost:${port}`);
});

