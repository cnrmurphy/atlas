// Import services
const SpatialArbitrageService = require('./SpatialArbitrageService');
const TransferService = require('./TransferService');

class Atlas {
  constructor(coinbaseClient, ftxClient, prisma) {
    this._coinbaseClient = coinbaseClient;
    this._ftxClient = ftxClient;
    this._transferService = new TransferService(coinbaseClient, ftxClient);
    this._spatialArbitrageService  = new SpatialArbitrageService.TakerService(coinbaseClient, ftxClient, this._transferService, prisma);
  }

  get SpatialArbitrage() {
    return this._spatialArbitrageService;
  }
}

module.exports = Atlas;
