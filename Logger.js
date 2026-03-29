class Logger extends EventTarget {
	#clients = [];
	#logs = [];
	#prefix = "Logger: ";

	constructor() {
		super();
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

	addClient(client) {
		this.#clients.push(client);
		const msg = `${this.#prefix}Client added. Total: ${this.#clients.length}`;
		console.log(msg);
		this.#update("add", msg, client);
	}

	getClients() {
		return this.#clients;
	}

	addLog(log) {
		this.#logs.push(log);
		const msg = `${this.#prefix}${log.trim()}`;
		console.log(msg);
		this.#update("update", msg);
	}

	getLogs() {
		return this.#logs;
	}

	removeClient(client) {
		let msg;
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			msg = `${this.#prefix}Client disconnected. Left: ${clients.length}`;
			console.log(msg);
		}
		this.#update("remove", msg);
	}
}

module.exports = exports = Logger;

