"use client";
import { useEffect, useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionClient,
} from "@burnt-labs/abstraxion";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

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

  useEffect(() => {
    async function fetchOwnedNfts() {
      if (!account?.bech32Address || !queryClient || !contractAddress) return;
      setLoading(true);
      setError("");
      setNfts([]);
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
    }
    fetchOwnedNfts();
  }, [account?.bech32Address, queryClient]);

  return (
    <main className="m-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">My NFTs</h1>
      <br />
      {!account?.bech32Address ? (
        <div className="text-white text-lg mt-8">Please connect your wallet to view your NFTs.</div>
      ) : loading ? (
        <div className="text-white">Loading your NFTs...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : nfts.length === 0 ? (
        <div className="text-white">You do not own any NFTs.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
          {nfts.map((nft) => (
            <NftCard key={nft.token_id} nft={nft} />
          ))}
        </div>
      )}
    </main>
  );
} 