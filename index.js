const { FTXUS, currencyPairs } = require('ftx-us');
const CoinbasePro = require('coinbase-pro');
const cbpClient = new CoinbasePro.AuthenticatedClient(
  process.env.COINBASE_PRO_API_KEY,
  process.env.COINBASE_PRO_API_SECRET,
  process.env.COINBASE_PRO_API_PASSPHRASE,
  'https://api.pro.coinbase.com'
);

const apiKey = process.env.FTX_API_KEY;
const apiSecret = process.env.FTX_API_SECRET;

const ftxUs = new FTXUS({ key: apiKey, secret: apiSecret });

const Bid = (price, size) => ({ price, size });

(async () => {
  try { 
    const ftxWallet = ftxUs.Wallet;
    const balances = await ftxWallet.getBalances();
    const [ftxOrderBook, cbpOrderBook] = await Promise.all([ftxUs.Markets.getOrderBook(currencyPairs.ETH.USD), cbpClient.getProductOrderBook('ETH-USD')]);
    const bestFtxBid = ftxOrderBook.asks[0];
    const bestCbpBid = cbpOrderBook.bids[0];
    const ftxBid = Bid(bestFtxBid[0], bestFtxBid[1]);
    const cbpBid = Bid(bestCbpBid[0], bestCbpBid[1]);
    console.log(ftxBid, cbpBid);

    if (ftxBid.price > cbpBid.price) {
      const profit = (ftxBid.price - getCbpTradeCost(cbpBid.price)) * Math.min(ftxBid.size, cbpBid.size);
      console.log(profit);
    }
  } catch(e) {
    console.log(e);
  }
})();

function getCbpTradeCost(price) {
  return price - (price * .005);
}