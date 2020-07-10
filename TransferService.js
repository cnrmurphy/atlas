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

  async sendToFtx(coin, amount) {

  }

  async sendToCoinbase(coin, amount) {
    const address = await this.getCoinBaseAddress(coin);
    if (!address) {
      throw new Error(`Could not retrieve a wallet address for ${coin} on Coinbase!`);
    }
    console.log(`Sending ${amount} ${coin} to Coinbase using address, ${address}`);
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
