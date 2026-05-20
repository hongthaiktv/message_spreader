const fs = require("fs")
const crypto = require("crypto")
const motd = require("./assets/json/motd.json")

const s = JSON.stringify(motd.data, null, "\t")
// fs.writeFileSync("./tt.json", s)
console.log(s);
const hash = crypto.createHash("sha1").update(s).digest("hex")
console.log(hash);
