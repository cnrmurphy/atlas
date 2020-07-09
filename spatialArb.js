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
    let initialBuy = true;
    const ftxFee = .003;
    const cbpFee = .005;
    const [ftxBalances, cbpBalances] = await Promise.all([await ftxUs.Wallet.getBalances(), await cbpClient.getAccounts()]);
    const ftxEthWallet = ftxBalances.find(({ coin }) => coin === 'ETH');
    const ftxUsdWallet = ftxBalances.find(({ coin }) => coin === 'USD');
    const cbpEthWallet = cbpBalances.find(({ currency }) => currency === 'ETH');
    const cbpUsdWallet = cbpBalances.find(({ currency }) => currency === 'USD');
    const wallet = {
      cbp: { 
        usd: 2500,
        eth: 0
      },
      ftx: {
        usd: 2500,
        eth: 0
      }
    }

    while(true) {
      const [ftxOrderBook, cbpOrderBook] = await Promise.all([ftxUs.Markets.getOrderBook(currencyPairs.ETH.USD), cbpClient.getProductOrderBook('ETH-USD')]);
      const bestFtxBid = ftxOrderBook.bids[0];
      const bestCbpAsk = cbpOrderBook.asks[0];
      const ftxBid = Bid(bestFtxBid[0], bestFtxBid[1]);
      const cbpAsk = Ask(bestCbpAsk[0], bestCbpAsk[1]);
      const spread = Math.abs(ftxBid.price - cbpAsk.price)

      // Buy ETH to start on FTX
      if (initialBuy) {
        const [price, size] = ftxOrderBook.bids[0]
        const amountToBuy = getEthSizeToBuy(size, price, wallet.ftx.usd);
        console.log(`Buying ${amountToBuy} ETH on FTX at ${price}`);
        wallet.ftx.eth = amountToBuy - (amountToBuy * ftxFee);
        wallet.ftx.usd -= wallet.ftx.eth * price;
        console.log(wallet);
      }

      if (wallet.cbp.usd === 0) {
        console.log('You need to rebalance');
        break;
      }
      
      // The spread must favor our trade to continue
      if (ftxBid.price > cbpAsk.price && spread >= .05) {
        const tradeSize = Math.min(ftxBid.size, cbpAsk.size);
        const ftxPrice = (ftxBid.price * tradeSize) - ((ftxBid.price * tradeSize) * .003);
        const cbpPrice = (cbpAsk.price * tradeSize) - ((cbpAsk.price * tradeSize) * .005);
        console.log(`Bid: ${ftxBid.price} | Ask: ${cbpAsk.price} | spread: ${Math.abs(cbpAsk.price - ftxBid.price)} | ftxPrice: ${ftxPrice} | cbpPrice: ${cbpPrice} | profit: ${ftxPrice - cbpPrice} | profit before fees: ${(ftxBid.price * tradeSize) - (cbpAsk.price * tradeSize)}`);

        // We can only trade if we have enough USD to buy ETH at the given order book level and we have ETH on the opposing exchange
        if (wallet.cbp.usd >= (cbpAsk.price * tradeSize) && wallet.ftx.eth > 0) {
          const ethSize = getEthSizeToBuy(tradeSize, cbpAsk.price, wallet.ftx.eth);
          console.log(`Buying ${ethSize} ETH for ${cbpAsk.price} on Coinbase Pro`);

          cbpBuyEth(price, size, wallet);

          console.log(`Selling ${ethSize} ETH for ${ftxBid.price} on FTX`);

          ftxSellEth(price, size, wallet);

        } else {
          console.log(+Date() + ' Can\'t make trade, incorrect balance');
        }
      }

      await sleep(3000);
    }
  } catch(e) {
    console.log(e);
  }
})();

function cbpBuyEth(price, size, wallet) {
  
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
