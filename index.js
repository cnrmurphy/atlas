const { FTXUS, currencyPairs } = require('ftx-us');
const CoinbasePro = require('coinbase-pro');
const cbpClient = new CoinbasePro.AuthenticatedClient(
  process.env.COINBASE_PRO_API_KEY,
  process.env.COINBASE_PRO_API_SECRET,
  process.env.COINBASE_PRO_API_PASSPHRASE,
  'https://api.pro.coinbase.com'
);

const ftxApiKey = process.env.FTX_API_KEY;
const ftxApiSecret = process.env.FTX_API_SECRET;

const ftxUs = new FTXUS({ key: ftxApiKey, secret: ftxApiSecret });

const Bid = (price, size) => ({ price, size });
const Ask = (price, size) => ({ price, size });

(async () => {
  try { 
    const ftxWallet = ftxUs.Wallet;
    const [ftxBalances, cbpBalances] = await Promise.all([await ftxWallet.getBalances(), await cbpClient.getAccounts()]);
    const ftxEthWallet = ftxBalances.find(({ coin }) => coin === 'ETH');
    const ftxUsdWallet = ftxBalances.find(({ coin }) => coin === 'USD');
    const cbpEthWallet = cbpBalances.find(({ currency }) => currency === 'ETH');
    const cbpUsdWallet = cbpBalances.find(({ currency }) => currency === 'USD');
    console.log('FTX Balance', { usd: ftxUsdWallet, eth: ftxEthWallet }, '\n', 'CBP Balance', { usd: cbpUsdWallet, eth: cbpEthWallet }); 
    while(true) {
      const [ftxOrderBook, cbpOrderBook] = await Promise.all([ftxUs.Markets.getOrderBook(currencyPairs.ETH.USD), cbpClient.getProductOrderBook('ETH-USD')]);
      const bestFtxBid = ftxOrderBook.bids[0];
      const bestCbpAsk = cbpOrderBook.asks[0];
      const ftxBid = Bid(bestFtxBid[0], bestFtxBid[1]);
      const cbpAsk = Ask(bestCbpAsk[0], bestCbpAsk[1]);
  
      if (ftxBid.price > cbpAsk.price) {
        const tradeSize = Math.min(ftxBid.size, cbpAsk.size);
        const ftxPrice = (ftxBid.price * tradeSize) - ((ftxBid.price * tradeSize) * .003);
        const cbpPrice = (cbpAsk.price * tradeSize) - ((cbpAsk.price * tradeSize) * .005);
        console.log(`Bid: ${ftxBid.price} | Ask: ${cbpAsk.price} | spread: ${Math.abs(cbpAsk.price - ftxBid.price)} | ftxPrice: ${ftxPrice} | cbpPrice: ${cbpPrice} | profit: ${ftxPrice - cbpPrice} | profit before fees: ${(ftxBid.price * tradeSize) - (cbpAsk.price * tradeSize)}`);
        if (Number(cbpUsdWallet.balance) >= cbpAsk.price && ftxEthWallet.total > 0) {
          if (ftxEthWallet.total <= tradeSize) {
            console.log(tradeSize);
            //console.log(`Selling ${ftxEthWallet.total} ETH for ${ftxBid.price}`);
            const ethSize = getEthSizeToBuy(tradeSize, cbpAsk.price, cbpUsdWallet.total);
            console.log(`Buying ${ethSize} ETH for ${cbpAsk.price}`);
            const cbpResponse = await placeCoinbaseOrder(cbpAsk.price, ethSize, cbpClient);
            //const ftxResponse = await placeFtxOrder(ftxBid.price, ftxEthWallet.total, ftxUs);
            console.log(cbpResponse);
          } else {
            console.log(tradeSize)
          }
        } else {
          console.log(cbpUsdWallet.balance >= cbpAsk.price);
          console.log('Can\'t make trade, incorrect balance', { cpbWallet: cbpUsdWallet, ftxWallet: ftxEthWallet });
        }
      }
      break;
      //await sleep(5000);
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

function placeCoinbaseOrder(price, size, cli) {
  return cli.placeOrder({ side: 'buy', price, size, product_id: 'ETH-USD' });
}

function placeFtxOrder(price, size, ftx) {
  return ftx.Orders.placeOrder(currencyPairs.ETH.USD, 'sell', price, 'market', size);
}

function getEthSizeToBuy(size, price, buyingPower) {
  const absoluteCost = size * price;
  // If there is more eth available than we can buy,
  // we will calculate the largest position we can acquire.
  // Otherwise we will clear the whole level.
  console.log('Absolute Cost: ', absoluteCost, 'Cash ', buyingPower);
  if (absoluteCost > buyingPower) {
    console.log('Dividing', buyingPower/price)
    return buyingPower/price;
  }
  return size;
}