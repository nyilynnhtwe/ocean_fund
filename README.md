# 🌊 OceanFund  
**Decentralized Fundraising Platform**  
*Transparent Crowdfunding on Ethereum with PYUSD*

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/oceanfund.git
cd oceanfund
```

### 2. Environment Configuration

Contracts

```bash
cd contracts
cp .env.example .env  # Add RPC URL + private key
```

Frontend

```bash
cd ../frontend
cp .env.example .env  # Add RPC URL + PYUSD address
```

### 3. Contract Deployment
```bash
cd ../contracts
./script.sh deploy  # → Copy contract address
```

### 4. Update Configs
1.Update script.sh with new contract address

2.Run verification:

```bash
./script.sh verify
```

### 5. Frontend Setup
```bash
cd ../frontend
cp ../contracts/artifacts/contracts/FundraisingPlatform.json src/abis/
# Update FUNDRAISING_PLATFORM_CONTRACT_ADDRESS in src/configs/config.ts
```

### 6. Launch App
```bash
npm install
npm run dev
```