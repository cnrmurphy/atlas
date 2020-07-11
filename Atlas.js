// Import services
const SpatialArbitrageService = require('./SpatialArbitrageService');
const TransferService = require('./TransferService');

class Atlas {
  constructor(coinbaseClient, ftxClient, db) {
    this._coinbaseClient = coinbaseClient;
    this._ftxClient = ftxClient;
    this._transferService = new TransferService(coinbaseClient, ftxClient);
    this._spatialArbitrageService  = new SpatialArbitrageService(coinbaseClient, ftxClient, this._transferService, db);
  }

  get SpatialArbitrageService() {
    return this._spatialArbitrageService;
  }
}

module.exports = Atlas;
