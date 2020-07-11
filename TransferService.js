class TransferService {
  constructor(coinbaseClient, ftxClient) {
    this._coinbaseClient = coinbaseClient;
    this._ftxClient = ftxClient;
  }

  get coinbaseClient() {
    return this._coinbaseClient;
  }

  get ftxClient() {
    return this._ftxClient;
  }

  async getCoinBaseAddress(coin) {
    const despositInfo = await this._coinbaseClient.depositCrypto({ currency: coin });
    if (!despositInfo.hasOwnProperty('address')) {
      return null;
    }
    return despositInfo.address;
  }

  async getFtxAddress(coin) {
    const resp = await this._ftxClient.Wallet.getDepositAddress(coin);
    return resp;
  }

  async sendToFtx(coin, amount) {
    const { address } = await this.getFtxAddress(coin);
    if (!address) {
      throw new Error(`Could not retrieve a wallet address for ${coin} on FTX!`);
    }
    console.log(address);
    console.log(`Sending ${amount} ${coin} to FTX using address, ${address}`);
    const resp = await this._coinbaseClient.withdrawCrypto({
      amount,
      currency: coin,
      crypto_address: address
    });
    return resp;
  }

  async sendToCoinbase(coin, amount) {
    const address = await this.getCoinBaseAddress(coin);
    if (!address) {
      throw new Error(`Could not retrieve a wallet address for ${coin} on Coinbase!`);
    }
    console.log(`Sending ${amount} ${coin} to Coinbase using address, ${address}`);
    const resp = await this._ftxClient.Wallet.requestWithdrawl(coin, amount, address);
    return resp;
  }

  async convertCoinbaseCoin({ from=null, to=null, amount=0 }) {
    if (!from || !to) {
      throw new Error(`Must provide the currency names you want to transfer: from=${from} | to=${to}`);
    }
    const resp = await this._coinbaseClient.convert({
      from,
      to,
      amount
    });
    return {
      success: true,
      response: resp
    }
  }
}

module.exports = TransferService;
