"use client";
import { useEffect, useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionClient,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import Link from "next/link";
import { useModal } from "@burnt-labs/abstraxion";
import { useRouter } from "next/navigation";
import { useRef } from "react";

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
          <div className="font-bold text-lg mb-1 text-black">{meta.name || nft.token_id}</div>
          <div className="text-gray-600 mb-1">{meta.description || ""}</div>
        </div>
      </div>
    </div>
  );
}

export default function MyNftsPage() {
  const { data: account } = useAbstraxionAccount();
  const { client: queryClient } = useAbstraxionClient();
  const { logout } = useAbstraxionSigningClient();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [, setShowModal]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useModal();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [collections, setCollections] = useState<any[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!account?.bech32Address || !contractAddress) return;
    if (!queryClient) return;
    setLoading(true);
    setError("");
    setNfts([]);
    setFetched(true);
    async function fetchOwnedNfts() {
      try {
        // 1. Query tokens owned by the user
        const tokensRes = await queryClient!.queryContractSmart(contractAddress, {
          tokens: { owner: account.bech32Address },
        });
        const tokenIds = tokensRes.tokens || [];
        // 2. Query info for each token
        const nftInfos = await Promise.all(
          tokenIds.map(async (token_id: string) => {
            const info = await queryClient!.queryContractSmart(contractAddress, {
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
    <>
      {/* Header with Home, connect/disconnect, and profile dropdown */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/80 rounded-lg shadow px-4 py-2">
        <Link href="/" className="text-gray-800 font-semibold hover:underline mr-2 text-sm">Home</Link>
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
              onClick={logout}
            >
              Disconnect
            </button>
            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                className="ml-2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
                onClick={() => setProfileMenuOpen((v) => !v)}
                title="Profile"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"/></svg>
              </button>
              {profileMenuOpen && (
                <div id="profile-menu" className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50 border">
                  <Link
                    href="/my-nfts"
                    className="block px-4 py-2 text-gray-800 hover:bg-gray-100 text-sm"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    My NFTs
                  </Link>
                </div>
              )}
            </div>
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
      {/* Main content */}
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
    </>
  );
} 