const PROTO = "http", HOST = "localhost", PORT = 3000;
const SERVER = location.href || `${PROTO}://${HOST}:${PORT}/`;
let SSE = false;
let loggerScrollable = true;
let loggerPrevPos = 0;

const wHeight = window.innerHeight;
document.body.style.height = `${wHeight}px`;

listSite.onchange = function (e) {
	const listName = e.target.value;
	puppet("changeList", listName);
}

loggerContent.onscroll = function () {
	let curPos = loggerContent.scrollTop;
	if (loggerScrollable && curPos < loggerPrevPos) {
		loggerScrollable = false;
	}
	else if (!loggerScrollable && loggerContent.scrollHeight - curPos <= loggerContent.offsetHeight + 10) {
		loggerScrollable = true;
	}
	loggerPrevPos = curPos;
}

tabButtons.onclick = function () {
	$(this).attr("class", "nav nav-tabs nav-justified md-tabs color-light-blue-active");
	$("#tabsContainer").attr("class", "d-flex flex-column overflow-auto flex-grow-1 w-100 tab-content card pt-4 pb-0 color-light-blue");
};

btnTotalRequest.onclick = function () {
	$("#tabButtons").toggleClass("color-light-blue-active", false).toggleClass("orange darken-4", true);
	$("#tabsContainer").toggleClass("color-light-blue", false).toggleClass("orange darken-2", true);
	$("#tabCounterAll").tab("show");
};

btnTotalSuccess.onclick = function () {
	$("#tabButtons").toggleClass("color-light-blue-active", false).toggleClass("success-color-dark", true);
	$("#tabsContainer").toggleClass("color-light-blue", false).toggleClass("green lighten-1", true);
	$("#tabCounterSuccess").tab("show");
};

btnTotalFailed.onclick = function () {
	$("#tabButtons").toggleClass("color-light-blue-active", false).toggleClass("danger-color-dark", true);
	$("#tabsContainer").toggleClass("color-light-blue", false).toggleClass("red lighten-1", true);
	$("#tabCounterFailed").tab("show");
};

sliderRate.oninput = function () {
	const rate = +this.value;
	repeatRate.innerText = rate;
};

sliderRate.onchange = function () {
	const rate = +this.value;
	puppet("changeRate", rate);
};

sliderCounter.oninput = function () {
	let point = +this.value;
	switch (point) {
		case 1:
			counterPoint.innerText = 10;
			break;
	
		case 2:
			counterPoint.innerText = 100;
			break;
	
		case 3:
			counterPoint.innerText = "1K";
			break;

		case 4:
			counterPoint.innerText = "10K";
			break;

		case 5:
			counterPoint.innerText = "100K";
			break;

		case 6:
			counterPoint.innerText = "1M";
			break;
	}
};

sliderCounter.onchange = function () {
	const counter = convertCounter(+this.value);
	puppet("changeCounter", counter);
};

switchQuiet.onchange = function () {
	const enable = this.checked;
}

tabCounterAllHeader.onclick = function () {
	$("#tabButtons").toggleClass("orange darken-4", false).toggleClass("success-color-dark", true);
	$("#tabsContainer").toggleClass("orange darken-2", false).toggleClass("green lighten-1", true);
	$("#tabCounterSuccess").tab("show");
}

tabCounterSuccessHeader.onclick = function () {
	$("#tabButtons").toggleClass("success-color-dark", false).toggleClass("danger-color-dark", true);
	$("#tabsContainer").toggleClass("green lighten-1", false).toggleClass("red lighten-1", true);
	$("#tabCounterFailed").tab("show");
}

tabCounterFailedHeader.onclick = function () {
	$("#tabButtons").toggleClass("danger-color-dark", false).toggleClass("orange darken-4", true);
	$("#tabsContainer").toggleClass("red lighten-1", false).toggleClass("orange darken-2", true);
	$("#tabCounterAll").tab("show");
}

//puppet
let source = new EventSource("http://localhost:3000/logger");
source.onopen = e => {
	SSE = true;
	query("getDir", "upload", "upload");
}
source.onmessage = e => {
	const data = JSON.parse(e.data);
	log(data);
	let logData;
	switch (data.code) {
		case 20: case 21:
			logData = `<div class="white-text my-2"><span class="secondary-color-dark rounded p-1">Rank ${data.pageRank}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a></div>`;
			log(logData, "log", "counterSuccess");
			logData = `<div class="white-text my-2"><span class="success-color-dark rounded p-1">Rank ${data.pageRank}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a></div>`;
			log(logData, "log", "counterAll");
			break;

		case 1:
			logData = `<div class="white-text my-2"><span class="warning-color-dark rounded p-1">${data.errorCode}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a></div>`;
			log(logData, "log", "counterFailed");
			logData = `<div class="white-text my-2"><span class="danger-color-dark rounded p-1">${data.errorCode}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a></div>`;
			log(logData, "log", "counterAll");
			break;

		case 5:
			if (data.urlSuccess && data.urlSuccess.length) {
				for (const {url, pageRank} of data.urlSuccess) {
					logData = `<div class="white-text my-2"><span class="secondary-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${url}</a></div>`;
					log(logData, "log", "counterSuccess");
					logData = `<div class="white-text my-2"><span class="success-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${url}</a></div>`;
					log(logData, "log", "counterAll");
				}
			}
			if (data.urlFailed && data.urlFailed.length) {
				for (const {url, errorCode} of data.urlFailed) {
					logData = `<div class="white-text my-2"><span class="warning-color-dark rounded p-1">${errorCode}</span> : <a class="app-text-link" target="_blank" href="${url}">${url}</a></div>`;
					log(logData, "log", "counterFailed");
					logData = `<div class="white-text my-2"><span class="danger-color-dark rounded p-1">${errorCode}</span> : <a class="app-text-link" target="_blank" href="${url}">${url}</a></div>`;
					log(logData, "log", "counterAll");
				}
			}
			break;
	}
};
source.onerror = e => {
	SSE = false;
	log("Logger disconnected.");
};
async function puppet(action, value) {
	let data;
	switch (action) {
		case "changeList":
			data = {action, list: value || "mainSites"};
			break;
	
		case "changeRate":
			data = {action, rate: value};
			break;

		case "changeCounter":
			data = {action, counter: value};
			break;

		default:
			data = {action};
	}
	const response = await fetch(`${SERVER}puppet`, {
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
	const url = `${SERVER}upload`;
	const response = await fetch(url, {
		method: "POST",
		body: formData
	});
	if (!response.ok) {
		log(`Error upload: ${response.status}`, "error");
		return;
	}
	const res = await response.json();
	log(res.message, "success", "upload");
	query("getDir", "upload", "upload");
});

async function query(action = "getDir", dirName = "upload", tab = "logger") {
	const url = `${SERVER}query?action=${action}&dirName=${dirName}`;
	const response = await fetch(url);
	if (!response.ok) {
		const res = await response.json();
		if (res instanceof Object && res.message) {
			log(res.message, "error", tab);
		} else log(`Error ${response.status}: Getting directory failed.`, "error", tab);
		return;
	}
	const res = await response.json();
	log(res.message, "warning", tab);
	if (res.dirs.length) {
		log(`<span class="text-primary font-weight-bold">Directories:</span> <span class="orange-text font-weight-bold">${res.dirs.length}</span>`, "log", tab);
		for (const dir of res.dirs) {
			log(dir, "log", tab);
		}
	}
	if (res.files.length) {
		log(`<span class="text-secondary font-weight-bold">Files:</span> <span class="orange-text font-weight-bold">${res.files.length}</span>`, "log", tab);
		for (const file of res.files) {
			log(file, "log", tab);
		}
	}
	if (res.links.length) {
		log(`<span class="text-danger font-weight-bold">Links:</span> <span class="orange-text font-weight-bold">${res.links.length}</span>`, "log", tab);
		for (const link of res.links) {
			log(link, "log", tab);
		}
	}
}

function checkCounter(counter, apply = false) {
	let result;
	switch (true) {
		case counter < 10:
			result = {top: 10, point: 1};
			break;

		case counter < 100:
			result = {top: 100, point: 2};
			break;

		case counter < 1000:
			result = {top: "1K", point: 3};
			break;

		case counter < 10000:
			result = {top: "10K", point: 4};
			break;

		case counter < 100000:
			result = {top: "100K", point: 5};
			break;

		case counter < 1000000:
			result = {top: "1M", point: 6};
			break;

		default:
			result = {top: "1M+", point: 6};
	}
	if (apply) {
		counterPoint.innerText = result.top;
		sliderCounter.value = result.point;
	}
	return result;
}

function convertCounter(point) {
	switch (point) {
		case 1: return 1;
		case 2: return 10;
		case 3: return 100;
		case 4: return 1000;
		case 5: return 10000;
		case 6: return 100000;
	}
}

function log(data, type, tab = "logger") {
	let divCard = document.createElement("DIV");
	let cardContent, cardType;
	if (data instanceof Object) {
		cardContent = data.message;
		cardType = type || data.type || "log";

		if (data.total) $(".counter-total").text(data.total);
		if (data.success) $(".counter-success").text(data.success);
		if (data.failed) $(".counter-failed").text(data.failed);
		if (Number.isFinite(data.counter)) checkCounter(data.counter, true);

		switch (cardType) {
			case "error":
				switch (data.code) {
					case 1:
						cardContent = `Failed (<span class="text-danger font-weight-bold">${data.failed}</span>/<span class="text-default font-weight-bold">${data.total}</span>) : <span class="text-danger font-weight-bold">${data.errorCode}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a>`;
						break;
				}
				break;

			case "log":
				switch (data.code) {
					case 21:
						cardContent = `Paragraph not found: <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a>`;
						break;

					case 3:
						cardContent = `Success (<span class="text-success font-weight-bold">${data.success}</span>/<span class="text-default font-weight-bold">${data.total}</span>)`;
						break;

					case 4:
						cardContent = `Rank ${data.pageRank}: <a class="app-text-link" target="_blank" href="${data.url}">${data.url}</a>`;
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
						if (data.rate) {
							$("#repeatRate").text(data.rate);
							$("#sliderRate").val(data.rate);
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

					case 10:
						cardContent = `Puppet rate changed to "<span class="orange-text font-weight-bold">${data.rate}s</span>".`;
						break;

					case 11:
						cardContent = `Puppet top sites changed to "<span class="orange-text font-weight-bold">${checkCounter(data.counter).top}</span>".`;
						break;
				}
				break;
		}
	} else {
		cardContent = data;
		cardType = type || "log";
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
			switch (data.code) {
				case 21:
					divCard.innerHTML = `
					<div class="card-body px-3 py-2 mask text-center ${logType}">
						${$(cardContent).removeAttr("style").attr("class", "img-fluid z-depth-1 rounded")[0].outerHTML}
					</div>
					`;
					break;
				default:
					divCard.innerHTML = `
					<div class="card-body px-3 py-2 mask ${logType}">
						<p class="card-text text-white">${cardContent}</p>
					</div>
					`;
			}
			divCard.className = `card gradient-card mb-2 ${cardType}`;
			break;
		default:
			divCard.innerHTML = cardContent;
			divCard.className = cardType;
	}

	switch (tab) {
		case "logger":
			loggerContent.appendChild(divCard);
			if (loggerScrollable) {
				loggerContent.scrollTop = loggerContent.scrollHeight;
			}
			break;
	
		case "url":
			urlContent.appendChild(divCard);
			urlContent.scrollTop = urlContent.scrollHeight;
			break;

		case "motd":
			motdContent.appendChild(divCard);
			motdContent.scrollTop = motdContent.scrollHeight;
			break;

		case "upload":
			uploadContent.appendChild(divCard);
			uploadContent.scrollTop = uploadContent.scrollHeight;
			break;

		case "counterAll":
			counterAllContent.appendChild(divCard);
			counterAllContent.scrollTop = counterAllContent.scrollHeight;
			break;

		case "counterSuccess":
			counterSuccessContent.appendChild(divCard);
			counterSuccessContent.scrollTop = counterSuccessContent.scrollHeight;
			break;

		case "counterFailed":
			counterFailedContent.appendChild(divCard);
			counterFailedContent.scrollTop = counterFailedContent.scrollHeight;
			break;

		case "statistic":
			statisticContent.appendChild(divCard);
			statisticContent.scrollTop = statisticContent.scrollHeight;
			break;
	}
}
		
