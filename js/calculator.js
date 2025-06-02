import { 
    formatCurrency, 
    formatNumber, 
    formatPercentage, 
    sanitizeInput, 
    convertShorthand,
    debounce,
    validateTradeInputs,
    updateElement,
    toggleClass,
    setAttributes,
    calculateShares,
    calculateRiskPerShare,
    calculatePositionSize,
    calculateRMultiple,
    calculateROI,
    DEFAULTS,
    RISK_LEVELS 
} from './utils.js';

export class Calculator {
    constructor(appState) {
        this.state = appState;
        this.elements = this.getElements();
        this.debouncedCalculate = debounce(() => this.calculate(), 250);
    }

    getElements() {
        return {
            inputs: {
                accountSize: document.getElementById('accountSize'),
                riskPercentage: document.getElementById('riskPercentage'),
                maxAccountRisk: document.getElementById('maxAccountRisk'), // NEW
                entryPrice: document.getElementById('entryPrice'),
                stopLossPrice: document.getElementById('stopLossPrice'),
                targetPrice: document.getElementById('targetPrice')
            },
            results: {
                shares: document.getElementById('sharesValue'),
                positionSize: document.getElementById('positionSizeValue'),
                positionSizeCard: document.getElementById('positionSizeCard'), // NEW
                stopDistance: document.getElementById('stopDistanceValue'),
                totalRisk: document.getElementById('totalRiskValue'),
                percentOfAccount: document.getElementById('percentOfAccountValue'),
                percentOfAccountCard: document.getElementById('percentOfAccountCard'), // NEW
                rMultiple: document.getElementById('rMultipleValue'),
                fiveRTarget: document.getElementById('fiveRTargetValue'),
                profitSection: document.getElementById('profitSection'),
                profitPerShare: document.getElementById('profitPerShareValue'),
                totalProfit: document.getElementById('totalProfitValue'),
                roi: document.getElementById('roiValue'),
                riskReward: document.getElementById('riskRewardValue')
            },
            errors: {
                stopLoss: document.getElementById('stopLossError'),
                targetPrice: document.getElementById('targetPriceError')
            },
            controls: {
                riskButtons: document.querySelectorAll('.risk-button'),
                clearButton: document.getElementById('clearButton'),
                infoButton: document.getElementById('infoButton'),
                infoIcon: document.getElementById('infoIcon'),
                infoContent: document.getElementById('infoContent'),
                addProfitButton: document.getElementById('addProfitButton'),
                scenariosButton: document.getElementById('scenariosButton'),
                scenariosIcon: document.getElementById('scenariosIcon'),
                scenariosContent: document.getElementById('scenariosContent'),
                quickScenariosButton: document.getElementById('quickScenariosButton')
            },
            scenarios: {
                scenario01: document.getElementById('scenario-0-1'),
                scenario025: document.getElementById('scenario-0-25'),
                scenario05: document.getElementById('scenario-0-5'),
                scenario075: document.getElementById('scenario-0-75'),
                scenario1: document.getElementById('scenario-1')
            }
        };
    }

    init() {
        this.setupInputHandlers();
        this.setupControlHandlers();
        
        console.log('🧮 Calculator initialized');
    }

    setupInputHandlers() {
        // Add profit button
        if (this.elements.controls.addProfitButton) {
            this.elements.controls.addProfitButton.addEventListener('click', () => {
                this.addProfitToAccount();
            });
        }
    }

    updateStateFromInput(key, value) {
        this.state.updateCalculatorInput(key, value);
    }

    updateActiveRiskButton(value) {
        this.elements.controls.riskButtons.forEach(btn => {
            const isActive = parseFloat(btn.getAttribute('data-value')) === value;
            toggleClass(btn, 'active', isActive);
        });
    }

    // NEW: Create risk warning display elements
    createRiskWarningDisplay(originalValue, correctedValue, isPercentage = false) {
        const container = document.createElement('span');
        container.className = 'risk-exceeded';
        
        const original = document.createElement('span');
        original.className = 'original-value';
        original.textContent = isPercentage ? formatPercentage(originalValue) : formatCurrency(originalValue);
        
        const corrected = document.createElement('span');
        corrected.className = 'corrected-value';
        corrected.textContent = isPercentage ? formatPercentage(correctedValue) : formatCurrency(correctedValue);
        
        container.appendChild(original);
        container.appendChild(corrected);
        
        return container;
    }

    calculate() {
        const inputs = this.state.calculator.inputs;
        
        // Validate inputs
        const validation = validateTradeInputs(inputs);
        this.displayErrors(validation.errors);

        // Reset if no meaningful data
        if (!validation.hasData) {
            this.resetResults();
            return;
        }

        // Reset if validation failed
        if (!validation.isValid) {
            this.resetResults();
            return;
        }

        // Perform calculations
        const riskPerShare = calculateRiskPerShare(inputs.entryPrice, inputs.stopLossPrice);
        const shares = calculateShares(inputs.accountSize, inputs.riskPercentage, riskPerShare);
        const positionSize = calculatePositionSize(shares, inputs.entryPrice);
        const accountPercentage = (positionSize / inputs.accountSize) * 100;

        // NEW: Check if position exceeds max account risk
        const exceedsMaxRisk = inputs.maxAccountRisk !== null && accountPercentage > inputs.maxAccountRisk;
        
        // NEW: Calculate corrected values if needed
        let displayShares = shares;
        let displayPositionSize = positionSize;
        let displayAccountPercentage = accountPercentage;
        
        if (exceedsMaxRisk) {
            const maxPositionSize = (inputs.accountSize * inputs.maxAccountRisk) / 100;
            displayShares = Math.floor(maxPositionSize / inputs.entryPrice);
            displayPositionSize = maxPositionSize;
            displayAccountPercentage = inputs.maxAccountRisk;
        }

        const results = {
            shares: formatNumber(displayShares),
            positionSize: formatCurrency(displayPositionSize),
            stopDistance: `${((riskPerShare / inputs.entryPrice) * 100).toFixed(2)}% (${formatCurrency(riskPerShare)})`,
            totalRisk: formatCurrency(displayShares * riskPerShare),
            percentOfAccount: formatPercentage(displayAccountPercentage),
            rMultiple: inputs.targetPrice > inputs.entryPrice
                ? `${calculateRMultiple(inputs.entryPrice, inputs.targetPrice, inputs.stopLossPrice).toFixed(2)} R`
                : DEFAULTS.R_MULTIPLE_EMPTY,
            fiveRTarget: formatCurrency(inputs.entryPrice + (5 * riskPerShare))
        };

        // Calculate profit metrics if target price is specified
        const hasValidTargetPrice = inputs.targetPrice > inputs.entryPrice;

        if (hasValidTargetPrice) {
            const profitPerShare = inputs.targetPrice - inputs.entryPrice;
            const totalProfit = profitPerShare * displayShares; // Use corrected shares
            const roi = calculateROI(totalProfit, displayPositionSize); // Use corrected position size
            const riskReward = totalProfit / (displayShares * riskPerShare);

            Object.assign(results, {
                profitPerShare: formatCurrency(profitPerShare),
                totalProfit: formatCurrency(totalProfit),
                roi: formatPercentage(roi),
                riskReward: riskReward.toFixed(2)
            });

            toggleClass(this.elements.results.profitSection, 'hidden', false);
        } else {
            toggleClass(this.elements.results.profitSection, 'hidden', true);
        }

        // NEW: Update validation state with risk warning
        const updatedValidation = {
            ...validation,
            exceedsMaxRisk: exceedsMaxRisk
        };
        this.state.updateCalculatorValidation(updatedValidation);

        // Update state and UI
        this.state.updateCalculatorResults(results);
        this.renderResults(results, exceedsMaxRisk, {
            originalPositionSize: positionSize,
            originalAccountPercentage: accountPercentage,
            correctedPositionSize: displayPositionSize,
            correctedAccountPercentage: displayAccountPercentage
        });
        this.updateRiskScenarios(inputs);
    }

    // NEW: Updated renderResults to handle risk warnings
    renderResults(results, exceedsMaxRisk = false, riskData = null) {
        requestAnimationFrame(() => {
            // Handle Position Size with potential warning
            if (exceedsMaxRisk && riskData) {
                this.elements.results.positionSize.innerHTML = '';
                this.elements.results.positionSize.appendChild(
                    this.createRiskWarningDisplay(riskData.originalPositionSize, riskData.correctedPositionSize)
                );
                toggleClass(this.elements.results.positionSizeCard, 'risk-warning', true);
            } else {
                updateElement(this.elements.results.positionSize, results.positionSize);
                toggleClass(this.elements.results.positionSizeCard, 'risk-warning', false);
            }

            // Handle % of Account with potential warning
            if (exceedsMaxRisk && riskData) {
                this.elements.results.percentOfAccount.innerHTML = '';
                this.elements.results.percentOfAccount.appendChild(
                    this.createRiskWarningDisplay(riskData.originalAccountPercentage, riskData.correctedAccountPercentage, true)
                );
                toggleClass(this.elements.results.percentOfAccountCard, 'risk-warning', true);
            } else {
                updateElement(this.elements.results.percentOfAccount, results.percentOfAccount);
                toggleClass(this.elements.results.percentOfAccountCard, 'risk-warning', false);
            }

            // Update other results normally
            Object.entries(results).forEach(([key, value]) => {
                if (key !== 'positionSize' && key !== 'percentOfAccount' && this.elements.results[key]) {
                    updateElement(this.elements.results[key], value);
                }
            });
        });
    }

    resetResults() {
        const emptyResults = {
            shares: DEFAULTS.EMPTY_RESULT,
            positionSize: DEFAULTS.EMPTY_RESULT,
            stopDistance: DEFAULTS.EMPTY_RESULT,
            totalRisk: DEFAULTS.EMPTY_RESULT,
            percentOfAccount: DEFAULTS.EMPTY_RESULT,
            rMultiple: DEFAULTS.R_MULTIPLE_EMPTY,
            fiveRTarget: DEFAULTS.EMPTY_RESULT,
            profitPerShare: DEFAULTS.EMPTY_RESULT,
            totalProfit: DEFAULTS.EMPTY_RESULT,
            roi: DEFAULTS.EMPTY_RESULT,
            riskReward: DEFAULTS.EMPTY_RESULT
        };

        this.state.updateCalculatorResults(emptyResults);
        this.renderResults(emptyResults, false); // No risk warnings when reset
        toggleClass(this.elements.results.profitSection, 'hidden', true);
        this.resetScenarios();
    }

    displayErrors(errors) {
        // Clear existing errors
        Object.values(this.elements.errors).forEach(errorElement => {
            updateElement(errorElement, '');
            toggleClass(errorElement, 'hidden', true);
        });

        // Display new errors
        errors.forEach(({ field, message }) => {
            if (field === 'stopLossPrice' && this.elements.errors.stopLoss) {
                updateElement(this.elements.errors.stopLoss, message);
                toggleClass(this.elements.errors.stopLoss, 'hidden', false);
            } else if (field === 'targetPrice' && this.elements.errors.targetPrice) {
                updateElement(this.elements.errors.targetPrice, message);
                toggleClass(this.elements.errors.targetPrice, 'hidden', false);
            }
        });
    }

    updateRiskScenarios(inputs) {
        const scenarioElements = [
            this.elements.scenarios.scenario01,
            this.elements.scenarios.scenario025,
            this.elements.scenarios.scenario05,
            this.elements.scenarios.scenario075,
            this.elements.scenarios.scenario1
        ];

        // Clear scenarios if no meaningful data
        const hasMeaningfulData = inputs.accountSize > 0 && inputs.entryPrice > 0 && inputs.stopLossPrice > 0;
        if (!hasMeaningfulData || inputs.stopLossPrice >= inputs.entryPrice) {
            scenarioElements.forEach(el => updateElement(el, DEFAULTS.EMPTY_RESULT));
            return;
        }

        const riskPerShare = calculateRiskPerShare(inputs.entryPrice, inputs.stopLossPrice);
        
        RISK_LEVELS.forEach((riskLevel, index) => {
            const shares = calculateShares(inputs.accountSize, riskLevel, riskPerShare);
            const positionSize = calculatePositionSize(shares, inputs.entryPrice);
            
            const text = `${formatNumber(shares)} shares (${formatCurrency(positionSize)})`;
            updateElement(scenarioElements[index], text);
        });

        // Update current selection highlight
        const currentRisk = inputs.riskPercentage;
        document.querySelectorAll('.scenario-item').forEach((item, index) => {
            toggleClass(item, 'current', RISK_LEVELS[index] === currentRisk);
        });
    }

    resetScenarios() {
        Object.values(this.elements.scenarios).forEach(el => {
            updateElement(el, DEFAULTS.EMPTY_RESULT);
        });

        document.querySelectorAll('.scenario-item').forEach(item => {
            toggleClass(item, 'current', false);
        });
    }

    clearAll() {
        // Reset inputs
        Object.entries(this.elements.inputs).forEach(([key, input]) => {
            if (key === 'riskPercentage') {
                input.value = DEFAULTS.RISK_PERCENTAGE;
                this.updateStateFromInput(key, DEFAULTS.RISK_PERCENTAGE);
            } else if (key === 'maxAccountRisk') {
                input.value = ''; // NEW: Clear max account risk
                this.updateStateFromInput(key, null);
            } else {
                input.value = '';
                this.updateStateFromInput(key, 0);
            }
        });

        // Reset risk buttons
        this.updateActiveRiskButton(DEFAULTS.RISK_PERCENTAGE);

        // Reset results and clear errors
        this.resetResults();
        this.displayErrors([]);

        console.log('🧹 Calculator cleared');
    }

    toggleInfo() {
        const isHidden = this.elements.controls.infoContent.classList.toggle('hidden');
        updateElement(this.elements.controls.infoIcon, isHidden ? '+' : '−');
        setAttributes(this.elements.controls.infoButton, { 'aria-expanded': !isHidden });
        setAttributes(this.elements.controls.infoContent, { 'aria-expanded': !isHidden });
    }

    toggleScenarios(scrollIntoView = false) {
        const isHidden = this.elements.controls.scenariosContent.classList.toggle('hidden');
        
        // Update both buttons to stay in sync
        updateElement(this.elements.controls.scenariosIcon, isHidden ? '+' : '−');
        setAttributes(this.elements.controls.scenariosButton, { 'aria-expanded': !isHidden });
        setAttributes(this.elements.controls.quickScenariosButton, { 'aria-expanded': !isHidden });
        setAttributes(this.elements.controls.scenariosContent, { 'aria-expanded': !isHidden });
        
        // Scroll scenarios into view when opened from top button
        if (!isHidden && scrollIntoView) {
            setTimeout(() => {
                this.elements.controls.scenariosContent.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 100);
        }
    }

    addProfitToAccount() {
        const profitText = this.elements.results.totalProfit.textContent.replace(/[^0-9.-]+/g, '');
        const accountText = sanitizeInput(this.elements.inputs.accountSize.value);
        const profit = parseFloat(profitText);
        const account = parseFloat(accountText);
        
        if (!isNaN(profit) && !isNaN(account) && profit > 0) {
            const newAccountSize = account + profit;
            this.elements.inputs.accountSize.value = formatNumber(newAccountSize);
            this.updateStateFromInput('accountSize', newAccountSize);
            this.calculate();
            
            console.log(`💰 Added profit ${formatNumber(profit)} to account. New balance: ${formatNumber(newAccountSize)}`);
        }
    }
} Account size with shorthand conversion and comma formatting
        this.elements.inputs.accountSize.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            if (inputValue === '') {
                e.target.value = '';
                this.updateStateFromInput('accountSize', 0);
                this.debouncedCalculate();
                return;
            }
            
            const converted = convertShorthand(inputValue);
            const sanitized = parseFloat(sanitizeInput(inputValue));
            
            if (!isNaN(converted) && converted !== sanitized && (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m'))) {
                const cursorPosition = e.target.selectionStart;
                const originalLength = e.target.value.length;
                e.target.value = formatNumber(converted);
                const newLength = e.target.value.length;
                const newCursorPosition = cursorPosition + (newLength - originalLength);
                e.target.setSelectionRange(newCursorPosition, newCursorPosition);
                this.updateStateFromInput('accountSize', converted);
            } else {
                const numberValue = parseFloat(sanitizeInput(inputValue));
                if (!isNaN(numberValue)) {
                    const cursorPosition = e.target.selectionStart;
                    const originalLength = e.target.value.length;
                    e.target.value = formatNumber(numberValue);
                    const newLength = e.target.value.length;
                    const newCursorPosition = cursorPosition + (newLength - originalLength);
                    e.target.setSelectionRange(newCursorPosition, newCursorPosition);
                    this.updateStateFromInput('accountSize', numberValue);
                } else {
                    this.updateStateFromInput('accountSize', 0);
                }
            }
            
            this.debouncedCalculate();
        });

        this.elements.inputs.accountSize.addEventListener('blur', (e) => {
            const inputValue = e.target.value.trim();
            if (inputValue === '') {
                e.target.value = '';
                this.updateStateFromInput('accountSize', 0);
            } else if (!isNaN(parseFloat(sanitizeInput(inputValue)))) {
                const numberValue = parseFloat(sanitizeInput(inputValue));
                e.target.value = formatNumber(numberValue);
                this.updateStateFromInput('accountSize', numberValue);
            }
            this.calculate();
        });

        // Other price inputs
        ['entryPrice', 'stopLossPrice', 'targetPrice'].forEach(inputName => {
            this.elements.inputs[inputName].addEventListener('input', (e) => {
                const inputValue = e.target.value.trim();
                
                if (inputValue === '') {
                    this.updateStateFromInput(inputName, 0);
                } else {
                    const value = parseFloat(sanitizeInput(inputValue)) || 0;
                    this.updateStateFromInput(inputName, value);
                }
                this.debouncedCalculate();
            });
        });

        // Risk percentage
        this.elements.inputs.riskPercentage.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            if (inputValue === '') {
                this.updateStateFromInput('riskPercentage', 1);
                this.updateActiveRiskButton(1);
            } else {
                const value = parseFloat(inputValue) || 1;
                this.updateStateFromInput('riskPercentage', value);
                this.updateActiveRiskButton(value);
            }
            this.debouncedCalculate();
        });

        // NEW: Max Account Risk input handler
        this.elements.inputs.maxAccountRisk.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            if (inputValue === '') {
                this.updateStateFromInput('maxAccountRisk', null); // null = no limit
            } else {
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value > 0) {
                    this.updateStateFromInput('maxAccountRisk', value);
                } else {
                    this.updateStateFromInput('maxAccountRisk', null);
                }
            }
            this.debouncedCalculate();
        });
    }

    setupControlHandlers() {
        // Risk buttons
        this.elements.controls.riskButtons.forEach(button => {
            button.addEventListener('click', () => {
                const value = parseFloat(button.getAttribute('data-value'));
                this.elements.inputs.riskPercentage.value = value;
                this.updateStateFromInput('riskPercentage', value);
                this.updateActiveRiskButton(value);
                this.calculate();
            });
        });

        // Clear button
        this.elements.controls.clearButton.addEventListener('click', () => {
            this.clearAll();
        });

        // Info toggle
        this.elements.controls.infoButton.addEventListener('click', () => {
            this.toggleInfo();
        });

        // Scenarios toggles
        this.elements.controls.scenariosButton.addEventListener('click', () => {
            this.toggleScenarios();
        });

        this.elements.controls.quickScenariosButton.addEventListener('click', () => {
            this.toggleScenarios(true);
        });

        //
