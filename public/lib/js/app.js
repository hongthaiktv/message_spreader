const PROTO = "http", HOST = "localhost", PORT = 3000;
const SERVER = location.href || `${PROTO}://${HOST}:${PORT}/`;
const APPSETTING = {};
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
	puppet("changeMode", enable);
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
let source = new EventSource(`${SERVER}logger`);
source.onopen = () => SSE = true;
source.onmessage = e => {
	const data = JSON.parse(e.data);
	log(data);
	if (switchQuiet.checked) return;
	const url = data.url ? data.url.replace(/^.*:\/\//i, "") : data.url;
	let logData;
	switch (data.code) {
		case 20: case 21:
			logData = `<div class="white-text my-2"><span class="secondary-color-dark rounded p-1">Rank ${data.pageRank}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${url}</a></div>`;
			log(logData, "log", "counterSuccess");
			logData = `<div class="white-text my-2"><span class="success-color-dark rounded p-1">Rank ${data.pageRank}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${url}</a></div>`;
			log(logData, "log", "counterAll");
			break;

		case 1:
			logData = `<div class="white-text my-2"><span class="warning-color-dark rounded p-1">${data.errorCode}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${url}</a></div>`;
			log(logData, "log", "counterFailed");
			logData = `<div class="white-text my-2"><span class="danger-color-dark rounded p-1">${data.errorCode}</span> : <a class="app-text-link" target="_blank" href="${data.url}">${url}</a></div>`;
			log(logData, "log", "counterAll");
			break;

		case 5:
			if (data.urlSuccess && data.urlSuccess.length) {
				for (const {url, pageRank} of data.urlSuccess) {
					const urlText = url ? url.replace(/^.*:\/\//i, "") : url;
					logData = `<div class="white-text my-2"><span class="secondary-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
					log(logData, "log", "counterSuccess");
					logData = `<div class="white-text my-2"><span class="success-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
					log(logData, "log", "counterAll");
				}
			}
			if (data.urlFailed && data.urlFailed.length) {
				for (const {url, errorCode} of data.urlFailed) {
					const urlText = url ? url.replace(/^.*:\/\//i, "") : url;
					logData = `<div class="white-text my-2"><span class="warning-color-dark rounded p-1">${errorCode}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
					log(logData, "log", "counterFailed");
					logData = `<div class="white-text my-2"><span class="danger-color-dark rounded p-1">${errorCode}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
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

		case "changeMode":
			data = {action, quiet: value};
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
	if (res.quiet) return;
	if (res.message) {
		const message = `Directory "<span class="text-primary font-weight-bold">${res.dirName}</span>" got <span class="text-primary font-weight-bold">${res.dirs.length}</span> directori(es), <span class="text-success font-weight-bold">${res.files.length}</span> file(s), <span class="text-info font-weight-bold">${res.links.length}</span> link(s). Total: <span class="text-danger font-weight-bold">${res.content.length}</span>`;
		log(message, "info", tab);
	}
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

function checkCounter(counter, length, apply = false) {
	let top = convertSitesLength(length).top;
	let point = convertSitesLength(length).point;
	switch (true) {
		case counter < 10:
			top = 10;
			point = 1;
			break;

		case counter < 100:
			top = point >= 2 ? 100 : top;
			point = point >= 2 ? 2 : point;
			break;

		case counter < 1000:
			top = point >= 3 ? "1K" : top;
			point = point >= 3 ? 3 : point;
			break;

		case counter < 10000:
			top = point >= 4 ? "10K" : top;
			point = point >= 4 ? 4 : point;
			break;

		case counter < 100000:
			top = point >= 5 ? "100K" : top;
			point = point >= 5 ? 5 : point;
			break;

		case counter < 1000000:
			top = point >= 6 ? "1M" : top;
			point = point >= 6 ? 6 : point;
			break;
	}
	if (apply) {
		counterPoint.innerText = top;
		sliderCounter.value = point;
	}
	return {top, point};
}

function convertSitesLength(length) {
	let top, point;
	switch (true) {
		case length <= 10: top = 10; point = 1; break;
		case length <= 100: top = 100; point = 2; break;
		case length <= 1000: top = "1K"; point = 3; break;
		case length <= 10000: top = "10K"; point = 4; break;
		case length <= 100000: top = "100K"; point = 5; break;
		case length <= 1000000: top = "1M"; point = 6; break;
		default: top = "1M+"; point = 6;
	}
	return {top, point};
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

function checkList(current) {
	const listSiteButtons = document.querySelectorAll("#listSite input");
	for (const button of listSiteButtons) {
		const list = button.value;
		if (current === list) {
			button.setAttribute("checked", true);
			button.checked = true;
			button.parentElement.className = "btn btn-light-blue form-check-label active";
		}
		else {
			button.removeAttribute("checked");
			button.checked = false;
			button.parentElement.className = "btn btn-light-blue form-check-label";
		}
	}
}

function checkStarted(started) {
	if (started) {
		$("#pupBtnStart").toggleClass("d-none", true);
		$("#pupBtnStop").toggleClass("d-none", false);
	} else {
		$("#pupBtnStart").toggleClass("d-none", false);
		$("#pupBtnStop").toggleClass("d-none", true);
	}
}

function log(data, type, tab = "logger") {
	let divCard = document.createElement("DIV");
	let cardContent, cardType;
	if (data instanceof Object) {
		cardContent = typeof data.message === "string" ? data.message.trim() : data.message;
		cardType = type || data.type || "log";
		if (data.sitesLength) APPSETTING.sitesLength = data.sitesLength;

		if (data.total) $(".counter-total").text(data.total);
		if (data.success) $(".counter-success").text(data.success);
		if (data.failed) $(".counter-failed").text(data.failed);
		if (Number.isFinite(data.counter)) checkCounter(data.counter, APPSETTING.sitesLength, true);
		const url = data.url ? data.url.replace(/^.*:\/\//i, "") : data.url;

		switch (cardType) {
			case "error":
				switch (data.code) {
					case 1:
						if (data.quiet) return;
						const patt = /^Error: /i;
						const message = patt.test(data.errorMessage) ? data.errorMessage.replace(patt, "") : data.errorMessage;
						cardContent = `Failed (<span class="text-danger font-weight-bold">${data.failed}</span>/<span class="text-default font-weight-bold">${data.total}</span>) : <span class="text-danger font-weight-bold">${data.errorCode}</span> : ${message}`;
						break;
				}
				break;

			case "log":
				switch (data.code) {
					case 3:
						cardContent = `Success (<span class="text-success font-weight-bold">${data.success}</span>/<span class="text-default font-weight-bold">${data.total}</span>)`;
						break;

					case 4:
						cardContent = `Rank ${data.pageRank}: <a class="app-text-link" target="_blank" href="${data.url}">${url}</a>`;
						break;

					case 5:
						if (data.current) checkList(data.current);
						if (data.started) {
							$("#pupBtnStart").toggleClass("d-none", true);
							$("#pupBtnStop").toggleClass("d-none", false);
						}
						if (data.rate) {
							$("#repeatRate").text(data.rate);
							$("#sliderRate").val(data.rate);
						}
						if (typeof data.quiet === "boolean") {
							$("#switchQuiet")[0].checked = data.quiet;
							if (!data.quiet) query("getDir", "upload", "upload");
						}
						if (Number.isFinite(data.sitesLength)) {
							const max = convertSitesLength(data.sitesLength).point;
							$("#sliderCounter").attr("max", max);
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
						if (typeof data.started === "boolean") checkStarted(data.started);
						cardContent = `Puppet starting with "<span class="orange-text font-weight-bold">${data.current}</span>"...`;
						break;
				
					case 8:
						if (typeof data.started === "boolean") checkStarted(data.started);
						cardContent = `Puppet stopped with <span class="orange-text font-weight-bold">${data.total}</span> request, <span class="text-success font-weight-bold">${data.success}</span> success, <span class="text-danger font-weight-bold">${data.failed}</span> failed.`;
						break;

					case 9:
						if (data.current) checkList(data.current);
						if (Number.isFinite(data.sitesLength)) {
							const max = convertSitesLength(data.sitesLength).point;
							$("#sliderCounter").attr("max", max);
						}
						cardContent = `Puppet URLs list changed to "<span class="orange-text font-weight-bold">${data.current}</span>".`;
						break;

					case 10:
						cardContent = `Puppet rate changed to "<span class="orange-text font-weight-bold">${data.rate}s</span>".`;
						repeatRate.innerText = data.rate;
						sliderRate.value = data.rate;
						break;

					case 11:
						cardContent = `Puppet top sites changed to "<span class="orange-text font-weight-bold">${checkCounter(data.counter, APPSETTING.sitesLength).top}</span>".`;
						break;

					case 12:
						cardContent = `Puppet mode changed to "<span class="orange-text font-weight-bold">${data.mode}</span>".`;
						switchQuiet.checked = data.quiet;
						if (data.quiet) $("#uploadContent").empty();
						else query("getDir", "upload", "upload");
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
			if (data instanceof Object) {
				const url = data.url ? data.url.replace(/^.*:\/\//i, "") : data.url;
				switch (data.code) {
					case 20:
						if (!data.quiet) {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="card-text text-white">${cardContent}</p>
							</div>
							<div class="card-footer rgba-white-light px-3 py-1">
								<a class="app-text-link${$(`<div>${cardContent}</div>`).find("a").length ? "" : " stretched-link"}" target="_blank" href="${data.url}">${url}</a>
							</div>
							`;
						} else {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="card-text text-white">${cardContent}</p>
							</div>
							`;
						}
						break;

					case 21:
						if (!data.quiet) {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask text-center">
								${$(cardContent).removeAttr("style").attr("class", "img-fluid z-depth-1 rounded-lg")[0].outerHTML}
							</div>
							<div class="card-footer rgba-white-light px-3 py-1">
								<a class="app-text-link stretched-link" target="_blank" href="${data.url}">${url}</a>
							</div>
							`;
						} else {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask text-center">
								${$(cardContent).removeAttr("style").attr("class", "img-fluid z-depth-1 rounded-lg")[0].outerHTML}
							</div>
							`;
						}
						break;

					case 1:
						if (!data.quiet) {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="card-text text-white">${cardContent}</p>
							</div>
							<div class="card-footer rgba-white-light px-3 py-1">
								<a class="app-text-link stretched-link" target="_blank" href="${data.url}">${url}</a>
							</div>
							`;
						} else {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="card-text text-white">${cardContent}</p>
							</div>
							`;
						}
						break;

					default:
						divCard.innerHTML = `
						<div class="card-body px-3 py-2 mask">
							<p class="card-text text-white">${cardContent}</p>
						</div>
						`;
				}
			} else {
				divCard.innerHTML = `
				<div class="card-body px-3 py-2 mask">
					<p class="card-text text-white">${cardContent}</p>
				</div>
				`;
			}
			divCard.className = `card gradient-card ${logType} rounded-lg my-2 ${cardType}`;
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
		
