const { currencyPairs }= require('ftx-us');

const AWAITING_PROFIT_TRANSFER = 'awaitingProfitTransfer';
const IN_TRADE = 'inTrade';
const CURRENT_TRADE_ID = 'currentTradeId';
const FTX_TAKER_FEE = .003;
const CBP_TAKER_FEE = .0025;

const Bid = (price, size, exchange) => ({ price, size, exchange });
const Ask = (price, size, exchange) => ({ price, size, exchange });

class SpatialArbitrageService {
  constructor(coinbaseClient, ftxClient, transferService, prisma) {
    this._coinbaseClient = coinbaseClient;
    this._ftxClient = ftxClient;
    this._prisma = prisma;
    this._transferService = transferService;
    this._state = {
      [IN_TRADE]: false,
      [CURRENT_TRADE_ID]: null,
      [AWAITING_PROFIT_TRANSFER]: false
    }
    this._lastTrade = null;
  }

  async _getBalances() {
    const [ftxBalances, cbpBalances] = await Promise.all([await this._ftxClient.Wallet.getBalances(), await this._coinbaseClient.getAccounts()]);
    // Get each coin wallet from API responses
    const cbpWallet = {};
    const ftxWallet = {};
    ftxWallet.eth = ftxBalances.find(({ coin }) => coin === 'ETH');
    ftxWallet.usd = ftxBalances.find(({ coin }) => coin === 'USD');
    cbpWallet.eth = cbpBalances.find(({ currency }) => currency === 'ETH');
    cbpWallet.usd = cbpBalances.find(({ currency }) => currency === 'USD');
    cbpWallet.usdc = cbpBalances.find(({ currency }) => currency === 'USDC');

    return { cbpWallet, ftxWallet };

  }
  async execute() {
    while(true) {
      // Get balances from each exchange
      const { cbpWallet, ftxWallet } = await this._getBalances();
      console.log(cbpWallet.usd);
      console.log(ftxWallet.usd)
      console.log('Beginning trade sequence');
      // We always want to trade with USD on Coinbase so convert USDC to USD
      if (Number.parseFloat(cbpWallet.usdc.balance).toFixed(2) > 0) {
        //const amount = Number.parseFloat(cbpWallet.usdc.balance).toFixed(2);
        //const conversionResponse = await this._transferService.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount });
        //console.log(conversionResponse);
      }

      let bestBid;
      let bestAsk;
      let bestSize;
      let spread;

      while(!this._state[IN_TRADE]) {
        [bestBid, bestAsk, bestSize, spread] = await this._findTrade();

        if (!this._state[IN_TRADE]) {
          await sleep(2000);
        }
      }

      let cbpUsdBalance = Number(cbpWallet.usd.balance);
      let ftxUsdBalance = ftxWallet.usd.free;
      let cost = bestAsk * bestSize;
      let tradeProfit = spread * bestSize;
      tradeProfit -= (tradeProfit * (CBP_TAKER_FEE + FTX_TAKER_FEE));
      console.log('bestAsk')
      console.log(bestAsk)

      if(!bestAsk) {
        console.log('best ask is undefined');
        console.log(this._state);
        this._setState(IN_TRADE, false);
      }

      // Determine what exchange to place orders on
      // If the coinbase bid is larger than the FTX ask we
      // should buy ETH on FTX and sell ETH on coinbase
      if (bestAsk && bestAsk.exchange === 'FTX') {
        // If we can afford to buy the whole orderbook level, we will. Otherwise we buy a fraction of the available asset.
        let amountToTradeFTX = cost > ftxUsdBalance ? ftxUsdBalance / cost : bestSize;
        let amountToTradeCbp = Math.min(Number.parseFloat(cbpWallet.eth.balance), bestSize);
        let amountToTrade = Math.min(amountToTradeFTX, amountToTradeCbp);

        console.log(`Buying ${amountToTrade} ETH for ${bestAsk.price} on ${bestAsk.exchange}`);
        console.log(`Selling ${amountToTrade} ETH for ${bestBid.price} on ${bestBid.exchange}`);
        try {
          const [cbpResponse, ftxResponse] = await Promise.all([
            this._coinbaseClient.placeOrder({ side: 'sell', price: bestBid.price, size: amountToTrade, product_id: 'ETH-USD' }),
            this._ftxClient.Orders.placeOrder(currencyPairs.ETH.USD, 'buy', bestAsk.price, 'market', amountToTrade)
          ]);

          if (!cbpResponse.hasOwnProperty('filled_size') && !ftxResponse.hasOwnProperty('filledSize')) {
            console.log(cbpResponse, ftxResponse);
            throw new Error('Trade failed');
          }

          // Get most recent balances after trade
          const { ftxWallet, cbpWallet } = await this._getBalances();

          // 1. Send ETH from FTX to Coinbase
          // 2. On Coinbase, convert USD to USDC
          // 3. Send USDC from Coinbase to FTX
          console.log('Wallets after Transfer');
          console.log('Coinbase')
          console.log(cbpWallet);
          console.log('FTX');
          console.log(ftxWallet);
          const ethToCoinbaseResp = await this._transferService.sendToCoinbase('ETH', ftxWallet.eth.free);
          console.log(ethToCoinbaseResp);
          let convertAmount = cbpWallet.usd.balance;
          let idx = convertAmount.indexOf('.');
          convertAmount = convertAmount.substring(0,idx+3);
          console.log('want to convert ' + convertAmount);
          const conversionResponse = await this._transferService.convertCoinbaseCoin({ from: 'USD', to: 'USDC', amount: convertAmount });
          console.log(conversionResponse);
          if (conversionResponse.success) {
            const transferAmount = Number.parseFloat(conversionResponse.response.amount).toFixed(2);
            const transferResponse = await this._transferService.sendToFtx('USDC', transferAmount);

            console.log(transferResponse);
            console.log(cbpResponse, ftxResponse);

            this._recordTrade(tradeProfit);
            this._setState(AWAITING_PROFIT_TRANSFER, true);

            const { cbpWallet } = await this._getBalances();
            const balanceAfterTrade = Number.parseFloat(cbpWallet.eth.balance);
            const expectedBalance = Number.parseFloat(balanceAfterTrade + ftxWallet.eth.free).toFixed(8);

            while(this._state[AWAITING_PROFIT_TRANSFER]) {
              const { cbpWallet } = await this._getBalances();
              const currentBalance = Number.parseFloat(cbpWallet.eth.balance);
              console.log(`${+new Date()} awaiting transfer.`);
              console.log(`Current balance: ${currentBalance} | Eth Sent: ${ftxWallet.eth.free} | Expecting: ${expectedBalance}`);
              console.log('Account balance up-to-date: ', Number(expectedBalance) === Number(currentBalance));
              if (Number(expectedBalance) === Number(currentBalance)) {
                console.log(`${+new Date()} transfer complete`);
                this._setState(AWAITING_PROFIT_TRANSFER, false);
              } else {
                await sleep(3000);
              }
            }
          } else {
            console.log('Conversion failed');
          }
          this._setState(IN_TRADE, false);
        } catch(e) {
          console.log(e);
        }
      }

      // If the bid on FTX is larger than the ask on coinbase
      // we should buy ETH on coinbase and sell ETH on FTX
      if (bestBid && bestBid.exchange === 'Coinbase') {
        console.log('ignore trade')
        // const [cbpResponse, ftxResponse] = await Promise.all([
        //   this._coinbaseClient.placeOrder({ side: 'buy', price: bestAsk.price, size: amountToTrade, product_id: 'ETH-USD' }),
        //   this._ftxClient.Orders.placeOrder(currencyPairs.ETH.USD, 'sell', bestBid.price, 'market', size)
        // ]);

        // if (!cbpResponse.hasOwnProperty('filled_size') && !ftxResponse.hasOwnProperty('filledSize')) {
        //   console.log(cbpResponse, ftxResponse);
        //   throw new Error('Trade failed');
        // }
        
        // console.log(cbpResponse, ftxResponse);
      }

      //this._recordTrade(spread);

      console.log('BEST BID', bestBid, bestAsk);
    }
  }

  async _findTrade() {
    const [ftxOrderBook, cbpOrderBook] = await Promise.all([this._ftxClient.Markets.getOrderBook(currencyPairs.ETH.USD), this._coinbaseClient.getProductOrderBook('ETH-USD')]);
    const bestFtxBid = ftxOrderBook.bids[0];
    const bestFtxAsk = ftxOrderBook.asks[0];
    const bestCbpBid = cbpOrderBook.bids[0];
    const bestCbpAsk = cbpOrderBook.asks[0];
    const ftxBid = Bid(bestFtxBid[0], bestFtxBid[1], 'FTX');
    const ftxAsk = Ask(bestFtxAsk[0], bestFtxAsk[1], 'FTX');
    const cbpAsk = Ask(bestCbpAsk[0], bestCbpAsk[1], 'Coinbase');
    const cbpBid = Bid(bestCbpBid[0], bestCbpBid[1], 'Coinbase');
    console.log(`${+new Date()} Looking for trade`);

    if (ftxAsk.price < cbpBid.price) {
      const tradeSize = Math.min(ftxAsk.size, cbpBid.size);
      const spread = Math.abs(ftxAsk.price - cbpBid.price);
      const ftxPrice = (ftxAsk.price * tradeSize)  * FTX_TAKER_FEE;
      const cbpPrice = (cbpBid.price * tradeSize)  * CBP_TAKER_FEE;
      const cost = ftxPrice + cbpPrice;
      const profit = spread * tradeSize;
      console.log(`Buy FTX, sell Coinbase - Coinbase: price: ${cbpBid.price * tradeSize} cost: ${cbpPrice} | FTX Price: price: ${ftxAsk.price * tradeSize} - cost ${ftxPrice} | Spread: ${spread} | size: ${tradeSize} | Profit: ${profit} | Cost: ${cost} | Return: ${profit - cost}`);
      if (spread >= .05 && profit > cost) {
        console.log('Trade: Buy FTX, sell Coinbase');
        console.log(`${+new Date()} Trade Found`);
        console.log(`Bid: ${cbpBid.price} | Ask: ${ftxAsk.price} | spread: ${spread} | size: ${tradeSize} | profit: ${profit}`);
        this._setState(IN_TRADE, true);
        return [cbpBid, ftxAsk, tradeSize, spread];
      }
      return [0,0,0,0];
    } else if (ftxBid.price > cbpAsk.price) {
      console.log('Trade: Buy Coinbase, sell FTX');
      const spread = Math.abs(ftxBid.price - cbpAsk.price);
      if (spread >= .05) {
        const tradeSize = Math.min(ftxBid.size, cbpAsk.size);
        const ftxPrice = (ftxBid.price * tradeSize) - ((ftxBid.price * tradeSize) * .003);
        const cbpPrice = (cbpAsk.price * tradeSize) - ((cbpAsk.price * tradeSize) * .005);
        console.log(`${+new Date()} Trade Found`);
        console.log(`Bid: ${ftxBid.price} | Ask: ${cbpAsk.price} | spread: ${Math.abs(cbpAsk.price - ftxBid.price)} | size: ${tradeSize} | ftxPrice: ${ftxPrice} | cbpPrice: ${cbpPrice} | profit: ${ftxPrice - cbpPrice} | profit before fees: ${(ftxBid.price * tradeSize) - (cbpAsk.price * tradeSize)}`);
        this._setState(IN_TRADE, true); 
        return [ftxBid, cbpAsk, tradeSize, spread];
      }
      return [0, 0, 0, 0];
    } else {
      return [0, 0, 0, 0];
    }
  }

  /*
    1. Get the average of the total amount of available cash
    2. Get the largest wallet value
    3. Subtract the average total amount from the largest wallet value
    4. Send that amount to the smaller wallet
    5. f(xa, xb) = xa - ((xa + xb) / 2) | xa > xb
  */
  getAmountToTransfer(balances) {
    const [balanceA, balanceB] = balances;
    if (balanceA === balanceB) {
      return [null, null];
    }
    const largestBalance = Math.max(balanceA, balanceB);
    const smallestBalance = Math.min(balanceA, balanceB);
    const idx = balances.indexOf(largestBalance);
    const transferAmount = largestBalance - ((largestBalance + smallestBalance) / 2);

    return [transferAmount, idx];
  }

  _setState(propName, val) {
    this._state[propName] = val;
  }

  async _recordTrade(profit) {
    const r = await this._prisma.trade.create({
      data: {
        profit
      }
    });
    await this._prisma.disconnect()

    console.log(r);
  }

  async _balanceAccounts() {

  }
  
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = SpatialArbitrageService;
