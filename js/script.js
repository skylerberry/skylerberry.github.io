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
        // NEW: Add profit button
        addProfitButton: document.getElementById('addProfitButton')
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

// Convert shorthand notation (K for thousands)
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
    let isConverting = false; // Flag to prevent infinite loops

    input.addEventListener('input', function() {
        if (isConverting) return; // Prevent re-triggering during conversion

        const cursorPosition = this.selectionStart; // Save cursor position
        const originalLength = this.value.length;

        const convertedValue = convertKShorthand(this.value);
        if (!isNaN(convertedValue)) {
            isConverting = true; // Set flag to prevent loop
            this.value = formatNumber(convertedValue); // Update value with formatted number

            // Adjust cursor position after conversion
            const newLength = this.value.length;
            const cursorAdjustment = newLength - originalLength;
            const newCursorPosition = cursorPosition + cursorAdjustment;
            this.setSelectionRange(newCursorPosition, newCursorPosition);

            isConverting = false; // Reset flag
        }

        debouncedCalculate(); // Trigger calculation
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
        
        // NEW: Update add profit button state
        updateAddProfitButtonState();
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
        
        // Add profit results
        Object.assign(results, {
            profitPerShare: formatCurrency(profitPerShare),
            totalProfit: formatCurrency(totalProfit),
            roi: formatPercentage(roi),
            riskReward: riskReward.toFixed(2)
        });
        
        // Show profit section
        elements.results.profitSection.classList.remove('hidden');
        
        // NEW: Update add profit button state
        updateAddProfitButtonState();
    } else {
        // Hide profit section if no target price
        elements.results.profitSection.classList.add('hidden');
        
        // NEW: Update add profit button state
        updateAddProfitButtonState();
    }

    requestAnimationFrame(() => {
        // Update all result elements
        Object.entries(results).forEach(([key, value]) => {
            if (elements.results[key]) {
                elements.results[key].textContent = value;
            }
        });
    });
}

// NEW FUNCTION: Add profit to account size
function addProfitToAccount() {
    // Get current account size and profit values
    const accountSizeInput = elements.inputs.accountSize;
    const totalProfitText = elements.results.totalProfit.textContent;
    
    // If either is not available, do nothing
    if (accountSizeInput.value === '' || totalProfitText === defaults.emptyResult) {
        return;
    }
    
    // Convert values to numbers - improved parsing
    const currentAccountSize = parseFloat(sanitizeInput(accountSizeInput.value)) || 0;
    // Extract just the number from the currency string
    const profitString = totalProfitText.replace(/[^0-9.-]/g, '');
    const profitValue = parseFloat(profitString) || 0;
    
    if (profitValue <= 0) {
        return;
    }
    
    // Calculate new account size
    const newAccountSize = currentAccountSize + profitValue;
    
    // Create a visual feedback animation
    const accountSizeElement = accountSizeInput;
    accountSizeElement.classList.add('highlight-update');
    setTimeout(() => accountSizeElement.classList.remove('highlight-update'), 1500);
    
    // Update account size input with formatted value
    accountSizeInput.value = formatNumber(newAccountSize);
    
    // Recalculate everything with the new account size
    calculatePosition();
}

// NEW FUNCTION: Update add profit button state
function updateAddProfitButtonState() {
    const totalProfitText = elements.results.totalProfit.textContent;
    const hasProfit = totalProfitText !== defaults.emptyResult && 
                     !totalProfitText.includes('-') &&
                     totalProfitText !== '$0.00';
    
    elements.controls.addProfitButton.disabled = !hasProfit;
    
    // Add tooltip only if profit exists
    if (hasProfit) {
        elements.controls.addProfitButton.title = "Add profit to account size";
    } else {
        elements.controls.addProfitButton.title = "";
    }
}

// Event Listeners
// Remove the old blur event listener for accountSize and use the new function
setupShorthandConversion(elements.inputs.accountSize);

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

// NEW: Add event listener for add profit button
elements.controls.addProfitButton.addEventListener('click', addProfitToAccount);

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
function initializeTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        elements.controls.themeSwitch.checked = true;
    }
}

initializeTheme();
calculatePosition();
