#!/bin/bash

PYUSD_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9
FUNDRAISING_CONTRACT_ADDRESS=0x8e8e0dc9860F34F25384d6B0e861023f22540A6D

# Function to clean artifacts, cache, and deployments
clean() {
  echo "Cleaning build artifacts and deployment history..."
  rm -rf artifacts cache ignition/deployments
  echo "Cleaned successfully."
}

# Function to deploy contract
deploy() {
  echo "Deploying Lock.ts module to localhost network..."
  npx hardhat ignition deploy ./ignition/modules/FundraisingPlatform.ts --network sepolia
}

verify() {
  echo "Verifying contract on Etherscan..."
  npx hardhat verify --network sepolia $FUNDRAISING_CONTRACT_ADDRESS $PYUSD_CONTRACT_ADDRESS
  }

# Check which argument was passed and call corresponding function
case "$1" in
  clean)
    clean
    ;;
  deploy)
    deploy
    ;;
  verify)
    verify
    ;;
  all)
    clean
    deploy
    ;;
  *)
    echo "Usage: $0 {clean|deploy|all}"
    exit 1
    ;;
esac
