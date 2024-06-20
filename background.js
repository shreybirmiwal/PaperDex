chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ balance: 1000, trades: [] });
});
