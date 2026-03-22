let arr = [
	{name: "AA"},
	{name: "BB"}
];
let obj = {name1: "AA", name2: "BB"};
let n = 0, stop = 0;
let t = setTimeout(function () {
	console.log("3s");
}, 3000);
clearTimeout(t);
