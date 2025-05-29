const elements = {
    inputs: {
        accountSize: document.getElementById('accountSize'),
        riskPercentage: document.getElementById('riskPercentage'),
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
        // New profit section elements
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
        themeSwitch: document.getElementById('theme-switch'),
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

const defaults = {
    riskPercentage: 1,
    emptyResult: '-',
    rMultipleEmpty: '- R'
};

// Utility Functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function sanitizeInput(value) {
    return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

// Updated function to handle both K and M notation
function convertKShorthand(inputValue) {
    const cleanValue = inputValue.replace(/,/g, '');

    // Check for M (millions) first
    const mMatch = cleanValue.match(/^(\d*\.?\d+)[Mm]$/);
    if (mMatch) {
        const numberPart = parseFloat(mMatch[1]);
        if (!isNaN(numberPart)) {
            return numberPart * 1000000;
        }
    }

    // Check for K (thousands)
    const kMatch = cleanValue.match(/^(\d*\.?\d+)[Kk]$/);
    if (kMatch) {
        const numberPart = parseFloat(kMatch[1]);
        if (!isNaN(numberPart)) {
            return numberPart * 1000;
        }
    }

    return parseFloat(cleanValue);
}

// Handle shorthand conversion in real-time
function setupShorthandConversion(input) {
    let isConverting = false;

    input.addEventListener('input', function () {
        if (isConverting) return;

        const cursorPosition = this.selectionStart;
        const originalLength = this.value.length;

        const convertedValue = convertKShorthand(this.value);
        if (!isNaN(convertedValue)) {
            isConverting = true;
            this.value = formatNumber(convertedValue);

            const newLength = this.value.length;
            const newCursorPosition = cursorPosition + (newLength - originalLength);
            this.setSelectionRange(newCursorPosition, newCursorPosition);

            isConverting = false;
        }

        debouncedCalculate();
    });
}

// Validation and Error Handling
function validateInputs({ accountSize, entryPrice, stopLossPrice, targetPrice, riskPercentage }) {
    const errors = [];
    const hasData = accountSize > 0 || entryPrice > 0 || stopLossPrice > 0 || targetPrice > 0;

    if (hasData) {
        if (accountSize <= 0) errors.push({ element: elements.inputs.accountSize, message: 'Account size must be positive' });
        if (entryPrice <= 0) errors.push({ element: elements.inputs.entryPrice, message: 'Entry price must be positive' });
        if (stopLossPrice <= 0) errors.push({ element: elements.inputs.stopLossPrice, message: 'Stop loss must be positive' });
        if (riskPercentage <= 0) errors.push({ element: elements.inputs.riskPercentage, message: 'Risk percentage must be positive' });

        if (stopLossPrice > 0 && entryPrice > 0 && stopLossPrice >= entryPrice) {
            errors.push({
                element: elements.errors.stopLoss,
                message: 'Stop loss must be below entry price'
            });
        }

        if (targetPrice > 0 && entryPrice > 0 && targetPrice <= entryPrice) {
            errors.push({
                element: elements.errors.targetPrice,
                message: 'Target price should be above entry price'
            });
        }
    }

    return errors;
}

function displayErrors(errors) {
    Object.values(elements.errors).forEach(error => {
        error.textContent = '';
        error.classList.add('hidden');
    });
    errors.forEach(({ element, message }) => {
        if (element.tagName === 'INPUT') return;
        element.textContent = message;
        element.classList.remove('hidden');
    });
}

function resetResults() {
    requestAnimationFrame(() => {
        elements.results.shares.textContent = defaults.emptyResult;
        elements.results.positionSize.textContent = defaults.emptyResult;
        elements.results.stopDistance.textContent = defaults.emptyResult;
        elements.results.totalRisk.textContent = defaults.emptyResult;
        elements.results.percentOfAccount.textContent = defaults.emptyResult;
        elements.results.rMultiple.textContent = defaults.rMultipleEmpty;
        elements.results.fiveRTarget.textContent = defaults.emptyResult;

        // Hide and reset profit section
        elements.results.profitSection.classList.add('hidden');
        elements.results.profitPerShare.textContent = defaults.emptyResult;
        elements.results.totalProfit.textContent = defaults.emptyResult;
        elements.results.roi.textContent = defaults.emptyResult;
        elements.results.riskReward.textContent = defaults.emptyResult;

        // Reset scenarios
        elements.scenarios.scenario01.textContent = defaults.emptyResult;
        elements.scenarios.scenario025.textContent = defaults.emptyResult;
        elements.scenarios.scenario05.textContent = defaults.emptyResult;
        elements.scenarios.scenario075.textContent = defaults.emptyResult;
        elements.scenarios.scenario1.textContent = defaults.emptyResult;
    });
}

// Risk Scenarios Function
function updateRiskScenarios(values) {
    const riskLevels = [0.1, 0.25, 0.5, 0.75, 1.0];
    const scenarioElements = [
        elements.scenarios.scenario01,
        elements.scenarios.scenario025,
        elements.scenarios.scenario05,
        elements.scenarios.scenario075,
        elements.scenarios.scenario1
    ];

    // Clear scenarios if no meaningful data
    const hasMeaningfulData = values.accountSize > 0 && values.entryPrice > 0 && values.stopLossPrice > 0;
    if (!hasMeaningfulData || values.stopLossPrice >= values.entryPrice) {
        scenarioElements.forEach(el => el.textContent = '-');
        return;
    }

    const riskPerShare = Math.abs(values.entryPrice - values.stopLossPrice);

    riskLevels.forEach((riskLevel, index) => {
        const dollarRiskAmount = (values.accountSize * riskLevel) / 100;
        const shares = Math.floor(dollarRiskAmount / riskPerShare);
        const positionSize = shares * values.entryPrice;

        scenarioElements[index].textContent = `${formatNumber(shares)} shares (${formatCurrency(positionSize)})`;
    });

    // Update current selection highlight
    const currentRisk = parseFloat(elements.inputs.riskPercentage.value) || 1;
    document.querySelectorAll('.scenario-item').forEach((item, index) => {
        item.classList.toggle('current', riskLevels[index] === currentRisk);
    });
}

// Core Calculation
function calculatePosition() {
    const values = {
        accountSize: parseFloat(sanitizeInput(elements.inputs.accountSize.value)) || 0,
        riskPercentage: parseFloat(elements.inputs.riskPercentage.value) || 0,
        entryPrice: parseFloat(elements.inputs.entryPrice.value) || 0,
        stopLossPrice: parseFloat(elements.inputs.stopLossPrice.value) || 0,
        targetPrice: parseFloat(elements.inputs.targetPrice.value) || 0
    };

    const errors = validateInputs(values);
    displayErrors(errors);

    const hasMeaningfulData = values.accountSize > 0 || values.entryPrice > 0 || values.stopLossPrice > 0 || values.targetPrice > 0;
    if (!hasMeaningfulData) {
        resetResults();
        return;
    }

    if (errors.length > 0) return resetResults();

    const riskPerShare = Math.abs(values.entryPrice - values.stopLossPrice);
    const dollarRiskAmount = (values.accountSize * values.riskPercentage) / 100;
    const shares = Math.floor(dollarRiskAmount / riskPerShare);
    const positionSize = shares * values.entryPrice;

    const results = {
        shares: formatNumber(shares),
        positionSize: formatCurrency(positionSize),
        stopDistance: `${((riskPerShare / values.entryPrice) * 100).toFixed(2)}% (${formatCurrency(riskPerShare)})`,
        totalRisk: formatCurrency(shares * riskPerShare),
        percentOfAccount: formatPercentage((positionSize / values.accountSize) * 100),
        rMultiple: values.targetPrice > values.entryPrice
            ? `${((values.targetPrice - values.entryPrice) / riskPerShare).toFixed(2)} R`
            : defaults.rMultipleEmpty,
        fiveRTarget: formatCurrency(values.entryPrice + (5 * riskPerShare))
    };

    // Calculate profit metrics if target price is specified
    const hasValidTargetPrice = values.targetPrice > values.entryPrice;

    if (hasValidTargetPrice) {
        const profitPerShare = values.targetPrice - values.entryPrice;
        const totalProfit = profitPerShare * shares;
        const roi = (totalProfit / positionSize) * 100;
        const riskReward = totalProfit / (shares * riskPerShare);

        Object.assign(results, {
            profitPerShare: formatCurrency(profitPerShare),
            totalProfit: formatCurrency(totalProfit),
            roi: formatPercentage(roi),
            riskReward: riskReward.toFixed(2)
        });

        elements.results.profitSection.classList.remove('hidden');
    } else {
        elements.results.profitSection.classList.add('hidden');
    }

    requestAnimationFrame(() => {
        Object.entries(results).forEach(([key, value]) => {
            if (elements.results[key]) {
                elements.results[key].textContent = value;
            }
        });
    });

    // Update risk scenarios
    updateRiskScenarios(values);
}

// Debounced calculation
const debouncedCalculate = debounce(calculatePosition, 250);

// Set up shorthand input for Account Size
setupShorthandConversion(elements.inputs.accountSize);

// Risk button quick selects
elements.controls.riskButtons.forEach(button => {
    button.addEventListener('click', function () {
        const value = parseFloat(this.getAttribute('data-value'));
        elements.inputs.riskPercentage.value = value;
        elements.controls.riskButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        debouncedCalculate();
    });
});

// Manual percentage entry
elements.inputs.riskPercentage.addEventListener('input', function () {
    const value = parseFloat(this.value);
    elements.controls.riskButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.getAttribute('data-value')) === value);
    });
    debouncedCalculate();
});

// All other inputs except accountSize
Object.values(elements.inputs).forEach(input => {
    if (input !== elements.inputs.accountSize) {
        input.addEventListener('input', debouncedCalculate);
    }
});

// Clear button
elements.controls.clearButton.addEventListener('click', () => {
    Object.values(elements.inputs).forEach(input => input.value = '');
    elements.inputs.riskPercentage.value = defaults.riskPercentage;
    elements.controls.riskButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-value') === '1');
    });
    resetResults();
    displayErrors([]);
});

// Info toggle
elements.controls.infoButton.addEventListener('click', function () {
    const isHidden = elements.controls.infoContent.classList.toggle('hidden');
    elements.controls.infoIcon.textContent = isHidden ? '+' : '−';
    this.setAttribute('aria-expanded', !isHidden);
    elements.controls.infoContent.setAttribute('aria-expanded', !isHidden);
});

// Scenarios toggle (bottom button)
elements.controls.scenariosButton.addEventListener('click', function () {
    const isHidden = elements.controls.scenariosContent.classList.toggle('hidden');
    elements.controls.scenariosIcon.textContent = isHidden ? '+' : '−';
    this.setAttribute('aria-expanded', !isHidden);
    elements.controls.quickScenariosButton.setAttribute('aria-expanded', !isHidden);
    elements.controls.scenariosContent.setAttribute('aria-expanded', !isHidden);
});

// Quick scenarios button (top button)
elements.controls.quickScenariosButton.addEventListener('click', function () {
    const isHidden = elements.controls.scenariosContent.classList.toggle('hidden');

    // Update both buttons to stay in sync
    elements.controls.scenariosIcon.textContent = isHidden ? '+' : '−';
    this.setAttribute('aria-expanded', !isHidden);
    elements.controls.scenariosButton.setAttribute('aria-expanded', !isHidden);
    elements.controls.scenariosContent.setAttribute('aria-expanded', !isHidden);

    // Scroll scenarios into view when opened from top button
    if (!isHidden) {
        setTimeout(() => {
            elements.controls.scenariosContent.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 100);
    }
});

// Theme switch
elements.controls.themeSwitch.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', this.checked);
    localStorage.setItem('theme', this.checked ? 'dark' : 'light');
});

// Add Profit ➕ to Account
if (elements.controls.addProfitButton) {
    elements.controls.addProfitButton.addEventListener('click', () => {
        const profitText = elements.results.totalProfit.textContent.replace(/[^0-9.-]+/g, '');
        const accountText = sanitizeInput(elements.inputs.accountSize.value);
        const profit = parseFloat(profitText);
        const account = parseFloat(accountText);
        if (!isNaN(profit) && !isNaN(account)) {
            const newAccountSize = account + profit;
            elements.inputs.accountSize.value = formatNumber(newAccountSize);
            debouncedCalculate();
        }
    });
}

// Warn on exit with data
window.addEventListener('beforeunload', function (e) {
    const hasEnteredData = Object.values(elements.inputs).some(input =>
        input.value !== '' && (input.id !== 'riskPercentage' || input.value !== '1')
    );
    if (hasEnteredData) {
        e.preventDefault();
        e.returnValue = 'You have unsaved data in the calculator. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Theme init
function initializeTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        elements.controls.themeSwitch.checked = true;
    }
}

initializeTheme();
calculatePosition();
