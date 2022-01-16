const { getAccountSyncFromKeypair, getAccountSyncFromPrivateKey } = require("./utils/account");
const { randomTokenPubkey, USDCPubkey } = require("./utils/mintToken");
const { transferToken, requestAirdrop } = require("./utils/transaction");
const network = require("./utils/network");

let connection = network.connection;

const web3 = require("@solana/web3.js");
const fs = require('fs'); 
const { parse } = require('csv-parse');
const splToken = require("@solana/spl-token");

async function airdrop() {
    let payer = getAccountSyncFromKeypair("./json/keypair1.json");

    console.log("\nmintAddress = " + USDCPubkey);

    let mintToken = new splToken.Token(
        connection,
        USDCPubkey,
        splToken.TOKEN_PROGRAM_ID,
        payer
    );


    // Create associated token accounts for my token if they don't exist yet
    let fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
        payer.publicKey
    );


    let amountTransfer = 10*1000000;

    let accCSVPath = "./input/1k.csv";
    const parser = parse({ 
        delimiter : ',',
        skip_empty_lines: true
    });

    fs.createReadStream(accCSVPath)
        
        .pipe(parser)

        .on('data', function(csvrow) {
            
            let userPubkey = new web3.PublicKey(csvrow[0]);

            transferToken(mintToken, payer, fromTokenAccount, userPubkey, amountTransfer);
        })

        .on('end',function() {
            console.log("\n--finish creating request");
        });
}

airdrop();