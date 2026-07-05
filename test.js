let arr = ["str1", "str2", "str3"]
arr.splice(2, 1)
console.log(arr, arr.length);
for (const key in arr) {
	console.log(key);
}
