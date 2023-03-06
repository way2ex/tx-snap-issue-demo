// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/interfaces/IERC721.sol";

contract NFTVault {
  struct approval {
    address owner;
    address secondSigner;
    bool approved;
  }
  // map nftContract => nftID => approval
  mapping(address => mapping(uint256 => approval)) private approvals;

  function depositNFT(address nftContract, uint tokenId, address secondSigner) public {
    require(approvals[nftContract][tokenId].owner == address(0), "NFT already deposited!");
    approvals[nftContract][tokenId] = approval(msg.sender, secondSigner, false);
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
  }

  function withdrawNFT(address nftContract, uint tokenId) public {
    approval memory data = approvals[nftContract][tokenId];
    require(data.owner != address(0), "NFT not deposited");
    require(data.owner == msg.sender, "Not owner of the NFT");
    require(data.approved, "Second signer has not signed approval");
    IERC721(nftContract).safeTransferFrom(address(this), data.owner, tokenId);
    delete approvals[nftContract][tokenId];
  }

  function approveWithdraw(address nftContract, uint tokenId) public {
    approval storage data = approvals[nftContract][tokenId];
    require(data.secondSigner == msg.sender, "Not an approver");
    if (!data.approved) {
      data.approved = true;
    }
  }

  function getApproval(address nftContract, uint tokenId) public view returns (address, address, bool) {
    approval memory data = approvals[nftContract][tokenId];
    return (data.owner, data.secondSigner, data.approved);
  }

  function removeApproval(address nftContract, uint tokenId) public {
    approval storage data = approvals[nftContract][tokenId];
    require(data.secondSigner == msg.sender, "Not an approver");
    if (data.approved) {
      data.approved = false;
    }
  }
}
