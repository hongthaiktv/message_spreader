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
		log(res);
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
	} else {
		cardContent = data;
		cardType = type;
	}
	let card =`
    <div class="card-body mask purple-gradient-rgba">
      <p class="card-text text-white">${cardContent}</p>
    </div>
	`;
	divCard.className = `card gradient-card mb-2 ${cardType}`;
	divCard.innerHTML = card;
	logger.appendChild(divCard);
	logger.scrollTop = logger.scrollHeight;
}
		
