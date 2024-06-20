document.addEventListener('DOMContentLoaded', function () {
    const balanceElement = document.getElementById('balance');
    const pnlElement = document.getElementById('pnl');
    const slider = document.getElementById('amount-slider');
    const buyButton = document.getElementById('buy-button');
    const sellButton = document.getElementById('sell-button');
    const tradesList = document.getElementById('trades-list');

    const INITIAL_BALANCE = 1000;

    // Initialize from storage
    chrome.storage.sync.get(['balance', 'trades'], (result) => {
        const balance = result.balance || INITIAL_BALANCE;
        const trades = result.trades || [];
        updateUI(balance, trades);
    });

    function updateUI(balance, trades) {
        balanceElement.textContent = balance.toFixed(2);
        pnlElement.textContent = calculatePnl(balance);
        slider.max = balance;
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
            li.textContent = `${trade.type.toUpperCase()} $${trade.amount} of ${trade.tokenSymbol} at $${trade.price}`;
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close';
            closeButton.addEventListener('click', () => closeTrade(index, trade));
            li.appendChild(closeButton);
            tradesList.appendChild(li);
        });
    }

    function closeTrade(index, trade) {
        chrome.storage.sync.get(['balance', 'trades'], (result) => {
            const trades = result.trades || [];
            const url = new URL(trade.pairUrl);
            const pairAddress = url.pathname.split('/').pop();
            const apiUrl = `https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`;

            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.pair) {
                        const price = parseFloat(data.pair.priceUsd.replace(/,/g, ''));
                        const tradeValue = trade.amount; // Amount in dollars
                        const newBalance = trade.type === 'buy'
                            ? result.balance + (tradeValue / trade.price * price)
                            : result.balance - (tradeValue / trade.price * price);
                        trades.splice(index, 1);
                        chrome.storage.sync.set({ balance: newBalance, trades }, () => {
                            updateUI(newBalance, trades);
                        });
                    } else {
                        alert('Failed to retrieve token price.');
                    }
                });
        });
    }

    buyButton.addEventListener('click', () => handleTrade('buy'));
    sellButton.addEventListener('click', () => handleTrade('sell'));

    function handleTrade(type) {
        const amount = parseFloat(slider.value);
        if (amount <= 0) {
            alert('Trade amount must be greater than 0');
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = new URL(tabs[0].url);
            const pairAddress = url.pathname.split('/').pop();
            const apiUrl = `https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`;

            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.pair) {
                        const price = parseFloat(data.pair.priceUsd.replace(/,/g, ''));
                        const tokenSymbol = data.pair.baseToken.symbol;
                        const pairUrl = data.pair.url;
                        chrome.storage.sync.get(['balance', 'trades'], (result) => {
                            const newBalance = type === 'buy' ? result.balance - amount : result.balance + amount;
                            const newTrade = { type, amount, price, tokenSymbol, pairUrl };
                            const trades = result.trades || [];
                            trades.push(newTrade);
                            chrome.storage.sync.set({ balance: newBalance, trades }, () => {
                                updateUI(newBalance, trades);
                            });
                        });
                    } else {
                        alert('Failed to retrieve token price.');
                    }
                });
        });
    }
});
