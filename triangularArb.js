// Triangular Arbitrage Strategy
// ETH/USDT -> ETH/USD -> USDT/USD
// Start with USD. Buy USDT. Buy ETH/USDT. Sell ETH/USD. Repeat.
const { FTXUS, currencyPairs } = require('ftx-us');

const ftxApiKey = process.env.FTX_API_KEY;
const ftxApiSecret = process.env.FTX_API_SECRET;

const ftxUs = new FTXUS({ key: ftxApiKey, secret: ftxApiSecret });

const Bid = (price, size) => ({ price, size });
const Ask = (price, size) => ({ price, size });
const takerFee = 0.003;

(async () => {
  try { 
    const ftxWallet = ftxUs.Wallet;
    const ftxBalances = await ftxWallet.getBalances();
    const ethWallet = ftxBalances.find(({ coin }) => coin === 'ETH');
    const usdWallet = ftxBalances.find(({ coin }) => coin === 'USD');
    const usdtWallet = ftxBalances.find(({ coin }) => coin === 'USDT');
    let usd = 4500;
    let eth = 0;
    let usdt = 0;
    const wallet = { usd, usdt, eth };
    const markets = {
      ...currencyPairs,
      USDT: { USD: 'USDT/USD' }
    };

    while(true) {
      const [ethUsdOb, ethUsdtOb, usdtOb] = await Promise.all([ftxUs.Markets.getOrderBook(markets.ETH.USD), ftxUs.Markets.getOrderBook(markets.ETH.USDT), ftxUs.Markets.getOrderBook(markets.USDT.USD)]);
      let [bestUsdtPrice, size] = getBestBid(usdtOb);

      buyUsdt(wallet, bestUsdtPrice, size);

      let [bestEthUsdtPrice, ethUsdtSize] = getBestAsk(ethUsdtOb);
      let [bestEthUsdPrice, ethUsdSize] = getBestBid(ethUsdOb);
      let bestSize = Math.min(ethUsdtSize, ethUsdSize);

      if (bestEthUsdPrice > bestEthUsdtPrice) {
        let spread = Math.abs(bestEthUsdtPrice - bestEthUsdPrice);
        console.log(`Bid: ${bestEthUsdPrice} | Ask: ${bestEthUsdtPrice} | Spread: ${spread}}`);

        buyEthUsdt(wallet, bestEthUsdtPrice, bestSize)
        //console.log(`Buying ETH/USDT: ${wallet.eth} ETH`);
        sellEthUsd(wallet, bestEthUsdPrice, bestSize);
        console.log(`Profit: ${wallet.usd}`);
        console.log(wallet);
      }
      await sleep(2000);
    }
  } catch(e) {
    console.log(e);
  }
})();

function buyUsdt(wallet, price, size) {
  console.log(`USDT: ${price} ${size}`)
  if (wallet.usd <= size && wallet.usd > 0) {
    let cost = wallet.usd * price;
    wallet.usd = wallet.usd - cost;
    wallet.usdt += cost - (cost * takerFee);
    console.log(`Purchased ${wallet.usdt} USDT for ${cost} USD`);
  }
}

function buyEthUsdt(wallet, price, size) {
  let amountCanBuy = wallet.usdt / price;
  let totalCost = price * size;
  if (wallet.usdt === 0) {
    console.log('YOU AINT GOT NO USDT');
  } else if (amountCanBuy >= size) {
    totalCost = totalCost - (totalCost * takerFee);
    wallet.usdt = wallet.usdt - totalCost;
    wallet.eth += totalCost / price;
    console.log(`Buying ${wallet.eth} ETH for ${totalCost} USDT`);
  } else {
    totalCost = wallet.usdt - (wallet.usdt * takerFee);
    wallet.usdt -= wallet.usdt;
    wallet.eth += totalCost / price;
    console.log(`Buying ${wallet.eth} ETH for ${totalCost} USDT`);
  }
}

function sellEthUsd(wallet, price, size) {
  if (wallet.eth >= size) {
    let profit = size * price;
    profit = profit - (profit * takerFee);
    wallet.eth = wallet.eth - size;
    wallet.usd = wallet.usd + profit;
    return;
  } else {
    let profit = wallet.eth * price;
    profit = profit - (profit * takerFee);
    wallet.eth = 0;
    wallet.usd = wallet.usd + profit;
  }
}

function getBestAsk(orderbook) {
  return orderbook.asks[0];
}

function getBestBid(orderbook) {
  return orderbook.bids[0];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
