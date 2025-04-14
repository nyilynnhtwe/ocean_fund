// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FundraisingPlatform {
    using SafeERC20 for IERC20;
    address public platformOwner;
    uint256 public fundraiserCount;
    IERC20 public payUsdToken;

    struct Fundraiser {
        uint256 id;
        address organizer;
        string name;
        uint256 goal;
        uint256 deadline;
        uint256 totalDonations;
        bool isClosed;
    }

    struct Donation {
        address donor;
        string donorName;
        string note;
        uint256 amount;
    }

    mapping(uint256 => Fundraiser) public fundraisers;
    mapping(uint256 => mapping(address => uint256)) public donorBalances;
    mapping(uint256 => Donation[]) public donations;

    event FundraiserCreated(
        uint256 id,
        address organizer,
        string name,
        uint256 goal,
        uint256 deadline
    );

    event DonationReceived(
        uint256 fundraiserId,
        address donor,
        string donorName,
        string note,
        uint256 amount
    );

    constructor(address _token) {
        platformOwner = msg.sender;
        payUsdToken = IERC20(_token);
    }

    function createFundraiser(
        string memory _name,
        uint256 _goal,
        uint256 _duration
    ) public {
        require(_goal > 0, "Goal must be greater than 0");
        require(bytes(_name).length > 0, "Name is required");

        fundraiserCount++;
        fundraisers[fundraiserCount] = Fundraiser(
            fundraiserCount,
            msg.sender,
            _name,
            _goal,
            block.timestamp + _duration,
            0,
            false
        );

        emit FundraiserCreated(
            fundraiserCount,
            msg.sender,
            _name,
            _goal,
            block.timestamp + _duration
        );
    }

    function donate(
        uint256 _fundraiserId,
        string memory _donorName,
        string memory _note,
        uint256 _amount
    ) public {
        Fundraiser storage fundraiser = fundraisers[_fundraiserId];
        require(block.timestamp < fundraiser.deadline, "Fundraiser ended");
        require(!fundraiser.isClosed, "Fundraiser is closed");
        require(_amount > 0, "Donation amount must be greater than 0");
        require(bytes(_donorName).length > 0, "Donor name is required");
        // Transfer token from donor to contract
        payUsdToken.safeTransferFrom(msg.sender, address(this), _amount);

        fundraiser.totalDonations += _amount;
        donorBalances[_fundraiserId][msg.sender] += _amount;

        donations[_fundraiserId].push(
            Donation({
                donor: msg.sender,
                donorName: _donorName,
                note: _note,
                amount: _amount
            })
        );

        emit DonationReceived(
            _fundraiserId,
            msg.sender,
            _donorName,
            _note,
            _amount
        );
    }

    function withdrawFunds(uint256 _fundraiserId) public {
        Fundraiser storage fundraiser = fundraisers[_fundraiserId];
        require(msg.sender == fundraiser.organizer, "Not organizer");
        require(block.timestamp >= fundraiser.deadline, "Fundraiser ongoing");
        require(!fundraiser.isClosed, "Already withdrawn");
        require(fundraiser.totalDonations >= fundraiser.goal, "Goal not met");

        uint256 platformFee = fundraiser.totalDonations / 100;
        uint256 organizerAmount = fundraiser.totalDonations - platformFee;

        fundraiser.isClosed = true;

        require(
            payUsdToken.transfer(platformOwner, platformFee),
            "Fee transfer failed"
        );
        require(
            payUsdToken.transfer(fundraiser.organizer, organizerAmount),
            "Payout failed"
        );
    }

    function claimRefund(uint256 _fundraiserId) public {
        Fundraiser storage fundraiser = fundraisers[_fundraiserId];
        require(block.timestamp >= fundraiser.deadline, "Fundraiser ongoing");
        require(fundraiser.totalDonations < fundraiser.goal, "Goal met");

        uint256 amount = donorBalances[_fundraiserId][msg.sender];
        require(amount > 0, "No donation to refund");

        donorBalances[_fundraiserId][msg.sender] = 0;
        require(payUsdToken.transfer(msg.sender, amount), "Refund failed");
    }

    function getDonations(
        uint256 _fundraiserId
    ) public view returns (Donation[] memory) {
        return donations[_fundraiserId];
    }
}
