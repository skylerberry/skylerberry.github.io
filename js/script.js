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
        totalRisk: document.getElementById('totalRiskValue'),
        percentOfAccount: document.getElementById('percentOfAccountValue'),
        rMultiple: document.getElementById('rMultipleValue'),
        fiveRTarget: document.getElementById('fiveRTargetValue'),
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
        steps: document.querySelectorAll('.step'),
        calculateButton: document.getElementById('calculateButton'),
        themeSwitch: document.getElementById('theme-switch')
    }
};

const defaults = {
    riskPercentage: 1,
    emptyResult: '-'
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

function convertKShorthand(inputValue) {
    const cleanValue = inputValue.replace(/,/g, '');
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
        Object.values(elements.results).forEach(result => {
            result.textContent = defaults.emptyResult;
        });
        elements.results.rMultiple.textContent = '- R';
        elements.results.fiveRTarget.textContent = defaults.emptyResult;
        elements.results.profitSection.classList.add('hidden');
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
        totalRisk: formatCurrency(shares * riskPerShare),
        percentOfAccount: formatPercentage((positionSize / values.accountSize) * 100),
        rMultiple: values.targetPrice > values.entryPrice
            ? `${((values.targetPrice - values.entryPrice) / riskPerShare).toFixed(2)} R`
            : '- R',
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
}

// Debounced calculation
const debouncedCalculate = debounce(calculatePosition, 250);

// Set up shorthand input for Account Size
setupShorthandConversion(elements.inputs.accountSize);

// Risk button quick selects
elements.controls.calculateButton.addEventListener('click', debouncedCalculate);

// Manual percentage entry
elements.inputs.riskPercentage.addEventListener('input', debouncedCalculate);

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
    resetResults();
    displayErrors([]);
});

// Theme switch
elements.controls.themeSwitch.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', this.checked);
    localStorage.setItem('theme', this.checked ? 'dark' : 'light');
});

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
