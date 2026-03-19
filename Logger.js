class Logger extends EventTarget {
	#clients = [];

	constructor() {
		super();
	}

	#update() {
		console.log("Logger: Total client:", this.#clients.length);
		const ev = new CustomEvent("change", {detail: "add"});
		this.dispatchEvent(ev);
	}

	addClient(client) {
		this.#clients.push(client);
		this.#update();
	}

	getClients() {
		return this.#clients;
	}
}

exports.Logger = Logger;

