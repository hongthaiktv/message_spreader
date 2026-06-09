const PROTO = "http", HOST = "localhost", PORT = 3000;
const SERVER = location.href || `${PROTO}://${HOST}:${PORT}/`;
const APPSETTING = {};
let SSE = false;

const wHeight = window.innerHeight;
document.body.style.height = `${wHeight}px`;

function scroller(layout) {
	const id = layout.id;
	const curPos = layout.scrollTop;
	if (scroller[id].scrollable && curPos < scroller[id].prevPos) {
		scroller[id].scrollable = false;
	}
	else if (!scroller[id].scrollable && layout.scrollHeight - curPos <= layout.offsetHeight + 10) {
		scroller[id].scrollable = true;
	}
	scroller[id].prevPos = curPos;
}

const scrollLayouts = ["loggerContent", "counterAllContent", "counterSuccessContent", "counterFailedContent", "urlContent", "motdContent", "uploadContent", "statisticContent"];
for (const layout of scrollLayouts) {
	scroller[layout] = {scrollable: true, prevPos: 0};
	window[layout].onscroll = function () {scroller(this)};
}

const scrollerUrlLoading = (function () {
	const scroller = {};
	return function (scrollLayout, contentLayout, list, callback) {
		scroller[scrollLayout] = {
			name: scrollLayout,
			prevPos: 0,
			loading: false,
			last: 0,
			setLast: function (last) {
				this.last = last;
			}
		};
		const scrollEle = window[scrollLayout];
		const contentEle = window[contentLayout];
		scrollEle.onscroll = function () {
			const scrollerOpt = scroller[this.id];
			const loading = scrollerOpt.loading;
			const last = scrollerOpt.last;
			const prevPos = scrollerOpt.prevPos;
			const curPos = this.scrollTop;
			if (!loading && curPos > prevPos && this.scrollHeight - curPos <= this.offsetHeight * 6) {
				scrollerOpt.loading = true;
				query("getUrls", list, last)
				.then(urls => {
					if (urls.quiet) {
						scrollerOpt.loading = false;
						return;
					}
					if (!callback) {
						createUrlRow(contentEle, urls, last);
					}
					else if (typeof callback === "function") {
						for (let i = 0; i < urls.length; i++) {
							const url = urls[i];
							const element = callback(url, i, last);
							contentEle.appendChild(element);
						}
					}
					scrollerOpt.last += urls.length;
					scrollerOpt.loading = false;
				});
			}
			scrollerOpt.prevPos = curPos;
		};
		return scroller[scrollLayout];
	}
})();

var scrollerMainSites = scrollerUrlLoading("urlMainSites", "urlMainSitesContent", "mainSites");
var scrollerTrustSites = scrollerUrlLoading("urlTrustSites", "urlTrustSitesContent", "trustSites");
var scrollerBlackSites = scrollerUrlLoading("urlBlackSites", "urlBlackSitesContent", "blackSites");

function motd(data) {
	motd.data = data;
}
motd.update = async function (data = motd.data) {
	const response = await fetch(`${SERVER}motd?action=update`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(data)
	});
	if (!response.ok) {
		const message = `Request error ${response.status}!`;
		log(message, "error");
		return;
	}
	const res = await response.json();
	if (SSE && !res.nosse) return;
	else log(res);
}

listSite.onchange = function (e) {
	const listName = e.target.value;
	puppet("changeList", listName);
};

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
};

tabCounterAllHeader.onclick = function () {
	$("#tabButtons").toggleClass("orange darken-4", false).toggleClass("success-color-dark", true);
	$("#tabsContainer").toggleClass("orange darken-2", false).toggleClass("green lighten-1", true);
	$("#tabCounterSuccess").tab("show");
};

tabCounterSuccessHeader.onclick = function () {
	$("#tabButtons").toggleClass("success-color-dark", false).toggleClass("danger-color-dark", true);
	$("#tabsContainer").toggleClass("green lighten-1", false).toggleClass("red lighten-1", true);
	$("#tabCounterFailed").tab("show");
};

tabCounterFailedHeader.onclick = function () {
	$("#tabButtons").toggleClass("danger-color-dark", false).toggleClass("orange darken-4", true);
	$("#tabsContainer").toggleClass("red lighten-1", false).toggleClass("orange darken-2", true);
	$("#tabCounterAll").tab("show");
};

$("#urlAccordion .contentCollapse").on("hidden.bs.collapse", function () {
	$("#urlCollapseContent").collapse("show");
});

$("#uploadAccordion .contentCollapse").on("hidden.bs.collapse", function () {
	$("#uploadCollapseContent").collapse("show");
});

$(".contentCollapse").on("hide.bs.collapse", function () {
	$(this).prev().children("i").last().toggleClass("fa-angle-double-down", true).toggleClass("fa-angle-double-up", false);
});

$(".contentCollapse").on("show.bs.collapse", function () {
	$(this).prev().children("i").last().toggleClass("fa-angle-double-down", false).toggleClass("fa-angle-double-up", true);
});

motdMessage.onfocus = function () {
	$("#motdBtnSend").toggleClass("d-none", false).toggleClass("d-flex", true);
	this.nextElementSibling.innerText = "Message";
};

motdMessage.onblur = function () {
	$("#motdBtnSend").toggleClass("d-none", true).toggleClass("d-flex", false);
	if (!this.value) this.nextElementSibling.innerText = "What's on your mind?";
};

motdBtnSend.onmousedown = function (e) {
	e.preventDefault();
	const message = motdMessage.value;
	motd.update({message});
};

//puppet
let source = new EventSource(`${SERVER}logger`);
source.onopen = () => SSE = true;
source.onmessage = e => {
	let data = JSON.parse(e.data);

	let tab = "logger";
	switch (data.code) {
		case 23:
			tab = "motd";
			data = {
				code: data.code, 
				type: data.type,
				message: data.data.message,
				url: data.spreader,
				pageRank: data.pageRank,
				quiet: data.quiet
			};
			break;

		case 24: case 44:
			tab = "motd";
			break;

		case 25:
			if (data.dirInfo) updateTabUpload(data.dirInfo);
			tab = "upload";
			break;
	}

	log(data, data.type, tab);
	if (data.quiet) return;
	const url = data.url ? data.url.replace(/^.*:\/\//i, "") : undefined;
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
					const urlText = url ? url.replace(/^.*:\/\//i, "") : undefined;
					logData = `<div class="white-text my-2"><span class="secondary-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
					log(logData, "log", "counterSuccess");
					logData = `<div class="white-text my-2"><span class="success-color-dark rounded p-1">Rank ${pageRank}</span> : <a class="app-text-link" target="_blank" href="${url}">${urlText}</a></div>`;
					log(logData, "log", "counterAll");
				}
			}
			if (data.urlFailed && data.urlFailed.length) {
				for (const {url, errorCode} of data.urlFailed) {
					const urlText = url ? url.replace(/^.*:\/\//i, "") : undefined;
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


//Starting

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

		case "updateUrl":
			data = {action, urlData: value};
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
	if (!$("#switchQuiet")[0].checked) query("getDir", "upload", "upload");
});

async function query(action, data, tab) {
	if (typeof data === "string" && tab === undefined) {
		tab = data;
		data = undefined;
	}
	const start = typeof tab === "number" ? tab : 0;
	tab = typeof tab === "string" && tab ? tab : "logger";
	let url = `${SERVER}query?action=${action}`;
	switch (action) {
		case "getDir":
			url += `&dirName=${data}`;
			break;

		case "getListSites":
			url += `&start=${data || 0}`;
			break;

		case "getUrls":
			url += `&list=${data}&start=${start}`;
			break;
	}
	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json"
		}
	});
	let res;
	if (!response.ok) {
		try {
			res = await response.json();
			log(res.message, "error", tab);
			return res;
		} catch(err) {
			log(`Error ${response.status}: Action "${action}" failed.`, "error", tab);
			return response;
		}
	}
	res = await response.json();
	if (res.quiet) return res;
	switch (action) {
		case "getDir":
			updateTabUpload(res);
			break;
	
		case "getUploadMsg":
			if (res.uploadMessages && res.uploadMessages.length) {
				$("#uploadContent").empty();
				for (const {code, type, pageRank, message, spreader} of res.uploadMessages) {
					const logData = {
						code, type, pageRank, message,
						url: spreader
					};
					log(logData, type, tab);
				}
			}
			break;

		case "getMotdMsg":
			updateTabMotd(res, tab);
			break;

		case "getListSites":
			updateTabUrl(res);
			break;
	}
	return res;
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
		const url = data.url ? data.url.replace(/^.*:\/\//i, "") : undefined;

		switch (cardType) {
			case "error":
				switch (data.code) {
					case 1:
						if (data.quiet) return;
						const patt = /^Error: /i;
						const message = patt.test(data.errorMessage) ? data.errorMessage.replace(patt, "") : data.errorMessage;
						cardContent = `<span class="text-danger font-weight-bold">${data.errorCode}</span> : ${message}`;
						break;

					case 46:
						cardContent = `URL list "<span class="text-primary font-weight-bold">${data.listSite}</span> : <span class="text-danger font-weight-bold">${data.index + 1}</span>" nothing change to update.`;
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
							if (!data.quiet) {
								updateTabUrl(data.listSitesInfo);
								$("#urlAccordion").toggleClass("d-none", false).toggleClass("d-flex", true);
								updateTabMotd(data.motdInfo, "motd");
								updateTabUpload(data.dirInfo);
							}
							else {
								motdMessage.value = "";
								motdMessage.dispatchEvent(new Event("blur"));
							}
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
						if (data.quiet) {
							$("#urlAccordion").toggleClass("d-none", true).toggleClass("d-flex", false);
							$("#urlAccordion .badge-lg").text("0");
							$("#urlAccordion .contentCollapse > div").empty();
							$("#urlContent").empty();
							motdMessage.value = "";
							motdMessage.dispatchEvent(new Event("blur"));
							$("#motdContent").empty();
							$("#uploadBtnDirectories").toggleClass("d-none", true);
							$("#uploadBtnFiles").toggleClass("d-none", true);
							$("#uploadBtnLinks").toggleClass("d-none", true);
							$("#uploadAccordion .badge-lg").text("0");
							$("#uploadAccordion .contentCollapse > div").empty();
							$("#uploadContent").empty();
						}
						else {
							updateTabUrl(data.listSitesInfo);
							$("#urlAccordion").toggleClass("d-none", false).toggleClass("d-flex", true);
							updateTabMotd(data.motdInfo, "motd");
							updateTabUpload(data.dirInfo);
						}
						break;

					case 26:
						cardContent = `URL list "<span class="orange-text font-weight-bold">${data.listSite}</span> : <span class="text-danger font-weight-bold">${data.index + 1}</span>" updated.`;
						break;
				}
				break;
		}
	} else {
		cardContent = data;
		cardType = type || "log";
	}

	switch (cardType) {
		case "info": case "error": case "warning": case "success": case "motd":
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

				case "motd":
					logType = "winter-neva-gradient";
					break;
			}
			if (data instanceof Object) {
				const url = data.url ? data.url.replace(/^.*:\/\//i, "") : undefined;
				switch (data.code) {
					case 20:
						if (!data.quiet) {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="card-text text-white">${cardContent}</p>
							</div>
							<div class="card-footer d-flex align-items-center rgba-white-light px-3 py-1">
								<div class="d-flex align-items-center secondary-color-dark text-center z-depth-1 app-numPageRank rounded mr-2">
									<i class="fas fa-globe app-iconSM9 mr-1"></i>
									${data.pageRank}
								</div>
								<i class="app-text-link fas fa-link mx-1"></i>
								<a class="app-text-link flex-grow-1 text-truncate${$(`<div>${cardContent}</div>`).find("a").length ? "" : " stretched-link"}" target="_blank" href="${data.url}">${url}</a>
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
							<div class="card-footer d-flex align-items-center rgba-white-light px-3 py-1">
								<div class="d-flex align-items-center secondary-color-dark text-center z-depth-1 app-numPageRank rounded mr-2">
									<i class="fas fa-globe app-iconSM9 mr-1"></i>
									${data.pageRank}
								</div>
								<i class="app-text-link fas fa-link mx-1"></i>
								<a class="app-text-link flex-grow-1 text-truncate stretched-link" target="_blank" href="${data.url}">${url}</a>
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

					case 23: case 25:
						if (!data.quiet) {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="blue-grey-text m-0">${cardContent}</p>
							</div>
							<div class="card-footer d-flex align-items-center rgba-white-light px-3 py-1">
								<div class="d-flex align-items-center blue text-center z-depth-1 app-numPageRank rounded mr-2">
									<i class="fas fa-globe app-iconSM9 mr-1"></i>
									${data.pageRank ? data.pageRank : `<i class="fas fa-question app-iconSM9" style="margin: 0.15em;"></i>`}
								</div>
								<i class="app-text-link fas fa-bullhorn mx-1"></i>
								<a class="app-text-link flex-grow-1 text-truncate${$(`<div>${cardContent}</div>`).find("a").length ? "" : " stretched-link"}" target="_blank" href="${data.url}">${url}</a>
							</div>
							`;
						} else {
							divCard.innerHTML = `
							<div class="card-body px-3 py-2 mask">
								<p class="blue-grey-text m-0">${cardContent}</p>
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
							<div class="card-footer d-flex align-items-center rgba-white-light px-3 py-1">
								<div class="d-flex align-items-center danger-color text-center z-depth-1 app-numPageRank rounded mr-2">
									<i class="fas fa-globe app-iconSM9 mr-1"></i>
									${data.pageRank}
								</div>
								<i class="app-text-link fas fa-link mx-1"></i>
								<a class="app-text-link flex-grow-1 text-truncate stretched-link" target="_blank" href="${data.url}">${url}</a>
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
			if (scroller.loggerContent.scrollable) loggerContent.scrollTop = loggerContent.scrollHeight;
			break;
	
		case "url":
			urlContent.appendChild(divCard);
			if (scroller.urlContent.scrollable) urlContent.scrollTop = urlContent.scrollHeight;
			break;

		case "motd":
			motdContent.appendChild(divCard);
			if (scroller.motdContent.scrollable) motdContent.scrollTop = motdContent.scrollHeight;
			break;

		case "upload":
			uploadContent.appendChild(divCard);
			if (scroller.uploadContent.scrollable) uploadContent.scrollTop = uploadContent.scrollHeight;
			break;

		case "counterAll":
			counterAllContent.appendChild(divCard);
			if (scroller.counterAllContent.scrollable) counterAllContent.scrollTop = counterAllContent.scrollHeight;
			break;

		case "counterSuccess":
			counterSuccessContent.appendChild(divCard);
			if (scroller.counterSuccessContent.scrollable) counterSuccessContent.scrollTop = counterSuccessContent.scrollHeight;
			break;

		case "counterFailed":
			counterFailedContent.appendChild(divCard);
			if (scroller.counterFailedContent.scrollable) counterFailedContent.scrollTop = counterFailedContent.scrollHeight;
			break;

		case "statistic":
			statisticContent.appendChild(divCard);
			if (scroller.statisticContent.scrollable) statisticContent.scrollTop = statisticContent.scrollHeight;
			break;
	}
}

async function hashGenerate(data, algorithm = "SHA-256") {
	if (typeof data === "string" && data) data = new TextEncoder().encode(data);
	else if (data instanceof Blob) data = await data.arrayBuffer();
	else if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) throw new Error("hashGenerate: Wrong data input!");

	const hashBuffer = await window.crypto.subtle.digest(algorithm, data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
	.map(b => b.toString(16).padStart(2, "0"))
	.join("");
	return hashHex;
}

function updateTabUrl(listSitesInfo, append = false) {
	if (!append) $("#urlAccordion .contentCollapse > div").empty();
	if (listSitesInfo.mainSites && listSitesInfo.mainSites.length) {
		createUrlRow(urlMainSitesContent, listSitesInfo.mainSites);
		$("#urlMainSitesCounter").text(listSitesInfo.mainSitesLength);
		if (window.scrollerMainSites) scrollerMainSites.setLast(listSitesInfo.mainSites.length);
	}

	if (listSitesInfo.trustSites && listSitesInfo.trustSites.length) {
		createUrlRow(urlTrustSitesContent, listSitesInfo.trustSites);
		$("#urlTrustSitesCounter").text(listSitesInfo.trustSitesLength);
		if (window.scrollerTrustSites) scrollerTrustSites.setLast(listSitesInfo.trustSites.length);
	}

	if (listSitesInfo.blackSites && listSitesInfo.blackSites.length) {
		createUrlRow(urlBlackSitesContent, listSitesInfo.blackSites);
		$("#urlBlackSitesCounter").text(listSitesInfo.blackSitesLength);
		if (window.scrollerBlackSites) scrollerBlackSites.setLast(listSitesInfo.blackSites.length);
	}
}

function updateTabMotd(motdInfo, tab = "motd") {
	if (motdInfo.message) {
		motdMessage.value = motdInfo.message;
		motdMessage.dispatchEvent(new Event("focus"));
		motdMessage.dispatchEvent(new Event("blur"));
	}
	if (motdInfo.motdMessages && motdInfo.motdMessages.length) {
		$("#motdContent").empty();
		for (const {code, type, pageRank, data, spreader} of motdInfo.motdMessages) {
			const logData = {
				code, type, pageRank,
				message: data.message,
				url: spreader
			};
			log(logData, type, tab);
		}
	}
}

function updateTabUpload(dirInfo, uploadMessages, tab = "upload") {
	if (dirInfo.uploadMessages && dirInfo.uploadMessages instanceof Array) uploadMessages = dirInfo.uploadMessages;
	else if (dirInfo instanceof Array) {
		uploadMessages = dirInfo;
		dirInfo = undefined;
	}

	if (dirInfo && dirInfo.content && dirInfo.content.length) {
		$("#uploadAccordion .contentCollapse > div").empty();
		if (dirInfo.dirs && dirInfo.dirs.length) {
			$("#uploadDirectoriesCounter").text(dirInfo.dirs.length);
			for (const dir of dirInfo.dirs) {
				$("#uploadDirectoriesContent").append(`<div>${dir}</div>`);
			}
			$("#uploadBtnDirectories").toggleClass("d-none", false);
		} else $("#uploadBtnDirectories").toggleClass("d-none", true);
		if (dirInfo.files && dirInfo.files.length) {
			$("#uploadFilesCounter").text(dirInfo.files.length);
			for (const file of dirInfo.files) {
				$("#uploadFilesContent").append(`<div>${file}</div>`);
			}
			$("#uploadBtnFiles").toggleClass("d-none", false);
		} else $("#uploadBtnFiles").toggleClass("d-none", true);
		if (dirInfo.links && dirInfo.links.length) {
			$("#uploadLinksCounter").text(dirInfo.links.length);
			for (const link of dirInfo.links) {
				$("#uploadLinksContent").append(`<div>${link}</div>`);
			}
			$("#uploadBtnLinks").toggleClass("d-none", false);
		} else $("#uploadBtnLinks").toggleClass("d-none", true);
	}

	if (uploadMessages && uploadMessages.length) {
		$("#uploadContent").empty();
		for (const {code, type, pageRank, message, spreader} of uploadMessages) {
			const logData = {
				code, type, pageRank, message,
				url: spreader
			};
			log(logData, type, tab);
		}
	}
}

function editorUrlRow(order, url, query) {
	const form = document.createElement("FORM");
	form.innerHTML = `
	<div class="form-row align-items-center">
		<div class="col-auto">
			<div class="md-form my-0 pb-1">
				<span>${order}</span>.
			</div>
		</div>
		<div class="col-7">
			<div class="md-form my-0">
				<input type="text" class="form-control text-white" placeholder="URL" value="${url}">
			</div>
		</div>
		<div class="col">
			<div class="md-form my-0">
				<input type="text" class="form-control text-white" placeholder="Query" value="${query}">
			</div>
		</div>
	</div>
	`;
	return form;
}

function createUrlRow(container, urls, last = 0) {
	urls.forEach(function (url, index) {
		const query = url instanceof Object ? url.query || "default" : "default";
		if (url instanceof Object) url = url.url;
		const urlLink = !/^http/i.test(url) ? `https://${url}` : url;
		const order = index + last + 1;
		const row = document.createElement("DIV");
		row.className = "white-text d-flex align-items-center p-1";
		row.innerHTML = `<span colIndex="0">${order}</span>. <a colIndex="1" class="app-text-link flex-grow-1 text-truncate mx-1" target="_blank" href="${urlLink}">${url}</a><span colIndex="2" class="text-truncate minw-20">${query}</span>`;
		if (index % 2 !== 0) row.className += " rgba-white-slight";
		container.appendChild(row);
		row.onclick = function (e) {
			if (e.target.tagName === "A" && editorUrlRow.edit) {
				e.preventDefault();
				editorUrlRow.edit = false;
			}
			if (e.target.tagName === "A" || e.target.tagName === "INPUT" || e.target.tagName === "DIV") return;
			const colIndex = +e.target.getAttribute("colIndex");
			const order = +$(this).find("span").first().text();
			const url = $(this).find("a").text();
			const query = $(this).find("span").last().text();
			const form = editorUrlRow(order, url, query);
			$(this).empty();
			$(this).append(form);
			editorUrlRow.edit = true;
			if (colIndex === 2) {
				form[1].focus();
				form[1].setSelectionRange(form[1].value.length, form[1].value.length);
			}
			else {
				form[0].focus();
				form[0].setSelectionRange(form[0].value.length, form[0].value.length);
			}
			$(form).find("input").on("keydown focusout", function (e) {
				if (e.relatedTarget && e.relatedTarget.tagName === "INPUT") return;
				if (e.keyCode === 13 || e.type === "focusout") {
					const order = +$(form).find(".md-form").first().children("span")[0].innerText;
					const inputUrl = form[0].value;
					const urlLink = !/^http/i.test(inputUrl) ? `https://${inputUrl}` : inputUrl;
					const inputQuery = form[1].value !== "" ? form[1].value : "default";
					row.innerHTML = `<span colIndex="0">${order}</span>. <a colIndex="1" class="app-text-link flex-grow-1 text-truncate mx-1" target="_blank" href="${urlLink}">${inputUrl}</a><span colIndex="2" class="text-truncate minw-20">${inputQuery}</span>`;
					if (!e.relatedTarget) editorUrlRow.edit = false;
					if (inputUrl === url && inputQuery === query) return;
					let listSite;
					switch (container.id) {
						case "urlMainSitesContent":
							listSite = "mainSites";
							break;

						case "urlTrustSitesContent":
							listSite = "trustSites";
							break;

						case "urlBlackSitesCounter":
							listSite = "blackSites";
							break;
					}
					puppet("updateUrl", {listSite, index: order - 1, url: inputUrl, query: inputQuery});
				}
			});
		};
	});
}

