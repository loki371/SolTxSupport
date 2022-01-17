const web3 = require("@solana/web3.js");
const fs = require('fs');


exports.getAccount = (async (ith, path) => {

  return fs.readFile((ith, path), (err, rawdata) => {

    console.log("\n---  LoadAccount " + ith + " from " + path + " --- ");

    if (err != null) {
      console.log("error " + ith + " in readfile: " + err);
      return (err, null);
    }
    let arr = JSON.parse(rawdata);
    let secretKey = Uint8Array.from(arr);
    let account = web3.Keypair.fromSecretKey(secretKey);
    console.log("Account " + ith + " public key = " + account.publicKey);
    return (err, account);
  });
});


exports.getAccountSyncFromPrivateKey = (arr) => {
  // console.log("\n---  LoadAccountSync from Byte Array --- ");
  let secretKey = Uint8Array.from(arr);
  let account = web3.Keypair.fromSecretKey(secretKey);
  console.log("account public key = " + account.publicKey);
  return account;
}


exports.getAccountSyncFromKeypair = (path) => {
  console.log("\n---  LoadAccountSync from " + path + " --- ");

  let rawData = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
  let privateKey = JSON.parse(rawData);

  let account = this.getAccountSyncFromPrivateKey(privateKey);
  return account;
};
