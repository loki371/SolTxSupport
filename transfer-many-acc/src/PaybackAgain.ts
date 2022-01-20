import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";


let accCSVPath = "transfer-many-acc/input/Payback_20_keypair2.csv";
// let accCSVPath = "transfer-many-acc/output_keypair2/input.csv";
let accountInfoCsv = "transfer-many-acc/output_again/AccountInfo.csv";
let transferTokenCsv = "transfer-many-acc/output_again/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output_again/UnMintToken.csv";
let successCsv = "transfer-many-acc/output_again/success.csv";


let amountTransfer: number = 10 * USDC_unit;
let keypairPath = "transfer-many-acc/keypair/receiver";
let receiverAccounts = new Array<Account>();

for (let i = 2; i <= 2; ++i) {
    let receiverAccount = getAccountFromKeyPairPath(i);
    receiverAccounts.push(receiverAccount);
    // console.log("receiverAccount " + i + " pubkey = " + receiverAccount.getPublicKey());
}

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
        console.log("*itemPerCount = " +itemPerCount);

        for (let receiverAccount of receiverAccounts) {
            console.log();
            console.log("** Process Batch with Counter = " + counter + " / " + stringKeys.length);

            paybackList = new Array<Account>();
           
            console.log("- receiver = " + receiverAccount.getPublicKey());

            let mintToken: splToken.Token = new splToken.Token(
                connection,
                USDC,
                splToken.TOKEN_PROGRAM_ID,
                receiverAccount.getKeypair()
            );
            
            let strKeypairs = stringKeys.slice(counter, counter + itemPerCount);

            await updatePaybackList(mintToken, strKeypairs);
            console.log("finish update paybackList, payback.size =  " + paybackList.length + "\n");

            // await paybackToken(receiverAccount);
            // console.log("\nfinish payback Token, payback.size = " + paybackList.length + "\n");

            await unMintAllPayback(receiverAccount);
            console.log("\nfinish unMint Token, payback.size = " + paybackList.length + "\n");

            updateSuccessCsv();

            counter += itemPerCount;
        }
    });


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function updatePaybackList(mintToken: splToken.Token, strKeypairs: Array<string>) {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = strKeypairs.length;

    let removeAccounts = new Array<Account>();
    for (let strKeypair of strKeypairs) {
        console.log((++counter) + "/" + size);

        let keypair = JSON.parse("[" + strKeypair + "]");
        let payer: Account = new Account(keypair);
        let isValid: boolean = await payer.setMintToken(mintToken);

        let updateResult: boolean;
        if (isValid) {
            paybackList.push(payer);
            updateResult = true;
        } else {
            removeAccounts.push(payer);
            updateResult = false;
        }
        logUpdatePayback(payer, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logUpdatePayback(account: Account, res: boolean) {
    fs.writeFileSync(
        accountInfoCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function paybackToken(receiverAccount: Account) {
    console.log("* Start: paybackToken");

    let counter = 0;
    let size = paybackList.length;

    let removeAccounts = new Array<Account>();
    for (let account of paybackList) {
        console.log((++counter) + "/" + size);

        let updateResult: boolean;
        try {
            await account.transferTokenAndReceiverPayFee(receiverAccount, amountTransfer);
            updateResult = true;
        } catch (err) {
            console.log(err); 
            removeAccounts.push(account);
            updateResult = false;
        }
        logErrorTransferToken(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logErrorTransferToken(account: Account, res: boolean) {
    fs.writeFileSync(
        transferTokenCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function unMintAllPayback(receiverAccount: Account) {
    console.log("* Start: unMintAllPaypack");

    let counter = 0;
    let size = paybackList.length;

    let removeAccounts = new Array<Account>();
    for (let account of paybackList) {
        console.log((++counter) + "/" + size);

        let updateResult: boolean;
        try {
            await account.unMint(receiverAccount.getPublicKey());
            updateResult = true;
        } catch (err) {
            console.log(err);
            removeAccounts.push(account);
            updateResult = false;
        }
        logUnMintAccount(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logUnMintAccount(account: Account, res: boolean) {
    if (res == true)
        return;
    fs.writeFileSync(
        unMinTokenCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
function removeAccountFromPaybackList(account: Account) {
    let indexOfAcc = paybackList.indexOf(account);
    paybackList.splice(indexOfAcc, 1);
}


function transferAccountToCsvRow(account: Account, res: boolean): string {
    return account.getPublicKey() 
        + ",\""
        + account.getKeypair().secretKey.toString()
        + "\"\n";
}


function updateSuccessCsv() {
    for (let account of paybackList)
        fs.writeFileSync(
            successCsv,
            transferAccountToCsvRow(account, true), {
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