const web3 = require("@solana/web3.js");
exports.connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
