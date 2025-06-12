# XION NFT Collections Marketplace

A NFT marketplace that integrates with Crossmint for NFT purchases. This project allows users to browse and purchase NFT collections using a credit card.

## Prerequisites

- Node.js 18+ and npm/yarn
- Crossmint API keys (https://www.crossmint.com/console)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_TREASURY_ADDRESS=your_treasury_contract_address
NEXT_PUBLIC_RPC_URL="https://rpc.xion-testnet-2.burnt.com:443"
NEXT_PUBLIC_REST_URL="https://api.xion-testnet-2.burnt.com"
NEXT_PUBLIC_CROSSMINT_API_KEY=your_crossmint_api_key
```

## Update Collection List

Open the `src/app/collections.json` file and add your list of collections in the following format:

```json
{
  "collections": [
    {
      "id": "your-collection-id",
      "contractAddress": "your-nft-contract-address"
    }
  ]
} 
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/burnt-labs/xion-crossmint-hosted-checkout-frontend.git
cd xion-crossmint-hosted-checkout-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Connect your XION wallet using the "Connect" button in the top right
2. Browse available NFT collections
3. Click the checkout button on any collection to purchase
4. Complete the purchase through Crossmint's hosted checkout interface
