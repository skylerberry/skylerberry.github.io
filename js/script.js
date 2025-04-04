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
        fiveRTarget: document.getElementById('fiveRTargetValue')
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
        themeSwitch: document.getElementById('theme-switch')
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

// New function to handle K shorthand conversion
function convertKShorthand(inputValue) {
    // Remove any existing commas for parsing
    const cleanValue = inputValue.replace(/,/g, '');
    // Check if the input ends with 'K' or 'k'
    const kMatch = cleanValue.match(/^(\d*\.?\d+)[Kk]$/);
    if (kMatch) {
        const numberPart = parseFloat(kMatch[1]);
        if (!isNaN(numberPart)) {
            return numberPart * 1000;
        }
    }
    return parseFloat(cleanValue);
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
        elements.results.totalRisk.textContent = defaults.emptyResult;
        elements.results.percentOfAccount.textContent = defaults.emptyResult;
        elements.results.rMultiple.textContent = defaults.rMultipleEmpty;
        elements.results.fiveRTarget.textContent = defaults.emptyResult;
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

    const results = {
        shares: formatNumber(shares),
        positionSize: formatCurrency(shares * values.entryPrice),
        totalRisk: formatCurrency(shares * riskPerShare),
        percentOfAccount: `${((shares * values.entryPrice) / values.accountSize * 100).toFixed(2)}%`,
        rMultiple: values.targetPrice > values.entryPrice 
            ? `${((values.targetPrice - values.entryPrice) / riskPerShare).toFixed(2)} R`
            : defaults.rMultipleEmpty,
        fiveRTarget: formatCurrency(values.entryPrice + (5 * riskPerShare))
    };

    requestAnimationFrame(() => {
        Object.entries(results).forEach(([key, value]) => {
            elements.results[key].textContent = value;
        });
    });
}

// Event Listeners
elements.inputs.accountSize.addEventListener('blur', function() {
    if (this.value) {
        let numericValue = convertKShorthand(this.value); // Convert K shorthand first
        if (!isNaN(numericValue)) {
            this.value = formatNumber(numericValue); // Format with commas
        }
        debouncedCalculate();
    }
});

elements.controls.riskButtons.forEach(button => {
    button.addEventListener('click', function() {
        const value = parseFloat(this.getAttribute('data-value'));
        elements.inputs.riskPercentage.value = value;
        elements.controls.riskButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        debouncedCalculate();
    });
});

elements.inputs.riskPercentage.addEventListener('input', function() {
    const value = parseFloat(this.value);
    elements.controls.riskButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.getAttribute('data-value')) === value);
    });
    debouncedCalculate();
});

const debouncedCalculate = debounce(calculatePosition, 250);
Object.values(elements.inputs).forEach(input => {
    if (input !== elements.inputs.accountSize) {
        input.addEventListener('input', debouncedCalculate);
    }
});

elements.controls.clearButton.addEventListener('click', () => {
    Object.values(elements.inputs).forEach(input => input.value = '');
    elements.inputs.riskPercentage.value = defaults.riskPercentage;
    elements.controls.riskButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-value') === '1');
    });
    resetResults();
    displayErrors([]);
});

elements.controls.infoButton.addEventListener('click', function() {
    const isHidden = elements.controls.infoContent.classList.toggle('hidden');
    elements.controls.infoIcon.textContent = isHidden ? '+' : '−';
    this.setAttribute('aria-expanded', !isHidden);
    elements.controls.infoContent.setAttribute('aria-expanded', !isHidden);
});

elements.controls.themeSwitch.addEventListener('change', function() {
    document.body.classList.toggle('dark-mode', this.checked);
    localStorage.setItem('theme', this.checked ? 'dark' : 'light');
});

window.addEventListener('beforeunload', function(e) {
    const hasEnteredData = Object.values(elements.inputs).some(input => 
        input.value !== '' && (input.id !== 'riskPercentage' || input.value !== '1')
    );
    if (hasEnteredData) {
        e.preventDefault();
        e.returnValue = 'You have unsaved data in the calculator. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Initialization
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    elements.controls.themeSwitch.checked = true;
}
calculatePosition();