let a = ["a", "b", "c"]
let b = a.splice(1, 1)
console.log(a);
console.log("length:", a.length);
let key = "";
for (const prop in a) {
	key += prop + " "
}
console.log(key);
