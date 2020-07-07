const { FTXUS } = require('ftx-us');
const CoinbasePro = require('coinbase-pro');
const publicClient = new CoinbasePro.PublicClient();

const apiKey = process.env.FTX_API_KEY;
const apiSecret = process.env.FTX_API_SECRET;

const ftxUs = new FTXUS({ key: apiKey, secret: apiSecret });

(async () => {
  try { 
    const wallet = ftxUs.Wallet;
    let lastchecked = Date.now();
    console.log(lastchecked)
    const balances = await wallet.getBalances();
    console.log(balances);
  } catch(e) {
    console.log(e);
  }
})();
