// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FeeEscrow
 * @notice Holds creator trading fees keyed by a prmpted.com username hash until
 *         the creator claims their account and links a wallet.
 *
 * Flow:
 *  - Bonding-curve tokens send the 4% creator fee here via {deposit} whenever the
 *    creator has NOT yet linked a wallet (keyed by keccak256(lowercased username)).
 *  - Once the creator verifies their prmpted username off-chain, an authorized
 *    `claimer` (the backend signer) calls {claimFor} to (a) record the creator's
 *    wallet and (b) release all accrued fees to it.
 *  - After a username is claimed, tokens can read {walletFor} and pay the creator
 *    directly, so future fees skip escrow entirely.
 *
 * @dev Testnet demo contract — unaudited. Do not hold real funds.
 */
contract FeeEscrow is Ownable, ReentrancyGuard {
    /// @notice authorized addresses allowed to release escrowed fees (backend signer)
    mapping(address => bool) public isClaimer;

    /// @notice pending fees accrued per username hash
    mapping(bytes32 => uint256) public pending;

    /// @notice resolved wallet for a claimed username hash (0 if unclaimed)
    mapping(bytes32 => address) public walletFor;

    /// @notice lifetime total ever deposited for a username hash
    mapping(bytes32 => uint256) public lifetimeDeposited;

    /// @notice lifetime total ever released for a username hash
    mapping(bytes32 => uint256) public lifetimeReleased;

    event ClaimerSet(address indexed claimer, bool allowed);
    event Deposited(
        bytes32 indexed usernameHash,
        address indexed from,
        uint256 amount,
        uint256 newPending
    );
    event Claimed(
        bytes32 indexed usernameHash,
        address indexed wallet,
        uint256 amountReleased
    );
    event DirectPaid(
        bytes32 indexed usernameHash,
        address indexed wallet,
        uint256 amount
    );

    error NotClaimer();
    error ZeroWallet();
    error NothingToDeposit();
    error TransferFailed();

    modifier onlyClaimer() {
        if (!isClaimer[msg.sender] && msg.sender != owner()) revert NotClaimer();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        isClaimer[initialOwner] = true;
        emit ClaimerSet(initialOwner, true);
    }

    /// @notice Authorize/deauthorize a backend signer to release fees.
    function setClaimer(address claimer, bool allowed) external onlyOwner {
        isClaimer[claimer] = allowed;
        emit ClaimerSet(claimer, allowed);
    }

    /**
     * @notice Deposit creator fees for a username.
     * @dev If the username is already claimed, funds are forwarded directly to the
     *      linked wallet instead of being held. Anyone (typically a token contract)
     *      may call this.
     */
    function deposit(bytes32 usernameHash) external payable nonReentrant {
        if (msg.value == 0) revert NothingToDeposit();

        lifetimeDeposited[usernameHash] += msg.value;

        address wallet = walletFor[usernameHash];
        if (wallet != address(0)) {
            // Already claimed — forward straight to the creator.
            lifetimeReleased[usernameHash] += msg.value;
            (bool ok, ) = wallet.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
            emit DirectPaid(usernameHash, wallet, msg.value);
        } else {
            pending[usernameHash] += msg.value;
            emit Deposited(
                usernameHash,
                msg.sender,
                msg.value,
                pending[usernameHash]
            );
        }
    }

    /**
     * @notice Link a wallet to a username and release all accrued fees to it.
     * @dev Only callable by an authorized claimer (the backend, after off-chain
     *      username verification). Idempotent-ish: re-calling with the same wallet
     *      simply releases any newly-pending amount.
     */
    function claimFor(
        bytes32 usernameHash,
        address wallet
    ) external onlyClaimer nonReentrant {
        if (wallet == address(0)) revert ZeroWallet();

        walletFor[usernameHash] = wallet;

        uint256 amount = pending[usernameHash];
        if (amount > 0) {
            pending[usernameHash] = 0;
            lifetimeReleased[usernameHash] += amount;
            (bool ok, ) = wallet.call{value: amount}("");
            if (!ok) revert TransferFailed();
        }

        emit Claimed(usernameHash, wallet, amount);
    }

    /// @notice Convenience view: is this username claimed?
    function isClaimed(bytes32 usernameHash) external view returns (bool) {
        return walletFor[usernameHash] != address(0);
    }

    /// @notice Hash a username the canonical way (lowercase, no leading @).
    function hashUsername(string memory username)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_lower(username)));
    }

    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }

    receive() external payable {
        revert("use deposit()");
    }
}
