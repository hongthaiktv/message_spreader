const fs = require('fs');

class FilesUpload extends Array {
	constructor(files) {
		super();
		if (files && files instanceof Array) {
			for (const path of files) {
				const file = this.#createFile(path);
				this.push(file);
			}
		}
	}

	addFile(path) {
		const file = this.#createFile(path);
		this.push(file);
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
		}
	}
}

module.exports = exports = FilesUpload;

