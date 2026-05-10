class Logger extends EventTarget {
	#clients = [];
	#logs = [];
	#options = {
		prefix: "Logger: ",
		output: true,
		record: false
	};

	constructor(name) {
		super();
		if (typeof name === "string") this.#options.prefix = name;
		else if (name instanceof Object) this.#options = {...this.#options, ...name};
	}

	#update(act, log, client) {
		const data = {
			detail: {
				action: act,
				log: log,
				client: client
			}
		};
		const ev = new CustomEvent("change", data);
		this.dispatchEvent(ev);
	}

	addClient(client, type = "log", logData = {}, output = true) {
		this.#clients.push(client);
		const total = this.#clients.length;
		const msg = `${this.#options.prefix}Client added. Total: ${total}`;
		if (output) console.log(msg);
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		logData.totalClient = total;
		this.#update("add", logData, client);
	}

	getClients() {
		return this.#clients;
	}

	addLog(log, type = "log", logData = {}, output) {
		let options = {...this.#options};
		if (typeof output === "boolean") options.output = output;
		else if (output instanceof Object) options = {...options, ...output};
		if (!(logData instanceof Object)) {
			console.error("Wrong log data!");
			return;
		}
		if (!(log instanceof Object)) {
			log = `${this.#options.prefix}${log}`;
			if (log && options.output) console.log(log);
			logData.message = log;
			logData.type = type;
		}
		else {
			log = JSON.parse(JSON.stringify(log));
			logData = {...log, ...logData, type};
		}
		if (options.record) this.#logs.push(logData);
		this.#update("update", logData);
	}

	getLogs() {
		return this.#logs;
	}

	removeClient(client, type = "log", logData = {}, output = true) {
		let msg, total;
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			total = clients.length;
			msg = `${this.#options.prefix}Client disconnected. Left: ${total}`;
			if (output) console.log(msg);
		}
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		logData.total = total;
		this.#update("remove", logData);
	}

	setPrefix(name) {
		this.#options.prefix = name;
	}

	getOptions() {
		return this.#options;
	}

	setOptions(options) {
		this.#options = {...this.#options, ...options};
	}

	clear() {
		this.#logs.length = 0;
	}
}

module.exports = exports = Logger;

