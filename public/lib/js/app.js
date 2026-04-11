let SSE = false;
let loggerScrollable = true;
let loggerPrevPos = 0;

const wHeight = window.innerHeight;
document.body.style.height = `${wHeight}px`;

listSite.onchange = function (e) {
	const urls = document.querySelector("#listSite input:checked").value;
	puppet("change", urls);
}

logger.onscroll = function () {
	let curPos = logger.scrollTop;
	if (loggerScrollable && curPos < loggerPrevPos) {
		loggerScrollable = false;
	}
	else if (!loggerScrollable && logger.scrollHeight - curPos <= logger.offsetHeight + 10) {
		loggerScrollable = true;
	}
	loggerPrevPos = curPos;
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
	let data = {action, urls};
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
	$(this).toggleClass("d-none");
	$("#pupBtnStop").toggleClass("d-none")[0].focus();
};

pupBtnStop.onclick = function(e) {
	puppet("stop");
	$(this).toggleClass("d-none");
	$("#pupBtnStart").toggleClass("d-none")[0].focus();
};

pupBtnUpload.addEventListener("change", async function (e) {
	const files = this.files;
	const formData = new FormData();
	formData.append("message", "Files uploaded by web browser.");
	for (const file of files) {
		formData.append("files", file);
	}
	const url = "http://localhost:3001/upload";
	const response = await fetch(url, {
		method: "POST",
		body: formData
	});
	if (!response.ok) {
		log(`Error upload: ${response.status}`, "error");
		return;
	}
	const res = await response.json();
	log(res.message, "success");
});

function log(data, type = "log") {
	let divCard = document.createElement("DIV");
	let cardContent, cardType;
	if (data instanceof Object) {
		cardContent = data.message;
		cardType = data.type;
		if (data.total) cTotalRequest.innerText = data.total;
		if (data.success) cTotalSuccess.innerText = data.success;
		if (data.failed) cTotalFailed.innerText = data.failed;
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
						if (data.current) {
							const listSiteButtons = document.querySelectorAll("#listSite input");
							for (const button of listSiteButtons) {
								const list = button.value;
								if (data.current === list) {
									button.setAttribute("checked", true);
									button.parentElement.className = "btn btn-light-blue form-check-label active";
								}
								else {
									button.removeAttribute("checked");
									button.parentElement.className = "btn btn-light-blue form-check-label";
								}
							}
						}
						if (data.started) {
							$("#pupBtnStart").toggleClass("d-none", true);
							$("#pupBtnStop").toggleClass("d-none", false);
						}
						cardContent = `Client added. Total: <span class="orange-text font-weight-bold">${data.totalClient}</span>`;
						break;

					case 6:
						cardContent = `Client disconnected. Left: <span class="orange-text font-weight-bold">${data.total}</span>`;
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
	if (loggerScrollable) {
		logger.scrollTop = logger.scrollHeight;
	}
}
		
