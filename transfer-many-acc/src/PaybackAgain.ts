import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";


let accCSVPath = "transfer-many-acc/input/PaybackUnMint_again.csv";
let accountInfoCsv = "transfer-many-acc/output_final/AccountInfo.csv";
let transferTokenCsv = "transfer-many-acc/output_final/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output_final/UnMintToken.csv";
let successCsv = "transfer-many-acc/output_final/success.csv";


let amountTransfer: number = 10 * USDC_unit;
let keypairPath = "transfer-many-acc/keypair/receiver";


let receiverAccounts = new Array<Account>();
let zeroSolAccount = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/zeroSol.json");
let receiverAccount = getAccountFromKeyPairPath(21);
for (let i = 0; i < 24; ++i) 
    receiverAccounts.push(receiverAccount);


let stringKeys: Array<string> = new Array();
let paybackList: Array<Account>;


const parser = parse({
    delimiter: ',',
    skip_empty_lines: true
});


fs.createReadStream(accCSVPath)
    .pipe(parser)
    .on('data', function (csvrow) {
        stringKeys.push(csvrow[1]);
    })
    .on('end', async function () {

        let counter = 0;
        let itemPerCount = stringKeys.length / receiverAccounts.length;

        console.log();
        console.log("*itemPerCount = " + itemPerCount);

        for (let receiverAccount of receiverAccounts) {
            console.log();
            console.log("** Process Batch with Counter = " + counter + " / " + stringKeys.length);

            paybackList = new Array<Account>();

            console.log("- receiver = " + receiverAccount.getPublicKey());

            // deny create new AssociateTokenAccount
            let mintToken: splToken.Token = new splToken.Token(
                connection,
                USDC,
                splToken.TOKEN_PROGRAM_ID,
                zeroSolAccount.getKeypair()
            );
            await receiverAccount.setMintToken(mintToken);

            // int all account with mint
            let strKeypairs = stringKeys.slice(counter, counter + itemPerCount);
            await initPaybackListAndSetZeroMint(mintToken, strKeypairs);
            console.log("finish update paybackList, payback.size =  " + paybackList.length + "\n");

            // payback all token
            // await paybackToken(receiverAccount);
            // console.log("\nfinish payback Token, payback.size = " + paybackList.length + "\n");
           
            // set payer for remove account
            mintToken = new splToken.Token(
                connection,
                USDC,
                splToken.TOKEN_PROGRAM_ID,
                receiverAccount.getKeypair()
            );
            await receiverAccount.setMintToken(mintToken);
            await setMintTokenPaybackList(mintToken);

            // unmint all account
            await unMintAllPayback(receiverAccount);
            console.log("\nfinish unMint Token, payback.size = " + paybackList.length + "\n");

            updateSuccessCsv();

            counter += itemPerCount;
        }
    });


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function initPaybackListAndSetZeroMint(mintToken: splToken.Token, strKeypairs: Array<string>) {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = strKeypairs.length;

    let removeAccounts = new Array<Account>();
    for (let strKeypair of strKeypairs) {
        console.log((++counter) + "/" + size);

        let keypair = JSON.parse("[" + strKeypair + "]");
        let payer: Account = new Account(keypair);
        let isValid: boolean = await payer.setMintToken(mintToken);

        if (isValid) {
            paybackList.push(payer);
        } else {
            removeAccounts.push(payer);
            logErrorUpdatePayback(payer);
        }
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logErrorUpdatePayback(account: Account) {
    fs.writeFileSync(
        accountInfoCsv,
        transferAccountToCsvRow(account), {
        flag: "a"
    });
}

async function setMintTokenPaybackList(mintToken: splToken.Token) {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = paybackList.length;

    for (let payer of paybackList) {
        console.log((++counter) + "/" + size);
        await payer.setMintToken(mintToken);
    }
}
// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function paybackToken(receiverAccount: Account) {
    console.log("* Start: paybackToken");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (paybackList.length != 0) {

        size = paybackList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of paybackList) {

            console.log((++counter) + "/" + size);

            await account.transferTokenAndReceiverPayFee(receiverAccount, amountTransfer)
            .then(() => {
                console.log("   finsh success => remove from list");
                removeAccounts.push(account);
            })
            .catch(reason => {
                console.log("   error with reason = " + JSON.stringify(reason));
                if (Object.keys(reason).length == 0) {
                    console.log("   => try again");
                } else {
                    console.log("   => remove from list");
                    removeAccounts.push(account);
                    logErrorTransferToken(account);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromPaybackList(account);

    } 
}

function logErrorTransferToken(account: Account) {
    fs.writeFileSync(
        transferTokenCsv,
        transferAccountToCsvRow(account), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function unMintAllPayback(receiverAccount: Account) {
    console.log("* Start: unMintAllPaypack");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (paybackList.length != 0) {
        size = paybackList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of paybackList) {

            console.log((++counter) + "/" + size);

            await account.unMint(receiverAccount.getPublicKey())
            .then(() => {
                console.log("   finsh success => remove from list");
                removeAccounts.push(account);
            })
            .catch(reason => {
                console.log("   error with reason = " + JSON.stringify(reason));
                if (Object.keys(reason).length == 0) {
                    console.log("   => try again");
                } else {
                    console.log("   => remove from list");
                    removeAccounts.push(account);
                    logErrorUnMintAccount(account);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromPaybackList(account);

    } 
}

function logErrorUnMintAccount(account: Account) {
    fs.writeFileSync(
        unMinTokenCsv,
        transferAccountToCsvRow(account), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
function removeAccountFromPaybackList(account: Account) {
    let indexOfAcc = paybackList.indexOf(account);
    paybackList.splice(indexOfAcc, 1);
}


function transferAccountToCsvRow(account: Account): string {
    return account.getPublicKey()
        + ",\""
        + account.getKeypair().secretKey.toString()
        + "\"\n";
}


function updateSuccessCsv() {
    for (let account of paybackList)
        fs.writeFileSync(
            successCsv,
            transferAccountToCsvRow(account), {
            flag: "a"
        });
}

function getKeypairPath(i: number) {
    return keypairPath + i + ".json";
}

function getAccountFromKeyPairPath(i: number): Account {
    return Account.getAccountFromKeypairJson(
        getKeypairPath(i)
    );
}