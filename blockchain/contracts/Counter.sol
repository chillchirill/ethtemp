// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Counter {
    uint256 public value;

    function set(uint256 next) external {
        value = next;
    }

    function increment() external {
        value++;
    }
}
