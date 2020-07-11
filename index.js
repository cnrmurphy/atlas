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

const atlas = new Atlas(cbpClient, ftxUs, null);
atlas.SpatialArbitrageService.execute();
