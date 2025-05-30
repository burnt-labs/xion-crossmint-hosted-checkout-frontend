"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import type { ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { CrossmintHostedCheckout } from "@crossmint/client-sdk-react-ui";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const clientApiKey = process.env.NEXT_PUBLIC_CLIENT_API_KEY as string;
const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? "";
const collectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID ?? "";
const crossmintServerApiKey = process.env.NEXT_PUBLIC_CROSSMINT_SERVER_API_KEY ?? "";
const crossmintCollectionId = process.env.NEXT_PUBLIC_CROSSMINT_COLLECTION_ID ?? "";

if (!contractAddress) {
  throw new Error("CONTRACT_ADDRESS environment variable is not set");
}

if (!crossmintApiKey) {
  throw new Error("NEXT_PUBLIC_CROSSMINT_API_KEY is not set");
}

if (!collectionId) {
  throw new Error("NEXT_PUBLIC_CROSSMINT_COLLECTION_ID is not set");
}

type ExecuteResultOrUndefined = ExecuteResult | undefined;
type QueryResult = {
  users?: string[];
  value?: string;
  map?: Array<[string, string]>;
};

function CollectionPreview({
  title,
  price,
  imageUrl,
  imageSize = 200,
  imageAlt,
  description,
}: {
  title: string;
  price: string;
  imageUrl: string;
  imageSize?: number;
  imageAlt?: string;
  description?: string;
}) {
  return (
    <div className="bg-white max-w-4xl w-full gap-0">
      <div className="flex items-center justify-center p-6">
        <div className="rounded-l-2xl flex flex-col items-center">
          <img
            src={imageUrl}
            alt={imageAlt || title}
            width={imageSize}
            height={imageSize}
            className="rounded mb-2 object-contain"
          />
          <div className="font-bold text-lg mb-1">{title}</div>
          <div className="text-gray-600 mb-1">{description}</div>
          <div className="text-black font-semibold mb-2">{price}</div>
        </div>
      </div>
    </div>
  );
}

// Static NFT data (for purchase grid)
const staticNfts = [
  {
    "id": "145a48b4-4fb9-48d0-9b82-2daa570c7aba",
    "metadata": {
      "image": "ipfs://QmTBAVuJ4srM1LxLxc6MhgKEV85MFavLbdNCyhJxavWhNT",
      "name": "Di Emperor",
      "description": "This is the emperor",
      "attributes": []
    },
    "onChain": {
      "status": "success",
      "owner": "xion1gtnf2k2cmuff47c6lmyxlk2gmwfmlufvpxegu869v0lnsl0s4fxs65yjcx",
      "chain": "xion",
      "contractAddress": "xion1dgl3wxu4ccg57clu3jgtulegamaxjkwre8eqeyp5qxm7mnrvtkqqqradh7",
      "tokenId": "037097ac-3500-4b11-8da5-b3d32da02df3"
    }
  },
  {
    "id": "8a951752-43ce-4483-b5f3-4ba2760be951",
    "metadata": {
      "image": "ipfs://QmXRqATwBQPVUfBr5LrMcmL4JBbiuiNMmP7bFr4UNqDw6r",
      "name": "Apple",
      "description": "This is an Apple",
      "attributes": []
    },
    "onChain": {
      "status": "success",
      "owner": "xion1gtnf2k2cmuff47c6lmyxlk2gmwfmlufvpxegu869v0lnsl0s4fxs65yjcx",
      "chain": "xion",
      "contractAddress": "xion1dgl3wxu4ccg57clu3jgtulegamaxjkwre8eqeyp5qxm7mnrvtkqqqradh7",
      "tokenId": "ae93f9f2-a981-40ff-b68e-59d7a765faf5"
    }
  }
];

export default function Page(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client, signArb, logout } = useAbstraxionSigningClient();
  const { client: queryClient } = useAbstraxionClient();

  // State variables
  const [loading, setLoading] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResultOrUndefined>(undefined);
  const [, setShowModal]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useModal();
  const [queryResult, setQueryResult] = useState<QueryResult>({});
  const [jsonInput, setJsonInput] = useState<string>("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [jsonError, setJsonError] = useState<string>("");
  const [showValueByUserForm, setShowValueByUserForm] = useState<boolean>(false);
  const [showUpdateJsonForm, setShowUpdateJsonForm] = useState<boolean>(true);
  const [addressInput, setAddressInput] = useState<string>("");
  const [activeView, setActiveView] = useState<string>("updateJson");
  const [showCrossmintCheckout, setShowCrossmintCheckout] = useState(false);
  const [nfts, setNfts] = useState<any[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [nftsError, setNftsError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Add effect to fetch user's JSON data when they log in
  useEffect(() => {
    const fetchUserData = async () => {
      if (account?.bech32Address && queryClient) {
        try {
          const response = await queryClient.queryContractSmart(contractAddress, {
            get_value_by_user: { address: account.bech32Address }
          });
          if (response) {
            setJsonInput(response);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [account?.bech32Address, queryClient]);

  const blockExplorerUrl = `https://www.mintscan.io/xion-testnet/tx/${executeResult?.transactionHash}`;

  const clearResults = () => {
    setQueryResult({});
    setExecuteResult(undefined);
  };

  // Effect to handle account changes
  useEffect(() => {
    if (account?.bech32Address) {
      setShowUpdateJsonForm(true);
      setActiveView("updateJson");
      clearResults();
    }
  }, [account?.bech32Address]);

  // Query functions
  const getUsers = async () => {
    setLoading(true);
    clearResults();
    setActiveView("users");
    setShowUpdateJsonForm(false);
    setShowValueByUserForm(false);
    try {
      if (!queryClient) throw new Error("Query client is not defined");
      const response = await queryClient.queryContractSmart(contractAddress, { get_users: {} });
      setQueryResult({ users: response });
    } catch (error) {
      console.error("Error querying users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMap = async () => {
    setLoading(true);
    clearResults();
    setActiveView("map");
    setShowUpdateJsonForm(false);
    setShowValueByUserForm(false);
    try {
      if (!queryClient) throw new Error("Query client is not defined");
      const response = await queryClient.queryContractSmart(contractAddress, { get_map: {} });
      setQueryResult({ map: response });
    } catch (error) {
      console.error("Error querying map:", error);
    } finally {
      setLoading(false);
    }
  };

  const getValueByUser = async (address: string) => {
    setLoading(true);
    clearResults();
    setActiveView("value");
    setShowUpdateJsonForm(false);
    setShowValueByUserForm(false);
    try {
      if (!queryClient) throw new Error("Query client is not defined");
      const response = await queryClient.queryContractSmart(contractAddress, { 
        get_value_by_user: { address } 
      });
      setQueryResult({ value: response });
      setSelectedAddress(address);
    } catch (error) {
      console.error("Error querying value:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return jsonString;
    }
  };

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      setJsonError("");
      return true;
    } catch (error) {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handleFormatJson = () => {
    if (validateJson(jsonInput)) {
      setJsonInput(formatJson(jsonInput));
    }
  };

  // Update JSON value
  const updateValue = async () => {
    if (!validateJson(jsonInput)) {
      return;
    }
    setLoading(true);
    try {
      if (!client || !account) throw new Error("Client or account not defined");
      const msg = { update: { value: jsonInput } };
      const res = await client.execute(account.bech32Address, contractAddress, msg, "auto");
      setExecuteResult(res);
      console.log("Transaction successful:", res);
    } catch (error) {
      console.error("Error executing transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNFTs = useCallback(async () => {
    setNftsLoading(true);
    setNftsError("");
    setNfts([]);
    try {
      if (!crossmintServerApiKey) throw new Error("NEXT_PUBLIC_CROSSMINT_SERVER_API_KEY is not set");
      if (!crossmintCollectionId) throw new Error("NEXT_PUBLIC_CROSSMINT_COLLECTION_ID is not set");
      const res = await fetch(
        `https://staging.crossmint.com/api/2022-06-09/collections/${crossmintCollectionId}/nfts`,
        {
          headers: {
            "x-api-key": crossmintServerApiKey,
          },
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch NFTs: ${res.statusText}`);
      const data = await res.json();
      setNfts(data.nfts || []);
    } catch (err: any) {
      setNftsError(err.message || "Unknown error");
    } finally {
      setNftsLoading(false);
    }
  }, [crossmintServerApiKey, crossmintCollectionId]);

  // Fetch all token IDs from the contract
  async function fetchAllTokenIds(client: any, contractAddress: string, limit = 30) {
    let tokens: string[] = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    while (hasMore) {
      const response: any = await client.queryContractSmart(contractAddress, {
        all_tokens: {
          start_after: cursor,
          limit,
        },
      });
      if (response.tokens && response.tokens.length > 0) {
        tokens = tokens.concat(response.tokens);
        cursor = response.tokens[response.tokens.length - 1];
        hasMore = response.tokens.length === limit;
      } else {
        hasMore = false;
      }
    }
    return tokens;
  }

  // Fetch NFT info for each token
  async function fetchNftInfos(client: any, contractAddress: string, tokenIds: string[]) {
    const nftInfos = await Promise.all(
      tokenIds.map(async (token_id) => {
        const info = await client.queryContractSmart(contractAddress, {
          all_nft_info: { token_id },
        });
        return { token_id, ...info };
      })
    );
    return nftInfos;
  }

  useEffect(() => {
    if (!queryClient || !contractAddress) return;
    setLoading(true);
    setNftsError("");
    setNfts([]);
    async function fetchNfts() {
      try {
        // 1. Get all token IDs
        const tokenIds = await fetchAllTokenIds(queryClient, contractAddress);
        // 2. Get info for each NFT
        const nftInfos = await fetchNftInfos(queryClient, contractAddress, tokenIds);
        setNfts(nftInfos);
      } catch (err: any) {
        setNftsError(err.message || "Error fetching NFTs");
      } finally {
        setLoading(false);
      }
    }
    fetchNfts();
  }, [queryClient, contractAddress]);

  return (
    <>
      {/* Top-right header for connect/disconnect */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/80 rounded-lg shadow px-4 py-2">
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
      <main className="m-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold tracking-tighter text-white">NFT Collection</h1><br /><br />
        {loading && <div className="text-white">Loading NFTs...</div>}
        {nftsError && <div className="text-red-500">{nftsError}</div>}
        {account?.bech32Address ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {staticNfts.map((nft, idx) => {
              const meta: any = nft.metadata || {};
              let imageUrl = meta.image;
              if (imageUrl && imageUrl.startsWith("ipfs://")) {
                imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`;
              }
              const title = meta.name || `NFT #${idx + 1}`;
              const description = meta.description || "";
              return (
                <div key={nft.id || idx} className="py-8 md:pt-4">
                  <div className="bg-white rounded-2xl shadow-lg border max-w-4xl w-full gap-0">
                    <div className="flex items-center justify-center p-6">
                      <div className="rounded-l-2xl">
                        <CollectionPreview
                          title={title}
                          price={"$1.00"}
                          imageUrl={imageUrl || "/ledger-pass.svg"}
                          imageSize={200}
                          imageAlt={title}
                          description={description}
                        />
                        <div className="flex items-center w-full justify-center">
                          <CrossmintHostedCheckout
                            className="w-full"
                            lineItems={{
                              collectionLocator: `crossmint:${collectionId}${nft.id ? `:${nft.id}` : ''}`,
                              callData: {
                                totalPrice: "1",
                              },
                            }}
                            appearance={{
                              display: "popup",
                              overlay: {
                                enabled: true,
                              },
                              theme: {
                                button: "dark",
                                checkout: "light",
                              },
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
                              walletAddress: account.bech32Address,
                            }}
                            locale="en-US"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-white text-lg mt-8">Please connect your wallet to view and purchase NFTs.</div>
        )}
      </main>
    </>
  );
}