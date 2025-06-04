"use client";
import { useEffect, useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { CrossmintHostedCheckout } from "@crossmint/client-sdk-react-ui";
import { useRouter } from "next/navigation";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const collectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID ?? "";

function NftCard({ nft }: { nft: any }) {
  const meta = nft.info?.extension || {};
  let imageUrl = meta.image;
  if (imageUrl && imageUrl.startsWith("ipfs://")) {
    imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`;
  }
  return (
    <div className="bg-white rounded-2xl shadow-lg border max-w-4xl w-full gap-0">
      <div className="flex items-center justify-center p-6">
        <div className="rounded-l-2xl flex flex-col items-center">
          <img
            src={imageUrl || "/ledger-pass.svg"}
            alt={meta.name || "NFT"}
            width={200}
            height={200}
            className="rounded mb-2 object-contain"
          />
          <div className="font-bold text-lg mb-1">{meta.name || nft.token_id}</div>
          <div className="text-gray-600 mb-1">{meta.description || ""}</div>
        </div>
      </div>
    </div>
  );
}

export default function NftsPage() {
  const { data: account } = useAbstraxionAccount();
  const { client: queryClient } = useAbstraxionClient();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<string[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setShowModal]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useModal();
  const [fetched, setFetched] = useState(false);

  const fetchOwnedNfts = async () => {
    if (!account?.bech32Address || !queryClient || !contractAddress) return;
    setLoading(true);
    setError("");
    setNfts([]);
    setFetched(true);
    try {
      // 1. Query tokens owned by the user
      const tokensRes = await queryClient.queryContractSmart(contractAddress, {
        tokens: { owner: account.bech32Address },
      });
      const tokenIds = tokensRes.tokens || [];
      // 2. Query info for each token
      const nftInfos = await Promise.all(
        tokenIds.map(async (token_id: string) => {
          const info = await queryClient.queryContractSmart(contractAddress, {
            nft_info: { token_id },
          });
          return { token_id, info };
        })
      );
      setNfts(nftInfos);
    } catch (err: any) {
      setError(err.message || "Error fetching NFTs");
    } finally {
      setLoading(false);
    }
  };

  const toggleCart = (token_id: string) => {
    setCart((prev) =>
      prev.includes(token_id) ? prev.filter((id) => id !== token_id) : [...prev, token_id]
    );
  };

  const selectedNfts = nfts.filter((nft) => cart.includes(nft.token_id));

  // Header cart button
  const CartButton = () => (
    <button
      className="relative flex items-center bg-gray-200 hover:bg-gray-300 rounded px-3 py-1 mr-2"
      onClick={() => setShowCheckout((v) => !v)}
      disabled={cart.length === 0}
      title={cart.length === 0 ? 'Add NFTs to cart to checkout' : 'Checkout'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-13z" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="9" cy="21" r="1" fill="currentColor"/><circle cx="18" cy="21" r="1" fill="currentColor"/></svg>
      <span className="ml-1 text-xs font-semibold">{cart.length}</span>
    </button>
  );

  return (
    <>
      {/* Header with cart button and connect/disconnect logic */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/80 rounded-lg shadow px-4 py-2">
        <CartButton />
        {account?.bech32Address ? (
          <>
            <span className="font-mono text-xs text-gray-700 truncate max-w-[120px]">{account.bech32Address}</span>
            <button
              className="ml-1 text-gray-500 hover:text-black focus:outline-none"
              onClick={() => {
                navigator.clipboard.writeText(account.bech32Address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              title="Copy address"
            >
              {copied ? (
                <span role="img" aria-label="Copied">✅</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
              )}
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
              onClick={() => window.location.reload()}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
            onClick={() => setShowModal(true)}
          >
            Connect
          </button>
        )}
      </div>
      {/* Checkout modal/dropdown */}
      {showCheckout && cart.length > 0 && (
        <div className="fixed top-16 right-4 z-50 bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="mb-2 font-bold">Checkout ({cart.length} NFT{cart.length > 1 ? 's' : ''})</div>
          <CrossmintHostedCheckout
            className="w-full"
            lineItems={selectedNfts.map((nft) => ({
              collectionLocator: `crossmint:${collectionId}:${nft.token_id}`,
              callData: { totalPrice: "1" },
            }))}
            appearance={{
              display: "popup",
              overlay: { enabled: true },
              theme: { button: "dark", checkout: "light" },
            }}
            payment={{
              crypto: {
                enabled: true,
                defaultChain: "base-sepolia",
                defaultCurrency: "usdc",
              },
              fiat: {
                enabled: true,
                defaultCurrency: "usd",
              },
              receiptEmail: "receipt@crossmint.com",
            }}
            recipient={{
              walletAddress: account?.bech32Address,
            }}
            locale="en-US"
          />
          <button
            className="mt-2 w-full bg-gray-200 hover:bg-gray-300 rounded px-3 py-1 text-xs font-semibold"
            onClick={() => setShowCheckout(false)}
          >
            Close
          </button>
        </div>
      )}
      <main className="m-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold tracking-tighter text-white">My NFTs</h1>
        <br />
        {!account?.bech32Address ? (
          <div className="text-white text-lg mt-8">Please connect your wallet to view your NFTs.</div>
        ) : !fetched ? (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-lg font-semibold"
            onClick={fetchOwnedNfts}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Fetch My NFTs'}
          </button>
        ) : loading ? (
          <div className="text-white">Loading your NFTs...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : nfts.length === 0 ? (
          <div className="text-white">You do not own any NFTs.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {nfts.map((nft) => (
              <div key={nft.token_id} className="relative">
                <NftCard nft={nft} />
                <button
                  className={`absolute top-2 right-2 px-3 py-1 rounded text-xs font-semibold ${cart.includes(nft.token_id) ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                  onClick={() => toggleCart(nft.token_id)}
                >
                  {cart.includes(nft.token_id) ? 'Remove from Cart' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
} 