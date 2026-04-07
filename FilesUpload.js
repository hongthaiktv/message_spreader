const fs = require('fs');

class FilesUpload extends Object {
	files = [];
	constructor(files) {
		super();
		for (const path of files) {
			const file = {
				value: fs.createReadStream(path),
				options: {
					filename: path.replace(/^.*\//g, ''),
					contentType: this.#checkType(path)
				}
			};
			this.files.push(file);
		}
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
		}
	}
}

module.exports = exports = FilesUpload;

