let arr = ["str1", "str2", "str3"]
const rm = arr.splice(1, 1, "added", "add2")
console.log(rm, rm.length);
console.log(arr, arr.length);
// for (const key in arr) {
// 	console.log(key);
// }
