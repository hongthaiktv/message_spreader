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

	addClient(client, type = "log") {
		this.#clients.push(client);
		const msg = `${this.#prefix}Client added. Total: ${this.#clients.length}`;
		console.log(msg);
		const logData = {
			message: msg,
			type: type
		};
		this.#update("add", logData, client);
	}

	getClients() {
		return this.#clients;
	}

	addLog(log, type = "log") {
		this.#logs.push(log);
		const msg = `${this.#prefix}${log.trim()}`;
		console.log(msg);
		const logData = {
			message: msg,
			type: type
		};
		this.#update("update", logData);
	}

	getLogs() {
		return this.#logs;
	}

	removeClient(client, type = "log") {
		let msg;
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			msg = `${this.#prefix}Client disconnected. Left: ${clients.length}`;
			console.log(msg);
		}
		const logData = {
			message: msg,
			type: type
		};
		this.#update("remove", logData);
	}

	setPrefix(name) {
		this.#prefix = name;
	}
}

module.exports = exports = Logger;

