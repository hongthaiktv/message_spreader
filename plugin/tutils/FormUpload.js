//for file with extra option (see https://www.npmjs.com/package/form-data)

const fs = require('fs');
const path = require('path');

class FormUpload extends Object {
	files = [];
	length = 0;
	static #openFiles = [];

	constructor(key, value) {
		super();
		if (key && !value) {
			if (key && typeof key === 'string') {
				this.#createFile(key);
			}
			else if (key && key instanceof Array) {
				for (const path of key) {
					this.#createFile(path);
				}
			}
		}
		else if (key && value) {
			this[key] = value;
			++this.length;
		}
	}

	append(key, value) {
		if (key && !value) this.#createFile(key);
		else if (key && value) {
			this[key] = value;
			++this.length;
		}
		else throw new Error('FormUpload: Wrong argument(s) for append().');
	}

	get(key) {
		return this[key];
	}

	delete(key) {
		for (const name in this) {
			if (key === name) {
				this.length = key === 'files' ? this.length - this.files.length : --this.length;
				delete this[key];
				return;
			}
		}
		throw new Error('Wrong key name');
	}

	deleteFiles() {
		const filesLength = this.files.length;
		this.length -= filesLength;
		delete this.files;
	}

	#createFile(filePath) {
		const openFiles = FormUpload.getOpenFiles();
		for (const {path, fd, stat} of openFiles) {
			if (path === filePath) {
				const file = fs.createReadStream(null, {fd, start: 0, end: stat.size});
				this.files.push(file);
				++this.length;
				return;
			}
		}

		try {
			const name = path.basename(filePath);
			const fd = fs.openSync(filePath, "r");
			const stat = fs.fstatSync(fd);
			const file = fs.createReadStream(null, {fd, start: 0, end: stat.size});
			this.files.push(file);
			++this.length;

			const fileData = {
				path: filePath,
				name, fd, stat
			};
			FormUpload.#openFiles.push(fileData);
		} catch(err) {
			console.error(err.toString());
		}
	}

	static getOpenFiles() {
		return this.#openFiles;
	}

	static closeOpenFiles() {
		for (const file of this.#openFiles) {
			try {
				fs.closeSync(file.fd);
			} catch(err) {
				console.error(err.toString());
			}
		}
	}
}

module.exports = exports = FormUpload;

