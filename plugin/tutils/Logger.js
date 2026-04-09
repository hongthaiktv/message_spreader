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
		const total = this.#clients.length;
		const msg = `${this.#prefix}Client added. Total: ${total}`;
		console.log(msg);
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
		let msg, total;
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			total = clients.length;
			msg = `${this.#prefix}Client disconnected. Left: ${total}`;
			console.log(msg);
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
}

module.exports = exports = Logger;

