const CoinbasePro = require('coinbase-pro');
const Redis = require("ioredis");
const redis = new Redis(); // uses defaults unless given configuration object

// Configure API Clients
const cbpClient = new CoinbasePro.AuthenticatedClient(
  process.env.COINBASE_PRO_API_KEY,
  process.env.COINBASE_PRO_API_SECRET,
  process.env.COINBASE_PRO_API_PASSPHRASE,
  'https://api.pro.coinbase.com'
);
console.log({
    key: process.env.COINBASE_PRO_API_KEY,
    secret: process.env.COINBASE_PRO_API_SECRET,
    passphrase: process.env.COINBASE_PRO_API_PASSPHRASE,
  })
const websocket = new CoinbasePro.WebsocketClient(
  ['ETH-USD'],
  'wss://ws-feed.pro.coinbase.com',
  {
    key: process.env.COINBASE_PRO_API_KEY,
    secret: process.env.COINBASE_PRO_API_SECRET,
    passphrase: process.env.COINBASE_PRO_API_PASSPHRASE,
  },
  { channels: ['full', 'level1'] }
);

websocket.on('message', data => {
  //console.log(data);
  redis.xadd('exchange:coinbase', '*',
    'type', data.type,
    'side', data.side,
    'product_id', data.product_id,
    'sequence', data.sequence,
    'price', data.price,
    'order_id', data.order_id,
    'remaining_size', data.remaining_size
  ).then(function(id) {
    console.log("id:", id);
  });
});
websocket.on('error', err => {
  console.log(err);
});
websocket.on('close', () => {
  /* ... */
});