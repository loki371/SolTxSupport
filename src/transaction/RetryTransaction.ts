import { Account } from "../account/Account";
import * as splToken from "@solana/spl-token";
import fs from "fs";

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
export async function initPayerListAndSetMint(payerList: Array<Account>, mintToken: splToken.Token, strKeypairs: Array<string>,
                                        errorCsv: string) {

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
            payerList.push(payer);
        } else {
            removeAccounts.push(payer);
            logAccountToCsv(payer, errorCsv);
        }
    }

    for (let account of removeAccounts.reverse())
        removeAccountFromList(payerList, account);
}

export async function setMintToken(payerList: Array<Account>, mintToken: splToken.Token) {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = payerList.length;

    for (let payer of payerList) {
        console.log((++counter) + "/" + size);
        await payer.setMintToken(mintToken);
    }
}

export async function transferToken(payerList: Array<Account>, receiverAccount: Account, amountTransfer: number,
                            errorCsv: string) {
    console.log("* Start: paybackToken");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (payerList.length != 0) {

        size = payerList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of payerList) {

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
                    logAccountToCsv(account, errorCsv);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromList(payerList, account);

    } 
}

export async function unMintAllPayback(payerList: Array<Account>, receiverAccount: Account, errorCsv: string) {
    console.log("* Start: unMintAllPaypack");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (payerList.length != 0) {
        size = payerList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of payerList) {

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
                    logAccountToCsv(account, errorCsv);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromList(payerList, account);
    } 
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
function removeAccountFromList(accountList: Array<Account>, account: Account) {
    let indexOfAcc = accountList.indexOf(account);
    accountList.splice(indexOfAcc, 1);
}

function mapAccountToCsvRow(account: Account): string {
    return account.getPublicKey()
        + ",\""
        + account.getKeypair().secretKey.toString()
        + "\"\n";
}

function getKeypairPath(keypairPath: string, i: number) {
    return keypairPath + i + ".json";
}

export function getAccountFromKeyPairPath(keypairPath: string, i: number): Account {
    return Account.getAccountFromKeypairJson(
        getKeypairPath(keypairPath, i)
    );
}

export function logAccountToCsv(account: Account, nameCsv: string) {
    fs.writeFileSync(
        nameCsv,
        mapAccountToCsvRow(account), {
        flag: "a"
    });
}
