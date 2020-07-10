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

(async () => {
  try {
    const ftxWallet = ftxUs.Wallet;
    const [ftxBalances, cbpBalances] = await Promise.all([await ftxWallet.getBalances(), await cbpClient.getAccounts()]);
    const ftxEthWallet = ftxBalances.find(({ coin }) => coin === 'ETH');
    const ftxUsdWallet = ftxBalances.find(({ coin }) => coin === 'USD');
    const cbpEthWallet = cbpBalances.find(({ currency }) => currency === 'ETH');
    const cbpUsdWallet = cbpBalances.find(({ currency }) => currency === 'USD');
    console.log('FTX Balance', { usd: ftxUsdWallet, eth: ftxEthWallet }, '\n', 'CBP Balance', { usd: cbpUsdWallet, eth: cbpEthWallet });

    let cbpUsdBalance = Number(cbpUsdWallet.balance);
    let ftxUsdBalance = ftxUsdWallet.free;
    let balances = [cbpUsdBalance, ftxUsdBalance];
    let addresses = []
    let [transferAmount, idx] = getAmountToTransfer(balances);
    console.log(transferAmount, idx);

    const despositInfo = await cbpClient.depositCrypto({ currency: 'USDC' });
    if (despositInfo.hasOwnProperty('address')) {
      const { address } = despositInfo;
    }
  } catch (e) {
    console.log(e);
  }
})();

/*
  1. Get the average of the total amount of available cash
  2. Get the largest wallet value
  3. Subtract the average total amount from the largest wallet value
  4. Send that amount to the smaller wallet
  5. f(xa, xb) = xa - ((xa + xb) / 2) | xa > xb
*/
function getAmountToTransfer(balances) {
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