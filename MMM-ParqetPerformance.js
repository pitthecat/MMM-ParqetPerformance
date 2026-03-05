/* Magic Mirror
 * Module: MMM-ParqetPerformance
 *
 * By David
 * Displays portfolio performance from Parqet API
 */

Module.register("MMM-ParqetPerformance", {
	// Default module config
	defaults: {
		apiToken: "", // Required: Parqet API access token
		portfolioIds: [], // Required: Array of portfolio IDs to track
		updateInterval: 300000, // Update every 5 minutes (300000 ms)
		animationSpeed: 1000,
		showMetrics: true,
		intervalType: "ytd", // ytd, 1w, 1m, 3m, 6m, 1y, 3y, 5y, max
		header: "Portfolio Performance",
		displayCurrency: "EUR",
		showPercentage: true,
		showAbsolute: true,
		showDividends: true,
		showFees: false,
		showTaxes: false,
		retryDelay: 5000,
	},

	// Define required scripts
	getScripts: function() {
		return ["moment.js"];
	},

	// Define styles
	getStyles: function() {
		return ["MMM-ParqetPerformance.css"];
	},

	// Start the module
	start: function() {
		Log.info("Starting module: " + this.name);
		this.performanceData = null;
		this.loaded = false;
		this.error = null;
		this.scheduleUpdate();
	},

	// Override dom generator
	getDom: function() {
		var wrapper = document.createElement("div");
		wrapper.className = "parqet-wrapper";

		// Show loading state
		if (!this.loaded) {
			wrapper.innerHTML = "Loading portfolio...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		// Show error state
		if (this.error) {
			wrapper.innerHTML = "Error: " + this.error;
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		// Check if API token is configured
		if (!this.config.apiToken) {
			wrapper.innerHTML = "Please configure your Parqet API token";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		// Check if portfolio IDs are configured
		if (!this.config.portfolioIds || this.config.portfolioIds.length === 0) {
			wrapper.innerHTML = "Please configure your portfolio IDs";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		// Display performance data
		if (this.performanceData) {
			wrapper.appendChild(this.createPerformanceDisplay());
		}

		return wrapper;
	},

	// Create the performance display
	createPerformanceDisplay: function() {
		var container = document.createElement("div");
		container.className = "performance-container";

		// Create metrics display
		if (this.config.showMetrics && this.performanceData && this.performanceData.performance) {
			var metricsDiv = document.createElement("div");
			metricsDiv.className = "performance-metrics";

			var perf = this.performanceData.performance;
			var valuation = perf.valuation;
			var unrealized = perf.unrealizedGains.inInterval;
			var realized = perf.realizedGains.inInterval;
			var dividends = perf.dividends.inInterval;

			// Portfolio Value
			if (valuation && valuation.atIntervalEnd !== undefined) {
				var valueDiv = this.createMetricRow(
					"Portfolio Value",
					this.formatCurrency(valuation.atIntervalEnd)
				);
				metricsDiv.appendChild(valueDiv);
			}

			// Total Gain/Loss (unrealized + realized)
			if (this.config.showAbsolute && unrealized && realized) {
				var totalGain = unrealized.gainNet + realized.gainNet;
				var totalGainDiv = this.createMetricRow(
					"Total Gain/Loss",
					this.formatCurrency(totalGain)
				);
				metricsDiv.appendChild(totalGainDiv);
			}

			// Total Return %
			if (this.config.showPercentage && unrealized) {
				var returnDiv = this.createMetricRow(
					"Return",
					this.formatReturn(unrealized.returnNet / 100)
				);
				metricsDiv.appendChild(returnDiv);
			}

			// Unrealized Gains
			if (this.config.showAbsolute && unrealized) {
				var unrealizedDiv = this.createMetricRow(
					"Unrealized",
					this.formatCurrency(unrealized.gainNet)
				);
				metricsDiv.appendChild(unrealizedDiv);
			}

			// Realized Gains
			if (this.config.showAbsolute && realized && realized.gainNet !== 0) {
				var realizedDiv = this.createMetricRow(
					"Realized",
					this.formatCurrency(realized.gainNet)
				);
				metricsDiv.appendChild(realizedDiv);
			}

			// Dividends
			if (this.config.showDividends && dividends && dividends.gainNet !== 0) {
				var dividendDiv = this.createMetricRow(
					"Dividends",
					this.formatCurrency(dividends.gainNet)
				);
				metricsDiv.appendChild(dividendDiv);
			}

			// Fees
			if (this.config.showFees && perf.fees && perf.fees.inInterval.fees !== 0) {
				var feeDiv = this.createMetricRow(
					"Fees",
					this.formatCurrency(-perf.fees.inInterval.fees)
				);
				metricsDiv.appendChild(feeDiv);
			}

			// Taxes
			if (this.config.showTaxes && perf.taxes && perf.taxes.inInterval.taxes !== 0) {
				var taxDiv = this.createMetricRow(
					"Taxes",
					this.formatCurrency(-perf.taxes.inInterval.taxes)
				);
				metricsDiv.appendChild(taxDiv);
			}

			// Period
			if (this.performanceData.interval) {
				var periodDiv = this.createMetricRow(
					"Period",
					this.formatDate(this.performanceData.interval.start) + " - " + this.formatDate(this.performanceData.interval.end)
				);
				periodDiv.className = "metric-row period";
				metricsDiv.appendChild(periodDiv);
			}

			container.appendChild(metricsDiv);
		}

		return container;
	},

	// Create a metric row
	createMetricRow: function(label, value) {
		var row = document.createElement("div");
		row.className = "metric-row";

		var labelSpan = document.createElement("span");
		labelSpan.className = "metric-label";
		labelSpan.innerHTML = label + ":";

		var valueSpan = document.createElement("span");
		valueSpan.className = "metric-value";
		valueSpan.innerHTML = value;

		// Add color styling for returns
		if (label.includes("Return") && typeof value === "string") {
			if (value.includes("-")) {
				valueSpan.className += " negative";
			} else if (parseFloat(value) > 0) {
				valueSpan.className += " positive";
			}
		}

		row.appendChild(labelSpan);
		row.appendChild(valueSpan);

		return row;
	},

	// Format return value with percentage
	formatReturn: function(value) {
		if (value === null || value === undefined) {
			return "N/A";
		}
		var formatted = (value * 100).toFixed(2) + "%";
		if (value > 0) {
			formatted = "+" + formatted;
		}
		return formatted;
	},

	// Format currency
	formatCurrency: function(value) {
		if (value === null || value === undefined) {
			return "N/A";
		}
		var formatted = value.toFixed(2) + " " + this.config.displayCurrency;
		if (value > 0) {
			formatted = "+" + formatted;
		}
		return formatted;
	},

	// Format date
	formatDate: function(dateString) {
		return moment(dateString).format("MMM D, YYYY");
	},

	// Schedule next update
	scheduleUpdate: function() {
		var self = this;
		this.updatePerformance();
		setInterval(function() {
			self.updatePerformance();
		}, this.config.updateInterval);
	},

	// Request performance data
	updatePerformance: function() {
		if (!this.config.apiToken) {
			this.error = "API token not configured";
			this.updateDom(this.config.animationSpeed);
			return;
		}

		if (!this.config.portfolioIds || this.config.portfolioIds.length === 0) {
			this.error = "Portfolio IDs not configured";
			this.updateDom(this.config.animationSpeed);
			return;
		}

		this.sendSocketNotification("FETCH_PERFORMANCE", {
			apiToken: this.config.apiToken,
			portfolioIds: this.config.portfolioIds,
			interval: {
				type: "relative",
				value: this.config.intervalType
			}
		});
	},

	// Handle socket notifications
	socketNotificationReceived: function(notification, payload) {
		if (notification === "PERFORMANCE_DATA") {
			this.loaded = true;
			this.error = null;
			this.performanceData = payload;
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "PERFORMANCE_ERROR") {
			this.loaded = true;
			this.error = payload.error;
			this.updateDom(this.config.animationSpeed);
			Log.error("Parqet API Error:", payload.error);
		}
	},

	// Override getHeader method
	getHeader: function() {
		return this.config.header;
	}
});
