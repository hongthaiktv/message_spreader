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
source.onerror = e => log("Logger disconnected.");
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
		if (res && res.message && res.type) {
			if (SSE && (action === "stop" || action === "change")) return;
			else log(res);
		}
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
	log("disconnected");
};

function log(data, type = "log") {
	let divCard = document.createElement("DIV");
	let cardContent, cardType;
	if (data instanceof Object) {
		cardContent = data.message;
		cardType = data.type;
		switch (cardType) {
			case "error":
				if (data.failed && data.code && data.url) cardContent += ` (<span class="text-default">${data.failed}</span>) : <span class="text-danger">${data.code}</span> : <span class="text-primary">${data.url}</span>`;
				break;
		}
		if (data.urlFailed) {
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
		
