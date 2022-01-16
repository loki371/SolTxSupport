const splToken = require("@solana/spl-token");
const web3 = require("@solana/web3.js");
const network = require("./network");

let connection = network.connection;


exports.createNewMintAddress = (async (creator, amountSupply) => {
  console.log("\n--- create new Mint Token ---");

  //create mint
  let mint = await splToken.Token.createMint(
    connection,
    creator,
    creator.publicKey,
    null,
    0,
    splToken.TOKEN_PROGRAM_ID);

  console.log('mint public address: ' + mint.publicKey.toBase58());

  //get the token accont of this solana address, if it does not exist, create it
  tokenAccount = await mint.getOrCreateAssociatedAccountInfo(
    creator.publicKey
  )

  console.log('token public address: ' + tokenAccount.address.toBase58());

  //minting 100 new tokens to the token address we just created
  await mint.mintTo(tokenAccount.address, creator.publicKey, [], amountSupply);


  console.log("supply " + amountSupply + " to token public address finish");

  return mint.publicKey;
});

exports.USDCPubkey= new web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
exports.randomTokenPubkey = new web3.PublicKey("At5yu4Y77eiCbQDg66xrvRhZfCJi51JnByELxnHH4kNj");


