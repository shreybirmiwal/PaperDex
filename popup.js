document.addEventListener('DOMContentLoaded', function () {
    const balanceElement = document.getElementById('balance');
    const pnlElement = document.getElementById('pnl');
    const slider = document.getElementById('amount-slider');
    const buyButton = document.getElementById('buy-button');
    const sellButton = document.getElementById('sell-button');
    const tradesList = document.getElementById('trades-list');

    const INITIAL_BALANCE = 1000;

    // Initialize from storage
    chrome.storage.sync.get(['balance', 'freeCash', 'trades'], (result) => {
        const balance = result.balance || INITIAL_BALANCE;
        const trades = result.trades || [];
        updateUI(balance, trades);
    });

    function updateUI(balance, freeCash, trades) {
        balanceElement.textContent = balance.toFixed(2);
        freeCashElement.textContent = freeCash.toFixed(2);
        pnlElement.textContent = calculatePnl(balance);
        slider.max = freeCash;
        updateTradesList(trades);
    }

    function calculatePnl(balance) {
        const pnl = ((balance - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;
        return `${pnl.toFixed(2)}%`;
    }

    function updateTradesList(trades) {
        tradesList.innerHTML = '';
        trades.forEach((trade, index) => {
            const li = document.createElement('li');
            li.textContent = `Trade ${index + 1}: ${trade.type} $${trade.amount} at $${trade.price}`;
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close';
            closeButton.addEventListener('click', () => closeTrade(index));
            li.appendChild(closeButton);
            tradesList.appendChild(li);
        });
    }

    function closeTrade(index) {
        chrome.storage.sync.get(['balance', 'freeCash', 'trades'], (result) => {
            const trades = result.trades || [];
            const trade = trades[index];
            trades.splice(index, 1);
            const newBalance = result.balance + (trade.type === 'buy' ? trade.amount : -trade.amount);
            const newFreeCash = result.freeCash + trade.amount;
            chrome.storage.sync.set({ balance: newBalance, freeCash: newFreeCash, trades }, () => {
                updateUI(newBalance, newFreeCash, trades);
            });
        });
    }

    buyButton.addEventListener('click', () => handleTrade('buy'));
    sellButton.addEventListener('click', () => handleTrade('sell'));

    function handleTrade(type) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = new URL(tabs[0].url);
            const pairAddress = url.pathname.split('/').pop();
            const apiUrl = `https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`;

            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.pairs && data.pairs.length > 0) {
                        const price = parseFloat(data.pairs[0].priceUsd.replace(/,/g, ''));
                        const amount = parseFloat(slider.value);
                        chrome.storage.sync.get(['balance', 'freeCash', 'trades'], (result) => {
                            const newBalance = result.balance + (type === 'buy' ? -amount : amount);
                            const newFreeCash = result.freeCash - amount;
                            const newTrade = { type, amount, price };
                            const trades = result.trades || [];
                            trades.push(newTrade);
                            chrome.storage.sync.set({ balance: newBalance, freeCash: newFreeCash, trades }, () => {
                                updateUI(newBalance, newFreeCash, trades);
                            });
                        });
                    } else {
                        alert('Failed to retrieve token price.');
                    }
                });
        });
    }

    refreshButton.addEventListener('click', () => {
        chrome.storage.sync.get(['balance', 'freeCash', 'trades'], (result) => {
            updateUI(result.balance, result.freeCash, result.trades);
        });
    });
});
