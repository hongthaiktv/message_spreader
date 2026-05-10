//for file with extra option (see https://www.npmjs.com/package/form-data)

const fs = require('fs');

class FormUpload extends Object {
	files = [];
	length = 0;

	constructor(key, value) {
		super();
		if (key && !value) {
			if (key && typeof key === 'string') {
				const file = this.#createFile(key);
				this.files.push(file);
				++this.length;
			}
			else if (key && key instanceof Array) {
				for (const path of key) {
					const file = this.#createFile(path);
					this.files.push(file);
					++this.length;
				}
			}
		}
		else if (key && value) {
			this[key] = value;
			++this.length;
		}
	}

	append(key, value) {
		if (key && !value) {
			const file = this.#createFile(key);
			this.files.push(file);
		}
		else if (key && value) this[key] = value;
		else throw new Error('Wrong argument(s).');
		++this.length;
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
		this.length = this.length - filesLength;
		delete this.files;
	}

	#createFile(path) {
		return fs.createReadStream(path);
	}
}

module.exports = exports = FormUpload;

