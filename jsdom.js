const jsdom = require("jsdom");
const { JSDOM } = jsdom;

//resources: "usable" option, which will load all usable resources.
//runScripts: "dangerously" is also set.
//initial load made by JSDOM.fromURL() pass an options object as the "resources" option value for fully customize jsdom's resource-loading behavior.
//temporary disable ssl: export NODE_TLS_REJECT_UNAUTHORIZED=0
//extra CA certs: export NODE_EXTRA_CA_CERTS="absolute_path_to_your_certificates.pem"
//Extract CA cert from a server: curl -w %{certs} https://example.com > cacert.pem

const url = "https://example.com/";
const options = {
	//url: url,
	//runScripts: "dangerously",
	resources: {
		userAgent: "Mozilla/5.0 (Android 15; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0"
	}
}

JSDOM.fromURL(url, options).then(dom => {
  console.log(dom.serialize());
});

