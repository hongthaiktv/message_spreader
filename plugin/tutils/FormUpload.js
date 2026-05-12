//for file with extra option (see https://www.npmjs.com/package/form-data)

const fs = require('fs');

class FormUpload extends Object {
	files = [];
	length = 0;

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
		else throw new Error('Wrong argument(s).');
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

	#createFile(path) {
		try {
			const value = fs.readFileSync(path);
			const filename = path.replace(/^.*\//g.exec(path)[0], "");
			const file = {
				value,
				options: {filename}
			};
			this.files.push(file);
			++this.length;
		} catch(err) {
			console.error(err.toString());
		}
	}
}

module.exports = exports = FormUpload;

