const { PrismaClient } = require("@prisma/client");

// Import API Clients
const { FTXUS, currencyPairs } = require('ftx-us');
const CoinbasePro = require('coinbase-pro');

// Local Imports
const Atlas = require('./Atlas');

// Configure API Clients
const cbpClient = new CoinbasePro.AuthenticatedClient(
  process.env.COINBASE_PRO_API_KEY,
  process.env.COINBASE_PRO_API_SECRET,
  process.env.COINBASE_PRO_API_PASSPHRASE,
  'https://api.pro.coinbase.com'
)
const ftxApiKey = process.env.FTX_API_KEY;
const ftxApiSecret = process.env.FTX_API_SECRET;
const ftxUs = new FTXUS({ key: ftxApiKey, secret: ftxApiSecret });

const prisma = new PrismaClient();

const atlas = new Atlas(cbpClient, ftxUs, prisma);

(async () => {
  const { cbpWallet, ftxWallet } = await atlas.SpatialArbitrage._getBalances();
  let convertAmount = cbpWallet.usd.balance;
  let idx = convertAmount.indexOf('.');
  convertAmount = convertAmount.substring(0,idx+3);
  console.log(cbpWallet.usd)
  console.log(convertAmount);
  const conversionResponse = await atlas.SpatialArbitrage._transferService.convertCoinbaseCoin({ from: 'USD', to: 'USDC', amount: convertAmount });
  console.log(conversionResponse);
  const transferResponse = await atlas.SpatialArbitrage._transferService.sendToFtx('USDC', Number.parseFloat(conversionResponse.response.amount).toFixed(2));
  console.log(transferResponse);
})();
