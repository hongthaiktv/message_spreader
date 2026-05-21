const o = {
	a: "aa",
	b: 11,
	fn: function () {
		console.log("message");
	}
}
const s = JSON.stringify(o, null, "\t")
console.log(s);

