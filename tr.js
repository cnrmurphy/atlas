const { FTXUS, currencyPairs } = require('ftx-us');
const CoinbasePro = require('coinbase-pro');
const TransferService = require('./TransferService');
const cbpClient = new CoinbasePro.AuthenticatedClient(
  process.env.COINBASE_PRO_API_KEY,
  process.env.COINBASE_PRO_API_SECRET,
  process.env.COINBASE_PRO_API_PASSPHRASE,
  'https://api.pro.coinbase.com'
);

const ftxApiKey = process.env.FTX_API_KEY;
const ftxApiSecret = process.env.FTX_API_SECRET;

const ftxUs = new FTXUS({ key: ftxApiKey, secret: ftxApiSecret });
const ts = new TransferService(cbpClient, ftxUs);

(async () => {
  const [ftxBalances, cbpBalances] = await Promise.all([await ftxUs.Wallet.getBalances(), await cbpClient.getAccounts()]);
  const cbpWallet = {};
  const ftxWallet = {};
  ftxWallet.eth = ftxBalances.find(({ coin }) => coin === 'ETH');
  ftxWallet.usd = ftxBalances.find(({ coin }) => coin === 'USD');
  cbpWallet.eth = cbpBalances.find(({ currency }) => currency === 'ETH');
  cbpWallet.usd = cbpBalances.find(({ currency }) => currency === 'USD');
  cbpWallet.usdc = cbpBalances.find(({ currency }) => currency === 'USDC');
  console.log(cbpWallet.usd);
  // balance accounts
  if (Number(cbpWallet.usdc.balance) > 0) {
    const conversionResponse = await ts.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount: Number(cbpWallet.usdc.balance) });
    console.log(conversionResponse);
  }

  console.log(Number(cbpWallet.eth.balance));
  console.log(Number(cbpWallet.eth.balance) > 0);
  if (Number(cbpWallet.eth.balance) > 0) {
    const transferResponse = await ts.sendToFtx('ETH', Number.parseFloat(cbpWallet.eth.balance).toFixed(8));
    console.log(transferResponse);
  }

  if (ftxWallet.usd.free > 0) {
    //const response = await ts.sendToCoinbase('USDC', 1);
    //console.log(response);
  }

  if (ftxWalled.usd.free > 0 && Number(cbpWallet.usd.balance > 0)) {
    
  }

  //await ts.sendToCoinbase('ETH', .01);
  //const conversionResponse = await ts.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount: 3 });
  //const ethBalance = Number(cbpEthWallet.balance);
  //console.log(ethBalance/2);
  //const transferResponse = await ts.sendToFtx('ETH', Number.parseFloat(ethBalance/2).toFixed(8));
  //console.log(transferResponse);
  //console.log(conversionResponse);
})();
