const splToken = require("@solana/spl-token");
const web3 = require("@solana/web3.js");
const network = require("./network");

let connection = network.connection;


exports.requestAirdrop = (async (account) => {
  console.log("\n---  air drop to account " + account.publicKey + " --- ")
  let airdropSignature = await connection.requestAirdrop(
    account.publicKey,
    web3.LAMPORTS_PER_SOL,
  );

  await connection.confirmTransaction(airdropSignature);
});


let countTransfer = 0;
let countFinish = 0;


let inTransferIdSet = new Set();


exports.transferSolana = (async (payer, receiverPubkey, amount) => {

  console.log("\n---  transferSolana " + amount + " from " + payer.publicKey + " to " + receiverPubkey + " --- ");

  let transaction = new web3.Transaction();

  // Add an instruction to execute
  transaction.add(web3.SystemProgram.transfer({
          fromPubkey: payer.publicKey,
    toPubkey: receiverPubkey,
    lamports: amount,
  }));

  // Send and confirm transaction
  // Note: feePayer is by default the first signer, or payer, if the parameter is not set
  let signature = await web3.sendAndConfirmTransaction(connection, transaction, [payer]);

  console.log("SIGNATURE", signature);
});


exports.transferToken = (async (mintToken, fromWallet, fromTokenAccount, toWalletPubkey, amount) => {

  inTransferIdSet.add(toWalletPubkey);

  console.log("\n count =", ++countTransfer,": transferToken " + amount + " to " + toWalletPubkey + " -");


  let toTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
    toWalletPubkey
  );

  // Add token transfer instructions to transaction
  let transaction = new web3.Transaction()
    .add(
      splToken.Token.createTransferInstruction(
        splToken.TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        [],
        amount
      )
    );

  // Sign transaction, broadcast, and confirm
  web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet]
  
  ).then(() => {

    console.log("\n count =", ++countFinish, ": finish transfer for account", toWalletPubkey.toString());
    inTransferIdSet.delete(toWalletPubkey);

    if (inTransferIdSet.size == 0) 
      console.log("\n ---all transfer command is finish---");

  }).catch((reason) => {

    console.error("\n error in transfer to account", toWalletPubkey,"with reason", reason);
  
  });

});