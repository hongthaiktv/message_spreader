let o = {
	a: "aa",
	b: 11
}
const map = o;
o = undefined;
console.log(o, map);

