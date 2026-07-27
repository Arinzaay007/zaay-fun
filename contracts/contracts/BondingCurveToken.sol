// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFeeEscrow {
    function deposit(bytes32 usernameHash) external payable;
    function walletFor(bytes32 usernameHash) external view returns (address);
}

/**
 * @title BondingCurveToken
 * @notice An ERC-20 whose price is set by a linear bonding curve against MON.
 *
 * Curve: price(supply) = BASE_PRICE + SLOPE * supply
 * The MON cost to mint from supply s0 -> s1 is the integral of price over that
 * range (area of a trapezoid), which keeps buy/sell symmetric and price strictly
 * increasing as supply grows.
 *
 * Fees on every trade (taken from the MON leg):
 *   - creatorFeeBps (default 400 = 4%) -> original prmpted.com poster
 *   - platformFeeBps (default 100 = 1%) -> platform wallet
 * Creator fees are routed to the poster's wallet if they've claimed it, otherwise
 * held in the FeeEscrow keyed by their username hash.
 *
 * @dev Testnet demo contract — unaudited. Do not hold real funds.
 */
contract BondingCurveToken is ERC20, ReentrancyGuard {
    uint256 public constant BPS = 10_000;

    // --- curve params (immutable-ish, set at construction) ---
    uint256 public immutable basePrice; // MON (wei) per token at zero supply
    uint256 public immutable slope; // MON (wei) price increase per token minted

    // --- fee config ---
    uint16 public immutable creatorFeeBps;
    uint16 public immutable platformFeeBps;
    address public immutable platformWallet;
    IFeeEscrow public immutable escrow;
    bytes32 public immutable creatorUsernameHash;

    // --- metadata pointer (prmpted post) ---
    string public metadataURI;
    address public immutable creatorLauncher; // wallet that launched the token

    // reserves held by this contract to back sells
    uint256 public monReserve;

    event Trade(
        address indexed trader,
        bool isBuy,
        uint256 monAmount, // gross MON in (buy) or net MON out (sell)
        uint256 tokenAmount,
        uint256 newSupply,
        uint256 newPrice,
        uint256 creatorFee,
        uint256 platformFee
    );

    error SlippageExceeded();
    error InsufficientPayment();
    error ZeroAmount();
    error InsufficientReserve();
    error TransferFailed();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory metadataURI_,
        bytes32 creatorUsernameHash_,
        address creatorLauncher_,
        address platformWallet_,
        address escrow_,
        uint16 creatorFeeBps_,
        uint16 platformFeeBps_,
        uint256 basePrice_,
        uint256 slope_
    ) ERC20(name_, symbol_) {
        metadataURI = metadataURI_;
        creatorUsernameHash = creatorUsernameHash_;
        creatorLauncher = creatorLauncher_;
        platformWallet = platformWallet_;
        escrow = IFeeEscrow(escrow_);
        creatorFeeBps = creatorFeeBps_;
        platformFeeBps = platformFeeBps_;
        basePrice = basePrice_;
        slope = slope_;
    }

    // ---------------------------------------------------------------------
    // Curve math
    // ---------------------------------------------------------------------

    /// @notice Spot price at the current supply (MON wei per whole token).
    function currentPrice() public view returns (uint256) {
        return _priceAt(totalSupply());
    }

    function _priceAt(uint256 supply) internal view returns (uint256) {
        // price = basePrice + slope * supply / 1e18  (supply is in wei-tokens)
        return basePrice + (slope * supply) / 1e18;
    }

    /**
     * @notice Gross MON required to mint `tokenAmount` tokens at the current supply.
     * @dev Integral of the linear price from s0 to s1 = trapezoid area.
     */
    function _costToMint(
        uint256 s0,
        uint256 tokenAmount
    ) internal view returns (uint256) {
        uint256 p0 = _priceAt(s0);
        uint256 p1 = _priceAt(s0 + tokenAmount);
        // area = (p0 + p1) / 2 * tokenAmount  (tokenAmount scaled by 1e18)
        return ((p0 + p1) * tokenAmount) / (2 * 1e18);
    }

    /// @notice Net MON returned for burning `tokenAmount` tokens at current supply.
    function _refundToBurn(
        uint256 s0,
        uint256 tokenAmount
    ) internal view returns (uint256) {
        uint256 p0 = _priceAt(s0 - tokenAmount);
        uint256 p1 = _priceAt(s0);
        return ((p0 + p1) * tokenAmount) / (2 * 1e18);
    }

    /// @notice Quote: given MON in (gross), how many tokens can be bought (after fees)?
    function quoteBuy(
        uint256 monIn
    ) public view returns (uint256 tokenOut, uint256 monForCurve) {
        uint256 totalFeeBps = creatorFeeBps + platformFeeBps;
        monForCurve = (monIn * (BPS - totalFeeBps)) / BPS;

        // Invert the trapezoid area to find token amount. Solve for x in:
        // monForCurve = (p0 + p0 + slope*x/1e18) / 2 * x / 1e18
        // => slope*x^2/(2e36) + p0*x/1e18 - monForCurve = 0
        uint256 s0 = totalSupply();
        uint256 p0 = _priceAt(s0);
        tokenOut = _solveTokensForMon(p0, monForCurve);
    }

    /// @notice Quote: given tokens to sell, MON out (net of fees) and gross curve refund.
    function quoteSell(
        uint256 tokenIn
    ) public view returns (uint256 monOut, uint256 grossRefund) {
        uint256 s0 = totalSupply();
        if (tokenIn > s0) tokenIn = s0;
        grossRefund = _refundToBurn(s0, tokenIn);
        uint256 totalFeeBps = creatorFeeBps + platformFeeBps;
        monOut = (grossRefund * (BPS - totalFeeBps)) / BPS;
    }

    /// @dev Quadratic solve for token amount given available MON for the curve.
    function _solveTokensForMon(
        uint256 p0,
        uint256 mon
    ) internal view returns (uint256) {
        if (mon == 0) return 0;
        if (slope == 0) {
            // flat price
            return (mon * 1e18) / p0;
        }
        // a = slope / (2e36), b = p0 / 1e18, c = -mon
        // x = (-b + sqrt(b^2 + 4a*mon)) / (2a)
        // Work in scaled integer math:
        // discriminant D = p0^2 + 2*slope*mon  (all in wei units, see derivation)
        uint256 D = p0 * p0 + 2 * slope * mon;
        uint256 sqrtD = _sqrt(D);
        // x = (sqrtD - p0) * 1e18 / slope
        if (sqrtD <= p0) return 0;
        return ((sqrtD - p0) * 1e18) / slope;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // ---------------------------------------------------------------------
    // Trading
    // ---------------------------------------------------------------------

    /// @notice Buy tokens with MON. `minTokensOut` guards against slippage.
    function buy(uint256 minTokensOut) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        (uint256 tokenOut, uint256 monForCurve) = quoteBuy(msg.value);
        if (tokenOut == 0) revert InsufficientPayment();
        if (tokenOut < minTokensOut) revert SlippageExceeded();

        uint256 creatorFee = (msg.value * creatorFeeBps) / BPS;
        uint256 platformFee = (msg.value * platformFeeBps) / BPS;

        monReserve += monForCurve;
        _mint(msg.sender, tokenOut);

        _payFees(creatorFee, platformFee);

        emit Trade(
            msg.sender,
            true,
            msg.value,
            tokenOut,
            totalSupply(),
            currentPrice(),
            creatorFee,
            platformFee
        );
    }

    /// @notice Sell tokens back to the curve. `minMonOut` guards slippage.
    function sell(
        uint256 tokenAmount,
        uint256 minMonOut
    ) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();

        (uint256 monOut, uint256 grossRefund) = quoteSell(tokenAmount);
        if (monOut < minMonOut) revert SlippageExceeded();
        if (grossRefund > monReserve) revert InsufficientReserve();

        uint256 creatorFee = (grossRefund * creatorFeeBps) / BPS;
        uint256 platformFee = (grossRefund * platformFeeBps) / BPS;

        _burn(msg.sender, tokenAmount);
        monReserve -= grossRefund;

        // pay seller
        (bool ok, ) = msg.sender.call{value: monOut}("");
        if (!ok) revert TransferFailed();

        _payFees(creatorFee, platformFee);

        emit Trade(
            msg.sender,
            false,
            monOut,
            tokenAmount,
            totalSupply(),
            currentPrice(),
            creatorFee,
            platformFee
        );
    }

    function _payFees(uint256 creatorFee, uint256 platformFee) internal {
        if (platformFee > 0 && platformWallet != address(0)) {
            (bool ok, ) = platformWallet.call{value: platformFee}("");
            if (!ok) revert TransferFailed();
        }
        if (creatorFee > 0) {
            address claimedWallet = escrow.walletFor(creatorUsernameHash);
            if (claimedWallet != address(0)) {
                // Creator already linked a wallet — pay directly.
                (bool ok, ) = claimedWallet.call{value: creatorFee}("");
                if (!ok) revert TransferFailed();
            } else {
                // Hold in escrow tied to the prmpted username.
                escrow.deposit{value: creatorFee}(creatorUsernameHash);
            }
        }
    }

    /// @notice Market cap in MON = spot price * supply.
    function marketCap() external view returns (uint256) {
        return (currentPrice() * totalSupply()) / 1e18;
    }
}
