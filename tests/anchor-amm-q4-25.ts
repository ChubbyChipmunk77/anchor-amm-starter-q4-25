import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorAmmQ425 } from "../target/types/anchor_amm_q4_25";
import { createMint, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { expect } from "chai";

describe("anchor-amm-q4-25", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const user = provider.wallet.publicKey;
  const program = anchor.workspace.anchorAmmQ425 as Program<AnchorAmmQ425>;
  const connection = provider.connection;
   //accounts needed for testing
  let mintx : anchor.web3.PublicKey;
  let minty : anchor.web3.PublicKey;
  let vaultx : anchor.web3.PublicKey;
  let vaulty : anchor.web3.PublicKey;
  let lp_mint : anchor.web3.PublicKey;
  let userlp : anchor.web3.PublicKey;
  let userx : anchor.web3.PublicKey;
  let usery : anchor.web3.PublicKey;
   const seed = new anchor.BN(1234);
    const fee = 30;
  const [configPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [lpPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lp"), configPDA.toBuffer()],
    program.programId
  );

  before(async () => {
    // Airdrop for fees 
    await provider.connection.requestAirdrop(user, 10 * anchor.web3.LAMPORTS_PER_SOL);
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));
    mintx = await createMint(connection, provider.wallet.payer, user, null, 6);
    minty = await createMint(connection, provider.wallet.payer, user, null, 6);
    vaultx = getAssociatedTokenAddressSync(mintx, configPDA, true);
    vaulty = getAssociatedTokenAddressSync(minty, configPDA, true);
    
    // Create user token accounts first, then mint
    const userxAccount = await getOrCreateAssociatedTokenAccount(connection, provider.wallet.payer, mintx, user);
    const useryAccount = await getOrCreateAssociatedTokenAccount(connection, provider.wallet.payer, minty, user);
    userx = userxAccount.address;
    usery = useryAccount.address;
    userlp = getAssociatedTokenAddressSync(lpPDA, user);

    await mintTo(connection, provider.wallet.payer, mintx, userx, user, 1000000);
    await mintTo(connection, provider.wallet.payer, minty, usery, user, 1000000);

  });

  describe("Initialize", () => {
        it("Initialize the  AMM", async () => {
            const tx = await program.methods
                .initialize(seed, fee, user)
                .accountsStrict({
                    initializer: user,
                    mintX: mintx,
                    mintY: minty,
                    mintLp: lpPDA,
                    vaultX: vaultx,
                    vaultY: vaulty,
                    config: configPDA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            console.log(`Initialize tx: ${tx}`);
        });
    });


    describe("Deposit",()=>{
      it("Deposit liquidity", async()=>{
        const lpToMint = new anchor.BN(100);
            const maxX = new anchor.BN(500);
            const maxY = new anchor.BN(500);

            const userXBefore = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
            const userYBefore = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
            const vaultXBefore = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
            const vaultYBefore = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;

        const tx = await program.methods
        .deposit(new anchor.BN(10000), new anchor.BN(100000), new anchor.BN(100000))
        .accountsStrict({
          user:user,
          mintX:mintx,
          mintY:minty,
          userX:userx,
          userY:usery,
          userLp:userlp,
          vaultX:vaultx,
          vaultY:vaulty,
          mintLp:lpPDA,
          config:configPDA,
          tokenProgram:TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          
        })
        .rpc();
        expect(tx).to.be.ok;
          const userXAfter = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
          const userYAfter = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
          const vaultXAfter = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
          const vaultYAfter = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;
          
         expect(vaultXBefore).to.be.lessThan(vaultXAfter);
          expect(vaultYBefore).to.be.lessThan(vaultYAfter);
          expect(userXBefore).to.be.greaterThan(userXAfter);
          expect(userYBefore).to.be.greaterThan(userYAfter);
        console.log(`Deposit tx: ${tx}`);
      });
    })

    describe("Withdraw",()=>{
      it("Withdraw liquidity", async()=>{
        const userXBefore = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
        const userYBefore = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
        const vaultXBefore = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
        const vaultYBefore = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;
        const userlpbefore = (await connection.getTokenAccountBalance(userlp)).value.uiAmount;
        const tx = await program.methods
        .withdraw(new anchor.BN(50), new anchor.BN(500), new anchor.BN(500))
        .accountsStrict({
          user:user,
          mintX:mintx,
          mintY:minty,
          userX:userx,
          userY:usery,
          userLp:userlp,
          vaultX:vaultx,
          vaultY:vaulty,
          mintLp:lpPDA,
          config:configPDA,
          tokenProgram:TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          
        })
        .rpc();
        expect(tx).to.be.ok;
          const userXAfter = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
          const userYAfter = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
          const vaultXAfter = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
          const vaultYAfter = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;
          const userlpafter = (await connection.getTokenAccountBalance(userlp)).value.uiAmount;
          
         expect(vaultXBefore).to.be.greaterThan(vaultXAfter);
          expect(vaultYBefore).to.be.greaterThan(vaultYAfter);
          expect(userXBefore).to.be.lessThan(userXAfter);
          expect(userYBefore).to.be.lessThan(userYAfter);
          expect(userlpbefore).to.be.greaterThan(userlpafter);
         console.log(`Withdraw tx: ${tx}`);
      })
    })

    describe("Swap",()=>{
      it("Swap X for Y", async()=>{
        const userXBefore = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
        const userYBefore = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
        const vaultXBefore = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
        const vaultYBefore = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;
        const tx = await program.methods
        .swap(true, new anchor.BN(100), new anchor.BN(1))
        .accountsStrict({
          user:user,
          mintLp:lpPDA,
          mintX:mintx,
          mintY:minty,
          userX:userx,
          userY:usery,
          userLp:userlp,
          vaultX:vaultx,
          vaultY:vaulty,  
          config:configPDA,
          tokenProgram:TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          
        })
        .rpc();
        expect(tx).to.be.ok;

          const userXAfter = (await connection.getTokenAccountBalance(userx)).value.uiAmount;
          const userYAfter = (await connection.getTokenAccountBalance(usery)).value.uiAmount;
          const vaultXAfter = (await connection.getTokenAccountBalance(vaultx)).value.uiAmount;
          const vaultYAfter = (await connection.getTokenAccountBalance(vaulty)).value.uiAmount;
          
         expect(vaultXBefore).to.be.lessThan(vaultXAfter);
          expect(vaultYBefore).to.be.greaterThan(vaultYAfter);
          expect(userXBefore).to.be.greaterThan(userXAfter);
          expect(userYBefore).to.be.lessThan(userYAfter);
        console.log(`Swap tx: ${tx}`);
      })
    })

});
