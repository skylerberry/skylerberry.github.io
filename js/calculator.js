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
                maxAccountPercentage: document.getElementById('maxAccountPercentage'),
                entryPrice: document.getElementById('entryPrice'),
                stopLossPrice: document.getElementById('stopLossPrice'),
                targetPrice: document.getElementById('targetPrice')
            },
            results: {
                shares: document.getElementById('sharesValue'),
                positionSize: document.getElementById('positionSizeValue'),
                stopDistance: document.getElementById('stopDistanceValue'),
                totalRisk: document.getElementById('totalRiskValue'),
                percentOfAccount: document.getElementById('percentOfAccountValue'),
                rMultiple: document.getElementById('rMultipleValue'),
                fiveRTarget: document.getElementById('fiveRTargetValue'),
                profitSection: document.getElementById('profitSection'),
                profitPerShare: document.getElementById('profitPerShareValue'),
                totalProfit: document.getElementById('totalProfitValue'),
                roi: document.getElementById('roiValue'),
                riskReward: document.getElementById('riskRewardValue'),
                limitedAccountDisplay: document.getElementById('limitedAccountDisplay'),
                originalPercentage: document.getElementById('originalPercentage'),
                limitedPercentage: document.getElementById('limitedPercentage')
            },
            errors: {
                stopLoss: document.getElementById('stopLossError'),
                targetPrice: document.getElementById('targetPriceError')
            },
            controls: {
                riskButtons: document.querySelectorAll('.risk-button'),
                maxAccountButtons: document.querySelectorAll('.max-account-button'),
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
        // Account size with shorthand conversion and comma formatting
        this.elements.inputs.accountSize.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            // If completely empty, clear the field and update state
            if (inputValue === '') {
                e.target.value = ''; // Clear the input to show placeholder
                this.updateStateFromInput('accountSize', 0);
                this.debouncedCalculate();
                return;
            }
            
            // Handle shorthand conversion (K/M notation)
            const converted = convertShorthand(inputValue);
            const sanitized = parseFloat(sanitizeInput(inputValue));
            
            // If shorthand was used and converted to a different number, format it
            if (!isNaN(converted) && converted !== sanitized && (inputValue.toLowerCase().includes('k') || inputValue.toLowerCase().includes('m'))) {
                const cursorPosition = e.target.selectionStart;
                const originalLength = e.target.value.length;
                e.target.value = formatNumber(converted);
                const newLength = e.target.value.length;
                const newCursorPosition = cursorPosition + (newLength - originalLength);
                e.target.setSelectionRange(newCursorPosition, newCursorPosition);
                this.updateStateFromInput('accountSize', converted);
            } else {
                // For regular numbers, don't format during typing to allow decimal input
                const numberValue = parseFloat(sanitizeInput(inputValue));
                if (!isNaN(numberValue)) {
                    this.updateStateFromInput('accountSize', numberValue);
                } else {
                    this.updateStateFromInput('accountSize', 0);
                }
            }
            
            this.debouncedCalculate();
        });

        // Handle blur event for final formatting
        this.elements.inputs.accountSize.addEventListener('blur', (e) => {
            const inputValue = e.target.value.trim();
            if (inputValue === '') {
                e.target.value = ''; // Ensure field is empty on blur
                this.updateStateFromInput('accountSize', 0);
            } else if (!isNaN(parseFloat(sanitizeInput(inputValue)))) {
                const numberValue = parseFloat(sanitizeInput(inputValue));
                e.target.value = formatNumber(numberValue);
                this.updateStateFromInput('accountSize', numberValue);
            }
            this.calculate(); // Immediate calculation on blur
        });

        // Other price inputs - handle empty values properly
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

        // Risk percentage - handle empty but default to 1
        this.elements.inputs.riskPercentage.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            if (inputValue === '') {
                // Keep it empty in the UI, but use 1 for calculations
                this.updateStateFromInput('riskPercentage', 1);
                this.updateActiveRiskButton(1);
            } else {
                const value = parseFloat(inputValue) || 1;
                this.updateStateFromInput('riskPercentage', value);
                this.updateActiveRiskButton(value);
            }
            this.debouncedCalculate();
        });

        // Max account percentage - handle empty but default to 100
        this.elements.inputs.maxAccountPercentage.addEventListener('input', (e) => {
            const inputValue = e.target.value.trim();
            
            if (inputValue === '') {
                // Keep it empty in the UI, but use 100 for calculations
                this.updateStateFromInput('maxAccountPercentage', 100);
                this.updateActiveMaxAccountButton(100);
            } else {
                const value = parseFloat(inputValue) || 100;
                this.updateStateFromInput('maxAccountPercentage', value);
                this.updateActiveMaxAccountButton(value);
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

        // Max account buttons
        this.elements.controls.maxAccountButtons.forEach(button => {
            button.addEventListener('click', () => {
                const value = parseFloat(button.getAttribute('data-value'));
                this.elements.inputs.maxAccountPercentage.value = value;
                this.updateStateFromInput('maxAccountPercentage', value);
                this.updateActiveMaxAccountButton(value);
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

        // Scenarios toggles (both buttons)
        this.elements.controls.scenariosButton.addEventListener('click', () => {
            this.toggleScenarios();
        });

        this.elements.controls.quickScenariosButton.addEventListener('click', () => {
            this.toggleScenarios(true); // true = scroll into view
        });

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
        this.elements.controls.riskButtons.forEach(button => {
            const buttonValue = parseFloat(button.getAttribute('data-value'));
            button.classList.toggle('active', Math.abs(buttonValue - value) < 0.01);
        });
    }

    updateActiveMaxAccountButton(value) {
        this.elements.controls.maxAccountButtons.forEach(button => {
            const buttonValue = parseFloat(button.getAttribute('data-value'));
            button.classList.toggle('active', Math.abs(buttonValue - value) < 0.01);
        });
    }

    calculate() {
        const inputs = this.state.calculator.inputs;
        
        // Validate inputs
        const validation = validateTradeInputs(inputs);
        this.state.updateCalculatorValidation(validation);
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
        const originalPositionSize = calculatePositionSize(shares, inputs.entryPrice);
        const originalPercentOfAccount = (originalPositionSize / inputs.accountSize) * 100;
        
        // Apply max account percentage limit
        const maxAccountPercent = inputs.maxAccountPercentage || 100;
        const maxPositionSize = (inputs.accountSize * maxAccountPercent) / 100;
        const limitedPositionSize = Math.min(originalPositionSize, maxPositionSize);
        const limitedShares = Math.floor(limitedPositionSize / inputs.entryPrice);
        const limitedPercentOfAccount = (limitedPositionSize / inputs.accountSize) * 100;
        
        // Determine if position was limited
        const isLimited = limitedPositionSize < originalPositionSize;

        const results = {
            shares: formatNumber(limitedShares),
            positionSize: formatCurrency(limitedPositionSize),
            stopDistance: `${((riskPerShare / inputs.entryPrice) * 100).toFixed(2)}% (${formatCurrency(riskPerShare)})`,
            totalRisk: formatCurrency(limitedShares * riskPerShare),
            percentOfAccount: formatPercentage(limitedPercentOfAccount),
            rMultiple: inputs.targetPrice > inputs.entryPrice
                ? `${calculateRMultiple(inputs.entryPrice, inputs.targetPrice, inputs.stopLossPrice).toFixed(2)} R`
                : DEFAULTS.R_MULTIPLE_EMPTY,
            fiveRTarget: formatCurrency(inputs.entryPrice + (5 * riskPerShare))
        };

        // Calculate profit metrics if target price is specified
        const hasValidTargetPrice = inputs.targetPrice > inputs.entryPrice;

        if (hasValidTargetPrice) {
            const profitPerShare = inputs.targetPrice - inputs.entryPrice;
            const totalProfit = profitPerShare * limitedShares;
            const roi = calculateROI(totalProfit, limitedPositionSize);
            const riskReward = totalProfit / (limitedShares * riskPerShare);

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

        // Update state and UI
        this.state.updateCalculatorResults(results);
        this.renderResults(results);
        this.renderLimitedAccountDisplay(isLimited, originalPercentOfAccount, limitedPercentOfAccount);
        this.updateRiskScenarios(inputs);
    }

    renderResults(results) {
        requestAnimationFrame(() => {
            Object.entries(results).forEach(([key, value]) => {
                if (this.elements.results[key]) {
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
        this.renderResults(emptyResults);
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
            } else if (key === 'maxAccountPercentage') {
                input.value = 100;
                this.updateStateFromInput(key, 100);
            } else {
                input.value = '';
                this.updateStateFromInput(key, 0);
            }
        });

        // Reset buttons
        this.updateActiveRiskButton(DEFAULTS.RISK_PERCENTAGE);
        this.updateActiveMaxAccountButton(100);

        // Reset results and clear errors
        this.resetResults();
        this.displayErrors([]);
        
        // Clear limited display styling
        this.renderLimitedAccountDisplay(false, 0, 0);

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
            
            console.log(`💰 Added profit $${formatNumber(profit)} to account. New balance: $${formatNumber(newAccountSize)}`);
        }
    }

    renderLimitedAccountDisplay(isLimited, originalPercentOfAccount, limitedPercentOfAccount) {
        const percentOfAccountCard = this.elements.results.percentOfAccount.closest('.result-card');
        const positionSizeCard = this.elements.results.positionSize.closest('.result-card');
        
        // Show/hide the limited display
        toggleClass(this.elements.results.limitedAccountDisplay, 'hidden', !isLimited);
        
        // Update the percentage values for side-by-side display
        updateElement(this.elements.results.originalPercentage, `${formatPercentage(originalPercentOfAccount)}`);
        updateElement(this.elements.results.limitedPercentage, `${formatPercentage(limitedPercentOfAccount)}`);
        
        // Apply red styling to both cards when limited
        toggleClass(percentOfAccountCard, 'limited', isLimited);
        toggleClass(positionSizeCard, 'limited', isLimited);
    }
}
