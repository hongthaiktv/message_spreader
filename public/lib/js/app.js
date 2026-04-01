let SSE = false;
submit.onclick = async function(e) {
	e.preventDefault();
	let data = {
		fname: fData.fname.value,
		lname: fData.lname.value
	};
	const response = await fetch("http://localhost:3000/post", {
		method: "POST",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json"
		}
	});
	if (response.ok) {
		let res = await response.json();
		logger.innerText = res.result
	}
	else logger.innerText = `request error ${response.status}!`;
}

//puppet
let source = new EventSource("http://localhost:3000/logger");
source.onopen = e => SSE = true;
source.onmessage = e => log(JSON.parse(e.data));
source.onerror = e => {
	SSE = false;
	log("Logger disconnected.");
};
async function puppet(action, urls = "mainSites") {
	let data = {
		action: action,
		urls: urls
	};
	const response = await fetch("http://localhost:3000/puppet", {
		method: "POST",
		body: JSON.stringify(data),
		headers: {
			"Content-Type": "application/json"
		}
	});
	if (response.ok) {
		const res = await response.json();
		if (SSE && !res.nosse) return;
		else log(res);
	}
	else {
		const msg = `Request error ${response.status}!`;
		log(msg, "error");
	}
}

pupBtnStart.onclick = function(e) {
	puppet("start");
};

pupBtnStop.onclick = function(e) {
	puppet("stop");
};

pupBtnChange.onclick = function(e) {
	const urls = fPuppet.urls.value;
	puppet("change", urls);
};

pupBtnDisconnect.onclick = function(e) {
	source.close();
	SSE = false;
	log("Logger disconnected.");
};

function log(data, type = "log") {
	let divCard = document.createElement("DIV");
	let cardContent, cardType;
	if (data instanceof Object) {
		cardContent = data.message;
		cardType = data.type;
		switch (cardType) {
			case "error":
				if (data.code === 1) cardContent = `Failed (<span class="text-danger font-weight-bold">${data.failed}</span>/<span class="text-default font-weight-bold">${data.total}</span>) : <span class="text-danger font-weight-bold">${data.errorCode}</span> : <a class="text-primary" target="_blank" href="${data.url}">${data.url}</a>`;
				break;

			case "log":
				switch (data.code) {
					case 2:
						cardContent = `Paragraph not found: <a class="text-primary" target="_blank" href="${data.url}">${data.url}</a>`;
						break;

					case 3:
						cardContent = `Success (<span class="text-success font-weight-bold">${data.success}</span>/<span class="text-default font-weight-bold">${data.total}</span>)`;
						break;

					case 4:
						cardContent = `Rank ${data.pageRank}: <a class="text-primary" target="_blank" href="${data.url}">${data.url}</a>`;
						break;

					case 5:
						cardContent = `Client added. Total: <span class="text-default font-weight-bold">${data.total}</span>`;
						break;

					case 6:
						cardContent = `Client disconnected. Left: <span class="text-default font-weight-bold">${data.total}</span>`;
						break;
				}
				break;

			case "success":
				switch (data.code) {
					case 7:
						cardContent = `Puppet starting with "<span class="orange-text font-weight-bold">${data.current}</span>"...`;
						break;
				
					case 8:
						cardContent = `Puppet stopped with <span class="orange-text font-weight-bold">${data.total}</span> request, <span class="text-success font-weight-bold">${data.success}</span> success, <span class="text-danger font-weight-bold">${data.failed}</span> failed.`;
						break;

					case 9:
						cardContent = `Puppet URLs list changed to "<span class="orange-text font-weight-bold">${data.current}</span>".`;
						break;
				}
				break;
		}
		if (data.urlFailed && data.urlFailed.length) {
			cardContent += `<br><span class="text-danger font-weight-bold">URLs failed:</span>`;
			for (const url of data.urlFailed) {
				cardContent += `<br><a class="text-primary" target="_blank" href="${url}">${url}</a>`;
			}
		}
	} else {
		cardContent = data;
		cardType = type;
	}

	switch (cardType) {
		case "info": case "error": case "warning": case "success":
			let logType;
			switch (cardType) {
				case "info":
					logType = "purple-gradient-rgba";
					break;
			
				case "error":
					logType = "young-passion-gradient";
					break;
				
				case "warning":
					logType = "peach-gradient-rgba";
					break;

				case "success":
					logType = "aqua-gradient-rgba";
					break;
			}
			divCard.innerHTML = `
			<div class="card-body px-3 py-2 mask ${logType}">
			  <p class="card-text text-white">${cardContent}</p>
			</div>
			`;
			divCard.className = `card gradient-card mb-2 ${cardType}`;
			break;
		default:
			divCard.innerHTML = cardContent;
			divCard.className = cardType;
	}
	logger.appendChild(divCard);
	logger.scrollTop = logger.scrollHeight;
}
		
