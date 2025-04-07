// Utility Functions
const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
};

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Core Calculations
const calculateResults = () => {
    const accountSize = parseFloat(document.getElementById('account-size').value) || 0;
    const riskPercentage = parseFloat(document.getElementById('custom-risk').value) / 100 || 0;
    const entryPrice = parseFloat(document.getElementById('entry-price').value) || 0;
    const stopLoss = parseFloat(document.getElementById('stop-loss').value) || 0;
    const targetPrice = parseFloat(document.getElementById('target-price').value) || 0;

    // Validation
    if (accountSize <= 0 || riskPercentage <= 0 || entryPrice <= 0 || stopLoss <= 0 || stopLoss >= entryPrice) {
        resetResults();
        return;
    }

    // Calculations
    const positionSize = accountSize * riskPercentage;
    const shares = Math.floor(positionSize / (entryPrice - stopLoss));
    const percentAccount = (positionSize / accountSize) * 100;
    const totalRisk = accountSize * riskPercentage;
    const riskPerShare = entryPrice - stopLoss;
    const rMultiple = targetPrice ? (targetPrice - entryPrice) / riskPerShare : '-';
    const fiveRTarget = entryPrice + (5 * riskPerShare);

    // Update Results
    document.getElementById('shares').textContent = shares.toLocaleString('en-US');
    document.getElementById('position-size').textContent = formatCurrency(positionSize);
    document.getElementById('percent-account').textContent = formatPercentage(percentAccount);
    document.getElementById('risk-amount').textContent = formatCurrency(totalRisk);
    document.getElementById('r-multiple').textContent = rMultiple === '-' ? '-' : rMultiple.toFixed(2);
    document.getElementById('five-r-target').textContent = formatCurrency(fiveRTarget);
};

// Reset Results
const resetResults = () => {
    document.getElementById('shares').textContent = '-';
    document.getElementById('position-size').textContent = '-';
    document.getElementById('percent-account').textContent = '-';
    document.getElementById('risk-amount').textContent = '-';
    document.getElementById('r-multiple').textContent = '-';
    document.getElementById('five-r-target').textContent = '-';
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const inputs = document.querySelectorAll('input[type="number"]');
    const debouncedCalculate = debounce(calculateResults, 300);

    inputs.forEach(input => {
        input.addEventListener('input', debouncedCalculate);
    });

    // Percentage Buttons
    const percentageButtons = document.querySelectorAll('.percentage-buttons button');
    const customRiskInput = document.getElementById('custom-risk');

    percentageButtons.forEach(button => {
        button.addEventListener('click', () => {
            percentageButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            customRiskInput.value = button.dataset.value;
            calculateResults();
        });
    });

    customRiskInput.addEventListener('input', () => {
        percentageButtons.forEach(btn => btn.classList.remove('active'));
        const closestButton = Array.from(percentageButtons).find(btn =>
            parseFloat(btn.dataset.value) === parseFloat(customRiskInput.value)
        );
        if (closestButton) closestButton.classList.add('active');
        debouncedCalculate();
    });

    // Clear Button
    document.querySelector('.clear-button').addEventListener('click', () => {
        inputs.forEach(input => input.value = '');
        percentageButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.percentage-buttons button[data-value="1"]').classList.add('active');
        customRiskInput.value = '1';
        resetResults();
    });

    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSwitch.checked = savedTheme === 'dark';

    themeSwitch.addEventListener('change', () => {
        const newTheme = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Info Section Toggle
    const toggleInfo = document.querySelector('.toggle-info');
    const infoContent = document.querySelector('.info-content');

    toggleInfo.addEventListener('click', () => {
        const isHidden = infoContent.hasAttribute('hidden');
        if (isHidden) {
            infoContent.removeAttribute('hidden');
            toggleInfo.textContent = 'Hide Calculation Details';
        } else {
            infoContent.setAttribute('hidden', '');
            toggleInfo.textContent = 'How is position size calculated?';
        }
    });

    // Initial Calculation
    calculateResults();
});
