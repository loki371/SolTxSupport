import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { connection } from "../connection/Connection";
import fs from "fs";

export class Account {

    keypair: web3.Keypair;
    mintToken: splToken.Token | null;
    tokenAccount: splToken.AccountInfo | null;

    constructor(arr: any) {
        let secretKey = Uint8Array.from(arr);
        this.keypair = web3.Keypair.fromSecretKey(secretKey);
        this.mintToken = null;
        this.tokenAccount = null;
        console.log("Account.constructor: public key = " + this.getPublicKey());
    }

    async setMintToken(mintToken: splToken.Token) {
        this.mintToken = mintToken;
        this.tokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
            this.getPublicKey()
        );
        console.log("setMintToken: success");
    }

    async requestAirdrop() {
        let airdropSignature = await connection.requestAirdrop(
            this.getPublicKey(),
            web3.LAMPORTS_PER_SOL,
        );

        await connection.confirmTransaction(airdropSignature);
    }

    async transferSolana(receiverPubkey: web3.PublicKey, amount: number): Promise<string> {

        console.log("-  transferSolana " + amount + " to " + receiverPubkey);

        let transaction = new web3.Transaction();

        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: this.getPublicKey(),
            toPubkey: receiverPubkey,
            lamports: amount,
        }));

        return web3.sendAndConfirmTransaction(
            connection,
            transaction,
            [this.keypair])
    }

    async transferToken(receiverPubkey: web3.PublicKey, amount: number): Promise<String> {
        if (this.tokenAccount == null || this.mintToken == null) {
            throw Error("\nthis.tokenAccount == null");
        }

        console.log("\n- transfer " + amount + " coin to " + receiverPubkey);

        let toTokenAccount = await this.mintToken.getOrCreateAssociatedAccountInfo(
            receiverPubkey
        );

        let transaction = new web3.Transaction()
            .add(
                splToken.Token.createTransferInstruction(
                    splToken.TOKEN_PROGRAM_ID,
                    this.tokenAccount.address,
                    toTokenAccount.address,
                    this.getPublicKey(),
                    [],
                    amount
                )
            );

        // Sign transaction, broadcast, and confirm
        return web3.sendAndConfirmTransaction(
            connection,
            transaction,
            [this.keypair])
    }

    async createNewMintAddress(amountSupply: number): Promise<web3.PublicKey> {

        console.log("\n--- create new Mint Token ---");

        let mint = await splToken.Token.createMint(
            connection,
            this.keypair,
            this.getPublicKey(),
            null,
            0,
            splToken.TOKEN_PROGRAM_ID);

        console.log('mint public address: ' + mint.publicKey.toBase58());

        let tokenAccount = await mint.getOrCreateAssociatedAccountInfo(
            this.getPublicKey()
        )

        console.log('token public address: ' + tokenAccount.address.toBase58());

        await mint.mintTo(
            tokenAccount.address,
            this.getPublicKey(),
            [],
            amountSupply);

        console.log("supply " + amountSupply + " to token public address finish");

        return mint.publicKey;
    }

    getKeypair(): web3.Keypair{
        return this.keypair;
    }

    getPublicKey(): web3.PublicKey {
        return this.keypair.publicKey;
    }

    async unMint(dest: web3.PublicKey) {
        if (this.tokenAccount == null || this.mintToken == null)
            throw Error("\nthis.tokenAccount == null");

        await this.mintToken.closeAccount(
            this.tokenAccount.address,
            dest,
            this.keypair,
            []
        );
    }

    static getAccountFromKeypairJson(path: string): Account {
        let rawData = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
        let privateKey = JSON.parse(rawData);
        return new Account(privateKey); 
    }
}
