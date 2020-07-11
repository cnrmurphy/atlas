const AWAITING_PROFIT_TRANSFER = 'awaitingProfitTransfer';
const IN_TRADE = 'inTrade';
const CURRENT_TRADE_ID = 'currentTradeId';

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

  async execute() {
    // Get balances from each exchange
    const [ftxBalances, cbpBalances] = await Promise.all([await this._ftxClient.Wallet.getBalances(), await this._coinbaseClient.getAccounts()]);

    // Get each coin wallet from API responses
    const cbpWallet = {};
    const ftxWallet = {};
    ftxWallet.eth = ftxBalances.find(({ coin }) => coin === 'ETH');
    ftxWallet.usd = ftxBalances.find(({ coin }) => coin === 'USD');
    cbpWallet.eth = cbpBalances.find(({ currency }) => currency === 'ETH');
    cbpWallet.usd = cbpBalances.find(({ currency }) => currency === 'USD');
    cbpWallet.usdc = cbpBalances.find(({ currency }) => currency === 'USDC');
    console.log(cbpWallet.usdc);

    // We always want to trade with USD on Coinbase so convert USDC to USD
    if (Number(cbpWallet.usdc.balance) > 0) {
      const conversionResponse = await this._transferService.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount: Number(cbpWallet.usdc.balance) });
      console.log(conversionResponse);
    }

    // We want all of our ETH on FTX so if we have extra on Coinbase we need to transfer it
    if (Number(cbpWallet.eth.balance) > 0) {
      const transferResponse = await this._transferService.sendToFtx('ETH', Number.parseFloat(cbpWallet.eth.balance).toFixed(8));
      console.log(transferResponse);
    }

    if (ftxWallet.usd.free > 0) {
      //const response = await this._transferService.sendToCoinbase('USDC', 1);
      //console.log(response);
    }

    // If we have free usd on both accounts then we need to balance in order to remain delta neutral
    if (ftxWallet.usd.free > 0 && Number(cbpWallet.usd.balance > 0)) {
      let cbpUsdBalance = Number(cbpWallet.usd.balance);
      let ftxUsdBalance = ftxWallet.usd.free;
      let balances = [cbpUsdBalance, ftxUsdBalance];
      let [transferAmount, _] = this.getAmountToTransfer(balances);
      
      if (ftxUsdBalance > cbpUsdBalance) {
        console.log(`Attempting to balance account by sending ${transferAmount} to Coinbase from FTX`);
        //const resp = await this._transferService.sendToCoinbase('USDC', transferAmount);
        //console.log(resp);
      } else if (cbpUsdBalance > ftxUsdBalance) {
        console.log(`Attemping to balance account by sending ${transferAmount} to FTX from Coinbase`);
        const conversionResponse = await this._transferService.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount: transferAmount });
        console.log(conversionResponse);
        const resp = await this._transferService.sendToFtx('USDC', transferAmount);
        console.log(resp);
      } else {
        throw new Error('Couldn\'t find correct wallet to transfer balances from');
      }

      this._setState()
    }

    //await ts.sendToCoinbase('ETH', .01);
    //const conversionResponse = await ts.convertCoinbaseCoin({ from: 'USDC', to: 'USD', amount: 3 });
    //const ethBalance = Number(cbpEthWallet.balance);
    //console.log(ethBalance/2);
    //const transferResponse = await ts.sendToFtx('ETH', Number.parseFloat(ethBalance/2).toFixed(8));
    //console.log(transferResponse);
    //console.log(conversionResponse);
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
    this._state[propname] = val;
  }
  
}

module.exports = SpatialArbitrageService;
