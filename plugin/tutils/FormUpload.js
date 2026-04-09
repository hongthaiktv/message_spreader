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
		else throw new Error('Wrong key name');
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
		return {
			value: fs.createReadStream(path),
			options: {
				filename: path.replace(/^.*\//g, ''),
				contentType: this.#checkType(path)
			}
		};
	}

	#checkType(path) {
		const ext = path.replace(/^.*\./g, '');
		switch (ext) {
			case "apng":
				return 'image/apng';
		
			case "avif":
				return 'image/avif';
		
			case "gif":
				return 'image/gif';
		
			case "jpg": case "jpeg":
				return 'image/jpeg';
		
			case "png":
				return 'image/png';
			
			case "svg":
				return 'image/svg+xml';
			
			case "webp":
				return 'image/webp';
			
			case "txt":
				return 'text/plain';
			
			case "pdf":
				return 'application/pdf';
			
			case "doc":
				return 'application/msword';
			
			case "docx":
				return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
			
			case "xls":
				return 'application/vnd.ms-excel';
			
			case "xlsx":
				return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
			
			case "ppt":
				return 'application/vnd.ms-powerpoint';
			
			case "pptx":
				return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
			
			case "md":
				return 'text/markdown';
			
			case "json":
				return 'application/json';
			
			case "xml":
				return 'application/xml';
			
			case "aac":
				return 'audio/aac';
			
			case "m4a":
				return 'audio/mp4';
			
			case "mp3":
				return 'audio/mpeg';
			
			case "weba":
				return 'audio/webm';
			
			case "webm":
				return 'video/webm';
			
			case "mp4":
				return 'video/mp4';
			
			case "avi":
				return 'video/x-msvideo';
			
			case "zip":
				return 'application/zip';
			
			case "7z":
				return 'application/x-7z-compressed';
			
			case "rar":
				return 'application/vnd.rar';
			
			case "tar":
				return 'application/x-tar';
			
			case "xz":
				return 'application/x-xz';
			
			case "gz":
				return 'application/x-gzip';
			
			default:
				return 'application/octet-stream';
		}
	}
}

module.exports = exports = FormUpload;

