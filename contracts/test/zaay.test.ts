import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const lowerHash = (u: string) =>
  ethers.keccak256(ethers.toUtf8Bytes(u.toLowerCase()));

describe("zaay.fun contracts", () => {
  let owner: HardhatEthersSigner;
  let launcher: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let platform: HardhatEthersSigner;

  let escrow: any;
  let factory: any;

  const USERNAME = "SatoshiPoster";
  const uHash = lowerHash(USERNAME);

  beforeEach(async () => {
    [owner, launcher, buyer, creator, platform] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("FeeEscrow");
    escrow = await Escrow.deploy(owner.address);
    await escrow.waitForDeployment();

    const Factory = await ethers.getContractFactory("TokenFactory");
    factory = await Factory.deploy(
      owner.address,
      await escrow.getAddress(),
      platform.address
    );
    await factory.waitForDeployment();
  });

  async function launchToken() {
    const tx = await factory
      .connect(launcher)
      .createToken("Satoshi Coin", "SATO", "ipfs://meta", uHash);
    const receipt = await tx.wait();
    const ev = receipt.logs
      .map((l: any) => {
        try {
          return factory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e: any) => e && e.name === "TokenCreated");
    const tokenAddr = ev.args.token;
    return ethers.getContractAt("BondingCurveToken", tokenAddr);
  }

  it("deploys a token via the factory and registers it", async () => {
    const token = await launchToken();
    expect(await factory.tokensCount()).to.equal(1n);
    expect(await factory.isZaayToken(await token.getAddress())).to.equal(true);
    expect(await token.name()).to.equal("Satoshi Coin");
    expect(await token.symbol()).to.equal("SATO");
    expect(await token.creatorUsernameHash()).to.equal(uHash);
  });

  it("hashUsername lowercases (matches off-chain hash)", async () => {
    expect(await escrow.hashUsername(USERNAME)).to.equal(uHash);
    expect(await escrow.hashUsername("SATOSHIPOSTER")).to.equal(uHash);
  });

  it("price is monotonically increasing as supply grows", async () => {
    const token = await launchToken();
    const p0 = await token.currentPrice();

    await token.connect(buyer).buy(0, { value: ethers.parseEther("1") });
    const p1 = await token.currentPrice();

    await token.connect(buyer).buy(0, { value: ethers.parseEther("1") });
    const p2 = await token.currentPrice();

    expect(p1).to.be.greaterThan(p0);
    expect(p2).to.be.greaterThan(p1);
  });

  it("routes creator fee to ESCROW when username is unclaimed", async () => {
    const token = await launchToken();
    const value = ethers.parseEther("1");

    await expect(
      token.connect(buyer).buy(0, { value })
    ).to.emit(escrow, "Deposited");

    // 4% of 1 MON should now be pending for the username
    const pending = await escrow.pending(uHash);
    expect(pending).to.equal((value * 400n) / 10_000n);
    expect(await escrow.isClaimed(uHash)).to.equal(false);
  });

  it("pays platform fee (1%) to platform wallet on buy", async () => {
    const token = await launchToken();
    const value = ethers.parseEther("1");
    const before = await ethers.provider.getBalance(platform.address);
    await token.connect(buyer).buy(0, { value });
    const after = await ethers.provider.getBalance(platform.address);
    expect(after - before).to.equal((value * 100n) / 10_000n);
  });

  it("claimFor releases escrowed fees to the creator wallet", async () => {
    const token = await launchToken();
    const value = ethers.parseEther("2");
    await token.connect(buyer).buy(0, { value });

    const expectedFee = (value * 400n) / 10_000n;
    expect(await escrow.pending(uHash)).to.equal(expectedFee);

    const before = await ethers.provider.getBalance(creator.address);
    await expect(escrow.connect(owner).claimFor(uHash, creator.address))
      .to.emit(escrow, "Claimed")
      .withArgs(uHash, creator.address, expectedFee);
    const after = await ethers.provider.getBalance(creator.address);

    expect(after - before).to.equal(expectedFee);
    expect(await escrow.pending(uHash)).to.equal(0n);
    expect(await escrow.isClaimed(uHash)).to.equal(true);
  });

  it("pays creator DIRECTLY once claimed (skips escrow)", async () => {
    const token = await launchToken();
    // claim first (links wallet, no pending yet)
    await escrow.connect(owner).claimFor(uHash, creator.address);
    expect(await escrow.isClaimed(uHash)).to.equal(true);

    const value = ethers.parseEther("1");
    const before = await ethers.provider.getBalance(creator.address);
    await token.connect(buyer).buy(0, { value });
    const after = await ethers.provider.getBalance(creator.address);

    // creator received 4% directly; escrow holds nothing pending
    expect(after - before).to.equal((value * 400n) / 10_000n);
    expect(await escrow.pending(uHash)).to.equal(0n);
  });

  it("only an authorized claimer can release fees", async () => {
    const token = await launchToken();
    await token.connect(buyer).buy(0, { value: ethers.parseEther("1") });
    await expect(
      escrow.connect(buyer).claimFor(uHash, buyer.address)
    ).to.be.revertedWithCustomError(escrow, "NotClaimer");
  });

  it("buy then sell returns MON (minus round-trip fees) and burns tokens", async () => {
    const token = await launchToken();
    await token.connect(buyer).buy(0, { value: ethers.parseEther("5") });
    const bal = await token.balanceOf(buyer.address);
    expect(bal).to.be.greaterThan(0n);

    const monBefore = await ethers.provider.getBalance(buyer.address);
    const tx = await token.connect(buyer).sell(bal, 0);
    await tx.wait();
    const monAfter = await ethers.provider.getBalance(buyer.address);

    expect(await token.balanceOf(buyer.address)).to.equal(0n);
    // received some MON back
    expect(monAfter).to.be.greaterThan(monBefore - ethers.parseEther("0.01"));
  });

  it("slippage guard reverts when minTokensOut too high", async () => {
    const token = await launchToken();
    await expect(
      token
        .connect(buyer)
        .buy(ethers.parseEther("1000000000"), {
          value: ethers.parseEther("0.001"),
        })
    ).to.be.revertedWithCustomError(token, "SlippageExceeded");
  });
});
