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
    //const ftxWallet = ftxUs.Wallet;
    //const balances = await ftxWallet.getBalances();
    while(true) {
      const [ftxOrderBook, cbpOrderBook] = await Promise.all([ftxUs.Markets.getOrderBook(currencyPairs.ETH.USD), cbpClient.getProductOrderBook('ETH-USD')]);
      const bestFtxBid = ftxOrderBook.asks[0];
      const bestCbpBid = cbpOrderBook.bids[0];
      const ftxBid = Bid(bestFtxBid[0], bestFtxBid[1]);
      const cbpBid = Bid(bestCbpBid[0], bestCbpBid[1]);
  
      if (ftxBid.price > cbpBid.price) {
        calculateTrade(cbpBid, .005, ftxBid, .003)
      }
      await sleep(5000);
    }
  } catch(e) {
    console.log(e);
  }
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeDeltaNeutral() {

}

function trade() {

}

function calculateTrade(bidA, bidAFee, bidB, bidBFee) {
  const tradeSize = Math.min(bidA.size, bidB.size);
  const bidAPrice = (bidA.price * tradeSize) - ((bidA.price * tradeSize) * bidAFee);
  const bidBPrice = (bidB.price * tradeSize) - ((bidB.price * tradeSize) * bidBFee);
  const profit = (bidBPrice - bidAPrice);
  console.log('Trade found: ' + profit + ` | BidA: $${bidAPrice} | BidB: $${bidBPrice} | Size: ${tradeSize}`);
}