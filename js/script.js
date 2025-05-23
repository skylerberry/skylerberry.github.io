// Parse k/m notation
function parseAccountSize(value) {
    if (!value) return 0;
    
    // Remove all non-numeric characters except k, m, and decimal point
    let cleanValue = value.toLowerCase().replace(/[^0-9km.]/g, '');
    
    // Check for k or m suffix
    if (cleanValue.endsWith('k')) {
        return parseFloat(cleanValue.slice(0, -1)) * 1000;
    } else if (cleanValue.endsWith('m')) {
        return parseFloat(cleanValue.slice(0, -1)) * 1000000;
    } else {
        return parseFloat(cleanValue) || 0;
    }
}

// Format number with commas
function formatNumber(num) {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format currency
function formatCurrency(num) {
    if (num >= 1000000) {
        return '$' + (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 10000) {
        return '$' + Math.round(num / 1000).toLocaleString() + 'K';
    }
    return '$' + formatNumber(Math.round(num));
}

// Handle input formatting for accountSize
document.getElementById('accountSize').addEventListener('input', function(e) {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const originalLength = input.value.length;
    
    // Parse the input value
    let value = input.value.replace(/,/g, ''); // Remove existing commas
    const parsedValue = parseAccountSize(value);
    
    if (parsedValue) {
        // Format with commas
        const formattedValue = formatNumber(parsedValue);
        
        // Calculate cursor adjustment due to comma insertion
        const newLength = formattedValue.length;
        const commasAdded = (formattedValue.match(/,/g) || []).length;
        const commasBeforeCursor = (input.value.slice(0, cursorPosition).match(/,/g) || []).length;
        const cursorAdjustment = (newLength - originalLength) - (commasAdded - commasBeforeCursor);
        
        // Update input value
        input.value = formattedValue;
        
        // Restore cursor position
        input.selectionStart = input.selectionEnd = cursorPosition + cursorAdjustment;
    }
    
    // Trigger calculation
    calculatePosition();
});

// Handle risk preset buttons
document.querySelectorAll('.risk-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('riskPercentage').value = this.dataset.risk;
        calculatePosition();
    });
});

// Auto-calculate on input change (excluding accountSize to avoid duplicate events)
document.querySelectorAll('input:not(#accountSize)').forEach(input => {
    input.addEventListener('input', calculatePosition);
});

function calculatePosition() {
    // Get input values
    const accountSize = parseAccountSize(document.getElementById('accountSize').value.replace(/,/g, ''));
    const riskPercentage = parseFloat(document.getElementById('riskPercentage').value) || 0;
    const entryPrice = parseFloat(document.getElementById('entryPrice').value) || 0;
    const stopLoss = parseFloat(document.getElementById('stopLoss').value) || 0;
    const targetPrice = parseFloat(document.getElementById('targetPrice').value) || 0;

    // Clear warnings
    const warningEl = document.getElementById('warningMessage');
    warningEl.classList.remove('show');

    // Default values if no calculation
    if (!accountSize || !riskPercentage || !entryPrice || !stopLoss) {
        document.getElementById('sharesToBuy').textContent = '0';
        document.getElementById('positionSize').textContent = '$0';
        document.getElementById('riskAmount').textContent = '$0';
        document.getElementById('accountPercent').textContent = '0%';
        document.getElementById('target5R').textContent = '$0';
        document.getElementById('rMultiple').textContent = '0R';
        document.getElementById('profitPerShare').textContent = '$0';
        document.getElementById('totalProfit').textContent = '$0';
        document.getElementById('rrRatio').textContent = '0:1';
        document.getElementById('roi').textContent = '0%';
        return;
    }

    // Calculate risk amount
    const riskAmount = accountSize * (riskPercentage / 100);
    
    // Calculate price differences
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const targetDistance = targetPrice ? Math.abs(targetPrice - entryPrice) : 0;
    
    // Calculate shares
    const shares = Math.floor(riskAmount / stopDistance);
    
    // Calculate position size
    const positionSize = shares * entryPrice;
    
    // Calculate account percentage
    const accountPercent = (positionSize / accountSize) * 100;
    
    // Calculate 5R target
    const target5R = entryPrice + (stopDistance * 5);
    
    // Calculate R multiple and profits if target is set
    let rMultiple = 0;
    let profitPerShare = 0;
    let totalProfit = 0;
    let rrRatio = 0;
    let roi = 0;
    
    if (targetPrice && targetPrice > entryPrice) {
        rMultiple = targetDistance / stopDistance;
        profitPerShare = targetDistance;
        totalProfit = shares * targetDistance;
        rrRatio = rMultiple;
        roi = (totalProfit / positionSize) * 100;
    }

    // Update results
    document.getElementById('sharesToBuy').textContent = formatNumber(shares);
    document.getElementById('positionSize').textContent = formatCurrency(positionSize);
    document.getElementById('riskAmount').textContent = formatCurrency(riskAmount);
    document.getElementById('accountPercent').textContent = accountPercent.toFixed(2) + '%';
    document.getElementById('target5R').textContent = '$' + target5R.toFixed(2);
    document.getElementById('rMultiple').textContent = rMultiple.toFixed(1) + 'R';
    document.getElementById('profitPerShare').textContent = '$' + profitPerShare.toFixed(2);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('rrRatio').textContent = rrRatio.toFixed(1) + ':1';
    document.getElementById('roi').textContent = roi.toFixed(1) + '%';

    // Update R/R bar
    if (rrRatio > 0) {
        const riskWidth = (1 / (1 + rrRatio)) * 100;
        const rewardWidth = 100 - riskWidth;
        document.querySelector('.rr-bar').style.gridTemplateColumns = `${riskWidth}% ${rewardWidth}%`;
    }

    // Show warnings
    if (targetPrice && rrRatio < 2) {
        document.getElementById('warningText').textContent = 'WARNING: Risk/Reward ratio is below 2:1';
        warningEl.classList.add('show');
    } else if (accountPercent > 25) {
        document.getElementById('warningText').textContent = 'WARNING: Position size exceeds 25% of account';
        warningEl.classList.add('show');
    } else if (riskPercentage > 2) {
        document.getElementById('warningText').textContent = 'WARNING: Risk exceeds 2% - Consider reducing position size';
        warningEl.classList.add('show');
    }

    // Color code account percentage
    const percentEl = document.getElementById('accountPercent');
    if (accountPercent > 25) {
        percentEl.style.color = 'var(--red)';
    } else if (accountPercent > 15) {
        percentEl.style.color = 'var(--orange)';
    } else {
        percentEl.style.color = 'var(--black)';
    }
}

function clearCalculator() {
    document.getElementById('accountSize').value = '';
    document.getElementById('riskPercentage').value = '';
    document.getElementById('entryPrice').value = '';
    document.getElementById('stopLoss').value = '';
    document.getElementById('targetPrice').value = '';
    document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
    calculatePosition();
}

// Initialize
calculatePosition();
