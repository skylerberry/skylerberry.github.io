// Get DOM elements
const accountSizeInput = document.getElementById('accountSize');
const riskPercentageInput = document.getElementById('riskPercentage');
const riskButtons = document.querySelectorAll('.risk-button');
const entryPriceInput = document.getElementById('entryPrice');
const stopLossPriceInput = document.getElementById('stopLossPrice');
const targetPriceInput = document.getElementById('targetPrice');
const stopLossError = document.getElementById('stopLossError');
const targetPriceError = document.getElementById('targetPriceError');
const clearButton = document.getElementById('clearButton');

// Results elements
const sharesValue = document.getElementById('sharesValue');
const positionSizeValue = document.getElementById('positionSizeValue');
const totalRiskValue = document.getElementById('totalRiskValue');
const percentOfAccountValue = document.getElementById('percentOfAccountValue');
const rMultipleValue = document.getElementById('rMultipleValue');
const fiveRTargetValue = document.getElementById('fiveRTargetValue');

// Info section elements
const infoButton = document.getElementById('infoButton');
const infoIcon = document.getElementById('infoIcon');
const infoContent = document.getElementById('infoContent');

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Format number with commas
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

// Handle account size input with comma formatting
accountSizeInput.addEventListener('blur', function() {
    if (this.value === '') return;
    
    const numericValue = parseFloat(this.value.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
        this.value = formatNumber(numericValue);
    }
    calculatePosition();
});

// Handle risk percentage button clicks
riskButtons.forEach(button => {
    button.addEventListener('click', function() {
        const value = parseFloat(this.getAttribute('data-value'));
        riskPercentageInput.value = value;
        
        // Update active button
        riskButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        calculatePosition();
    });
});

// Handle risk percentage input changes
riskPercentageInput.addEventListener('input', function() {
    // Update active button if matching value is found
    const value = parseFloat(this.value);
    riskButtons.forEach(btn => {
        const btnValue = parseFloat(btn.getAttribute('data-value'));
        if (btnValue === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    calculatePosition();
});

// Handle other inputs
[entryPriceInput, stopLossPriceInput, targetPriceInput].forEach(input => {
    input.addEventListener('input', calculatePosition);
});

// Handle clear button
clearButton.addEventListener('click', function() {
    accountSizeInput.value = '';
    riskPercentageInput.value = '1';
    entryPriceInput.value = '';
    stopLossPriceInput.value = '';
    targetPriceInput.value = '';
    
    // Reset risk buttons
    riskButtons.forEach(btn => {
        if (btn.getAttribute('data-value') === '1') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Reset results
    sharesValue.textContent = '-';
    positionSizeValue.textContent = '-';
    totalRiskValue.textContent = '-';
    percentOfAccountValue.textContent = '-';
    rMultipleValue.textContent = '- R';
    fiveRTargetValue.textContent = '-';
    
    // Hide errors
    stopLossError.textContent = '';
    stopLossError.classList.add('hidden');
    targetPriceError.textContent = '';
    targetPriceError.classList.add('hidden');
});

// Toggle info section
infoButton.addEventListener('click', function() {
    if (infoContent.classList.contains('hidden')) {
        infoContent.classList.remove('hidden');
        infoIcon.textContent = '−';
    } else {
        infoContent.classList.add('hidden');
        infoIcon.textContent = '+';
    }
});

// Calculate position
function calculatePosition() {
    // Clear errors
    stopLossError.textContent = '';
    stopLossError.classList.add('hidden');
    targetPriceError.textContent = '';
    targetPriceError.classList.add('hidden');
    
    // Get input values
    const accountSize = parseFloat(accountSizeInput.value.replace(/[^0-9.]/g, '')) || 0;
    const riskPercentage = parseFloat(riskPercentageInput.value) || 0;
    const entryPrice = parseFloat(entryPriceInput.value) || 0;
    const stopLossPrice = parseFloat(stopLossPriceInput.value) || 0;
    const targetPrice = parseFloat(targetPriceInput.value) || 0;
    
    // Validate inputs
    if (entryPrice <= 0 || stopLossPrice <= 0 || accountSize <= 0 || riskPercentage <= 0) {
        // Don't show error on initial load or if fields are empty
        if (entryPrice === 0 && stopLossPrice === 0 && accountSize === 0) {
            return;
        }
        
        // Reset results
        sharesValue.textContent = '-';
        positionSizeValue.textContent = '-';
        totalRiskValue.textContent = '-';
        percentOfAccountValue.textContent = '-';
        rMultipleValue.textContent = '- R';
        fiveRTargetValue.textContent = '-';
        return;
    }
    
    // Check if stop loss is properly positioned for long position
    if (stopLossPrice >= entryPrice) {
        stopLossError.textContent = 'Stop loss must be below entry price for a long position.';
        stopLossError.classList.remove('hidden');
        return;
    }
    
    // Check if target price (if provided) is properly positioned
    if (targetPrice > 0 && targetPrice <= entryPrice) {
        targetPriceError.textContent = 'Target price should be above entry price for a long position.';
        targetPriceError.classList.remove('hidden');
        return;
    }
    
    // Calculate risk per share
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    
    // Calculate dollar risk amount
    const dollarRiskAmount = (accountSize * riskPercentage) / 100;
    
    // Calculate number of shares
    const calculatedShares = Math.floor(dollarRiskAmount / riskPerShare);
    
    // Calculate position size
    const calculatedPositionSize = calculatedShares * entryPrice;
    
    // Calculate total risk
    const calculatedTotalRisk = calculatedShares * riskPerShare;
    
    // Calculate R multiple
    let calculatedRiskRewardRatio = 0;
    if (targetPrice > entryPrice) {
        const rewardPerShare = targetPrice - entryPrice;
        calculatedRiskRewardRatio = rewardPerShare / riskPerShare;
    }
    
    // Calculate 5R target price
    const calculatedFiveRTargetPrice = entryPrice + (5 * riskPerShare);
    
    // Update results
    sharesValue.textContent = formatNumber(calculatedShares);
    positionSizeValue.textContent = formatCurrency(calculatedPositionSize);
    totalRiskValue.textContent = formatCurrency(calculatedTotalRisk);
    
    const percentOfAccount = (calculatedPositionSize / accountSize * 100).toFixed(2);
    percentOfAccountValue.textContent = `${percentOfAccount}%`;
    
    if (calculatedRiskRewardRatio > 0) {
        rMultipleValue.textContent = `${calculatedRiskRewardRatio.toFixed(2)} R`;
    } else {
        rMultipleValue.textContent = '- R';
    }
    
    fiveRTargetValue.textContent = formatCurrency(calculatedFiveRTargetPrice);
}
