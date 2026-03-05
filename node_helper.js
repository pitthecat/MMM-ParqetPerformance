/* Magic Mirror
 * Node Helper: MMM-ParqetPerformance
 *
 * By David
 * Handles API calls to Parqet Connect API
 */

const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting node helper for: " + this.name);
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "FETCH_PERFORMANCE") {
			this.fetchPerformance(payload);
		}
	},

	fetchPerformance: function(config) {
		var self = this;

		// Prepare the request body for Connect API
		var postData = JSON.stringify({
			portfolioIds: config.portfolioIds,
			interval: config.interval
		});

		// Prepare the request options
		var options = {
			hostname: "connect.parqet.com",
			port: 443,
			path: "/performance",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(postData),
				"Authorization": "Bearer " + config.apiToken
			}
		};

		// Make the request
		var req = https.request(options, function(res) {
			var data = "";

			res.on("data", function(chunk) {
				data += chunk;
			});

			res.on("end", function() {
				try {
					if (res.statusCode === 200) {
						var parsedData = JSON.parse(data);
						self.sendSocketNotification("PERFORMANCE_DATA", parsedData);
					} else {
						var errorMessage = "API returned status " + res.statusCode;
						try {
							var errorData = JSON.parse(data);
							if (errorData.message) {
								errorMessage += ": " + errorData.message;
							}
						} catch (e) {
							// Could not parse error response
						}
						self.sendSocketNotification("PERFORMANCE_ERROR", {
							error: errorMessage
						});
					}
				} catch (error) {
					self.sendSocketNotification("PERFORMANCE_ERROR", {
						error: "Failed to parse API response: " + error.message
					});
				}
			});
		});

		req.on("error", function(error) {
			console.error("Parqet API request error:", error);
			self.sendSocketNotification("PERFORMANCE_ERROR", {
				error: "Network error: " + error.message
			});
		});

		// Send the request
		req.write(postData);
		req.end();
	}
});
