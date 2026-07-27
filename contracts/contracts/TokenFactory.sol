// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BondingCurveToken} from "./BondingCurveToken.sol";

/**
 * @title TokenFactory
 * @notice Deploys BondingCurveToken instances wired to a shared FeeEscrow, and
 *         keeps an on-chain registry for enumeration.
 *
 * @dev Testnet demo contract — unaudited.
 */
contract TokenFactory is Ownable {
    address public escrow;
    address public platformWallet;

    uint16 public creatorFeeBps = 400; // 4%
    uint16 public platformFeeBps = 100; // 1%

    // default curve params (in wei). Cheap starting price + gentle slope.
    uint256 public basePrice = 1e12; // 0.000001 MON per token at zero supply
    uint256 public slope = 1e6; // price grows with supply

    address[] public allTokens;
    mapping(address => bool) public isZaayToken;
    // token address -> creator username hash
    mapping(address => bytes32) public tokenUsernameHash;

    event TokenCreated(
        address indexed token,
        address indexed launcher,
        bytes32 indexed usernameHash,
        string name,
        string symbol,
        string metadataURI
    );
    event ConfigUpdated();

    constructor(
        address initialOwner,
        address escrow_,
        address platformWallet_
    ) Ownable(initialOwner) {
        escrow = escrow_;
        platformWallet = platformWallet_;
    }

    function setFees(uint16 creatorFeeBps_, uint16 platformFeeBps_)
        external
        onlyOwner
    {
        require(creatorFeeBps_ + platformFeeBps_ <= 2_000, "fees too high");
        creatorFeeBps = creatorFeeBps_;
        platformFeeBps = platformFeeBps_;
        emit ConfigUpdated();
    }

    function setCurve(uint256 basePrice_, uint256 slope_) external onlyOwner {
        basePrice = basePrice_;
        slope = slope_;
        emit ConfigUpdated();
    }

    function setPlatformWallet(address w) external onlyOwner {
        platformWallet = w;
        emit ConfigUpdated();
    }

    /**
     * @notice Deploy a new bonding-curve token tied to a prmpted.com creator.
     * @param usernameHash keccak256 of the lowercased prmpted username.
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI,
        bytes32 usernameHash
    ) external returns (address token) {
        BondingCurveToken t = new BondingCurveToken(
            name,
            symbol,
            metadataURI,
            usernameHash,
            msg.sender,
            platformWallet,
            escrow,
            creatorFeeBps,
            platformFeeBps,
            basePrice,
            slope
        );
        token = address(t);
        allTokens.push(token);
        isZaayToken[token] = true;
        tokenUsernameHash[token] = usernameHash;

        emit TokenCreated(
            token,
            msg.sender,
            usernameHash,
            name,
            symbol,
            metadataURI
        );
    }

    function tokensCount() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice Paginated registry read.
    function getTokens(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        uint256 n = allTokens.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        page = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = allTokens[i];
        }
    }
}
