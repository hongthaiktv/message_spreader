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

	addClient(client, type = "log", logData = {}) {
		this.#clients.push(client);
		const msg = `${this.#prefix}Client added. Total: ${this.#clients.length}`;
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		console.log(msg);
		this.#update("add", logData, client);
	}

	getClients() {
		return this.#clients;
	}

	addLog(log, type = "log", logData = {}) {
		log = log.trim();
		if (!log) return;
		this.#logs.push(log);
		const msg = `${this.#prefix}${log}`;
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		console.log(msg);
		this.#update("update", logData);
	}

	getLogs() {
		return this.#logs;
	}

	removeClient(client, type = "log", logData = {}) {
		let msg;
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			msg = `${this.#prefix}Client disconnected. Left: ${clients.length}`;
			console.log(msg);
		}
		if (!logData instanceof Object) {
			console.error("Wrong log data!");
			return;
		}
		logData.message = msg;
		logData.type = type;
		this.#update("remove", logData);
	}

	setPrefix(name) {
		this.#prefix = name;
	}
}

module.exports = exports = Logger;

