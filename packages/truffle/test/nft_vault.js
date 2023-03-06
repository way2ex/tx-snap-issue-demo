require('@openzeppelin/test-helpers/configure')({
  provider: web3.currentProvider,
  singletons: {
    abstraction: 'truffle',
  },
});

const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const NFTVault = artifacts.require('NFTVault');
const SimpleNFT = artifacts.require('SimpleNFT');

async function mintNft(simpleNFT, sender) {
  txn = await simpleNFT.mint('fakeURI', { from: sender });
  return txn.logs[1].args[0].toNumber();
}

function assertApproval(actual, expected) {
  assert.equal(actual[0], expected.owner, 'owner is not correct');
  assert.equal(actual[1], expected.secondSigner, 'secondSigner is not correct');
  assert.equal(actual[2], expected.approved, 'approved is not correct');
}

contract('NFTVault', function (accounts) {
  const tokenOwner = accounts[1];
  const secondSigner = accounts[2];
  let nftVault;
  let simpleNFT;
  let tokenId;

  before('should reuse variables', async () => {
    nftVault = await NFTVault.deployed();
    simpleNFT = await SimpleNFT.deployed();
  });
  beforeEach('should mint and deposit NFT', async () => {
    tokenId = await mintNft(simpleNFT, tokenOwner, { from: tokenOwner });
    await simpleNFT.approve(nftVault.address, tokenId, { from: tokenOwner });
    await nftVault.depositNFT(simpleNFT.address, tokenId, secondSigner, {
      from: tokenOwner,
    });
  });

  it('should deposit NFT with correct data and should not deposit twice', async function () {
    let expected = {
      owner: tokenOwner,
      secondSigner: secondSigner,
      approved: false,
    };
    assertApproval(
      await nftVault.getApproval(simpleNFT.address, tokenId),
      expected,
    );
    assert.equal(await simpleNFT.ownerOf(tokenId), nftVault.address);

    await expectRevert(
      nftVault.depositNFT(simpleNFT.address, tokenId, secondSigner, {
        from: tokenOwner,
      }),
      'NFT already deposited!',
    );
  });
  it('should not approve withdrawal if not second signer', async function () {
    await expectRevert(
      nftVault.approveWithdraw(simpleNFT.address, tokenId, {
        from: accounts[3],
      }),
      'Not an approver',
    );
  });
  it('should approve withdrawal if second signer', async function () {
    await nftVault.approveWithdraw(simpleNFT.address, tokenId, {
      from: secondSigner,
    });
    let expected = {
      owner: tokenOwner,
      secondSigner: secondSigner,
      approved: true,
    };
    assertApproval(
      await nftVault.getApproval(simpleNFT.address, tokenId),
      expected,
    );
  });
  it('should not withdraw if not owner', async function () {
    await expectRevert(
      nftVault.withdrawNFT(simpleNFT.address, tokenId, { from: accounts[3] }),
      'Not owner of the NFT',
    );
  });
  it('should not withdraw if not approved', async function () {
    await expectRevert(
      nftVault.withdrawNFT(simpleNFT.address, tokenId, { from: tokenOwner }),
      'Second signer has not signed approval',
    );
  });
  it('should withdraw and not withdraw twice', async function () {
    await nftVault.approveWithdraw(simpleNFT.address, tokenId, {
      from: secondSigner,
    });
    await nftVault.withdrawNFT(simpleNFT.address, tokenId, {
      from: tokenOwner,
    });
    let expected = {
      owner: constants.ZERO_ADDRESS,
      secondSigner: constants.ZERO_ADDRESS,
      approved: false,
    };
    assertApproval(
      await nftVault.getApproval(simpleNFT.address, tokenId),
      expected,
    );
    assert.equal(await simpleNFT.ownerOf(tokenId), tokenOwner);

    await expectRevert(
      nftVault.withdrawNFT(simpleNFT.address, tokenId, { from: tokenOwner }),
      'NFT not deposited',
    );
  });
  it('should not remove approval if not second signer', async function () {
    await expectRevert(
      nftVault.removeApproval(simpleNFT.address, tokenId, {
        from: accounts[3],
      }),
      'Not an approver',
    );
  });
  it('should remove approval if second signer', async function () {
    await nftVault.removeApproval(simpleNFT.address, tokenId, {
      from: secondSigner,
    });
    let expected = {
      owner: tokenOwner,
      secondSigner: secondSigner,
      approved: false,
    };
    assertApproval(
      await nftVault.getApproval(simpleNFT.address, tokenId),
      expected,
    );
  });
});
