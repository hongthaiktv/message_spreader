class Logger extends EventTarget {
	#clients = [];
	#logs = [];

	constructor() {
		super();
	}

	#update(act, log) {
		const data = {
			detail: {
				action: act,
				log: log
			}
		};
		const ev = new CustomEvent("change", data);
		this.dispatchEvent(ev);
	}

	addClient(client) {
		this.#clients.push(client);
		console.log("Logger: Client added. Total:", this.#clients.length);
		this.#update("add");
	}

	getClients() {
		return this.#clients;
	}

	addLog(log) {
		this.#logs.push(log);
		console.log(`Logger: ${log}`);
		for (const client of this.#clients) {
			client.write(`data: ${log}\n\n`);
		}
		this.#update("update", log);
	}

	getLogs() {
		return this.#logs;
	}

	removeClient(client) {
		const clients = this.#clients;
		if (clients.includes(client)) {
			const index = clients.indexOf(client);
			clients.splice(index, 1);
			console.log("Client disconnected. Left:", clients.length);
		}
		this.#update("remove");
	}
}

module.exports = exports = Logger;

