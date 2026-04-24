class Logger extends EventTarget {
	#clients = [];
	#logs = [];
	#prefix = "Logger: ";

	constructor(name) {
		super();
		if (name === "") this.#prefix = "";
		else if (name !== undefined) this.#prefix = `${name}: `;
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
		const msg = `${this.#prefix}Client added. Total: ${total}`;
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
		let options = {
			output: true,
			record: false
		};
		if (typeof output === "boolean") options.output = output;
		else if (output instanceof Object) options = {...options, ...output};
		log = log.trim();
		if (!log) return;
		if (options.record) this.#logs.push(log);
		const msg = `${this.#prefix}${log}`;
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		if (options.output) console.log(msg);
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
			msg = `${this.#prefix}Client disconnected. Left: ${total}`;
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
		this.#prefix = name;
	}

	clear() {
		this.#logs.length = 0;
	}
}

module.exports = exports = Logger;

