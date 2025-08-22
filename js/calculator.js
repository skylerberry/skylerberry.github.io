// In calculator.js

// ... (keep all imports)

export class Calculator {
	constructor(appState) {
		this.state = appState;
		this.elements = this.getElements();
		this.debouncedCalculate = debounce(() => this.calculate(), 250);
	}

	getElements() {
		// This method needs to be completely updated for the new structure
		return {
			inputs: {
				accountSize: document.getElementById("accountSize"),
				riskPercentage: document.getElementById("riskPercentage"),
				entryPrice: document.getElementById("entryPrice"),
				stopLossPrice: document.getElementById("stopLossPrice"),
				targetPrice: document.getElementById("targetPrice"),
			},
			results: {
				shares: document.getElementById("sharesValue"),
				positionSize: document.getElementById("positionSizeValue"),
				percentOfAccount: document.getElementById("percentOfAccountValue"),
				stopDistance: document.getElementById("stopDistanceValue"),
				totalRisk: document.getElementById("totalRiskValue"),
				rMultiple: document.getElementById("rMultipleValue"),
				riskReward: document.getElementById("riskRewardValue"),
				profitSection: document.getElementById("profitSection"),
				profitPerShare: document.getElementById("profitPerShareValue"),
				totalProfit: document.getElementById("totalProfitValue"),
				roi: document.getElementById("roiValue"),
			},
			errors: {
				stopLoss: document.getElementById("stopLossError"),
				targetPrice: document.getElementById("targetPriceError"),
			},
			controls: {
				riskButtonsContainer: document.getElementById("riskButtons"),
				riskRadioButtons: document.querySelectorAll(
					'input[name="risk"]'
				),
				clearButton: document.getElementById("clearButton"),
				addProfitButton: document.getElementById("addProfitButton"),
				// Accordion controls
				infoButton: document.getElementById("infoButton"),
				infoContent: document.getElementById("infoContent"),
				scenariosButton: document.getElementById("scenariosButton"),
				scenariosContent: document.getElementById("scenariosContent"),
			},
		};
	}

	init() {
		this.setupInputHandlers();
		this.setupControlHandlers();
		// Populate static content that was removed from HTML
		this.populateAccordionContent();
		console.log("🧮 Calculator 2.0 initialized");
	}

	setupInputHandlers() {
		// This part remains largely the same, just ensure the IDs match
		// ... (Your existing setupInputHandlers code for text/number inputs)
	}

	setupControlHandlers() {
		// Updated for segmented control and accordion
		this.elements.controls.riskRadioButtons.forEach((radio) => {
			radio.addEventListener("change", () => {
				const value = parseFloat(radio.value);
				this.elements.inputs.riskPercentage.value = value;
				this.updateStateFromInput("riskPercentage", value);
				this.calculate();
			});
		});

		// Sync number input with radio buttons
		this.elements.inputs.riskPercentage.addEventListener("input", (e) => {
			const value = parseFloat(e.target.value) || 1;
			this.updateStateFromInput("riskPercentage", value);
			this.updateActiveRiskButton(value);
			this.debouncedCalculate();
		});

		this.elements.controls.clearButton.addEventListener("click", () => {
			this.clearAll();
		});

		this.elements.controls.addProfitButton.addEventListener("click", () => {
			this.addProfitToAccount();
		});

		// Accordion handlers
		this.elements.controls.infoButton.addEventListener("click", () =>
			this.toggleAccordion(
				this.elements.controls.infoButton,
				this.elements.controls.infoContent
			)
		);
		this.elements.controls.scenariosButton.addEventListener("click", () =>
			this.toggleAccordion(
				this.elements.controls.scenariosButton,
				this.elements.controls.scenariosContent
			)
		);
	}

	updateActiveRiskButton(value) {
		// New logic for radio buttons
		let matched = false;
		this.elements.controls.riskRadioButtons.forEach((radio) => {
			if (Math.abs(parseFloat(radio.value) - value) < 0.01) {
				radio.checked = true;
				matched = true;
			}
		});
		if (!matched) {
			// Uncheck all if the value is custom
			this.elements.controls.riskRadioButtons.forEach(
				(radio) => (radio.checked = false)
			);
		}
	}

	calculate() {
		// This method's logic is mostly the same.
		// The main change is how results are rendered to the new elements.
		// ... (Your existing validation and calculation logic)

		// Example of updated rendering part:
		const results = {
			shares: formatNumber(limitedShares),
			positionSize: formatCurrency(limitedPositionSize),
			// ... other results
		};

		// ... (profit calculation logic)

		this.state.updateCalculatorResults(results);
		this.renderResults(results); // This method will need minor tweaks
		this.updateRiskScenarios(inputs);
	}

	renderResults(results) {
		// Update this to target the new elements
		requestAnimationFrame(() => {
			updateElement(this.elements.results.shares, results.shares);
			updateElement(
				this.elements.results.positionSize,
				results.positionSize
			);
			updateElement(
				this.elements.results.percentOfAccount,
				results.percentOfAccount
			);
			// ... and so on for all result elements
		});
	}

	toggleAccordion(button, content) {
		const isExpanded = button.getAttribute("aria-expanded") === "true";
		button.setAttribute("aria-expanded", !isExpanded);
		if (isExpanded) {
			content.style.display = "none";
		} else {
			content.style.display = "block";
		}
	}

	populateAccordionContent() {
		// Since we removed the static content from HTML to keep it clean,
		// we can inject it here.
		this.elements.controls.infoContent.innerHTML = `
            <div class="info-example">
                <p><strong>Example:</strong> With a <strong>$10,000</strong> account, risking <strong>1%</strong> ($100):</p>
                <ul>
                    <li>Stock Price: $50, Stop: $48 (Risking $2/share)</li>
                    <li>Shares to Buy: $100 ÷ $2 = <strong>50 shares</strong></li>
                    <li>Position Size: 50 × $50 = <strong>$2,500</strong></li>
                </ul>
                <p>This ensures your max loss on the trade is capped at your chosen risk amount.</p>
            </div>`;

		// You can similarly populate the scenarios content dynamically
	}

	// ... (Keep other methods like clearAll, addProfitToAccount, etc.,
	// ensuring they target the correct new elements)
}
