"use client";
import { useState, useEffect } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { CrossmintHostedCheckout } from "@crossmint/client-sdk-react-ui";
import collectionsData from './collections.json';

type Collection = {
  id: string;
  contractAddress: string;
  metadata?: {
    name: string;
    symbol: string;
    description: string;
    image: string;
  };
};

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? "";

if (!contractAddress) {
  throw new Error("CONTRACT_ADDRESS environment variable is not set");
}

if (!crossmintApiKey) {
  throw new Error("NEXT_PUBLIC_CROSSMINT_API_KEY is not set");
}

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
          <div className="min-h-[200px] flex items-center justify-center">
            <img
              src={imageUrl}
              alt={imageAlt || title}
              width={imageSize}
              height={imageSize}
              className="rounded mb-2 object-contain"
            />
          </div>
          <div className="text-black font-bold text-lg mb-1">{title}</div>
          <div className="text-gray-600 mb-1">{description}</div>
          <div className="text-black font-semibold mb-2">{price}</div>
        </div>
      </div>
    </div>
  );
}

export default function Page(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client: queryClient } = useAbstraxionClient();

  // State variables
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [, setShowModal]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useModal();

  // Load collections from file and fetch their info
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const collectionsWithInfo = await Promise.all(
          collectionsData.collections.map(async (collection: Collection) => {
            try {
              if (!queryClient) return collection;
              const collectionInfo = await queryClient.queryContractSmart(collection.contractAddress, {
                get_collection_info_and_extension: {},
              });
              
              let imageUrl = collectionInfo.extension?.image || "";
              if (imageUrl.startsWith("ipfs://")) {
                imageUrl = `https://ipfs.io/ipfs/${imageUrl.replace("ipfs://", "")}`;
              }
              
              const collectionWithInfo = {
                ...collection,
                metadata: {
                  name: collectionInfo.name,
                  symbol: collectionInfo.symbol,
                  description: collectionInfo.extension?.description || "",
                  image: imageUrl,
                },
              };
              
              console.log('Collection Info:', {
                id: collectionWithInfo.id,
                contractAddress: collectionWithInfo.contractAddress,
                metadata: collectionWithInfo.metadata,
                rawInfo: collectionInfo
              });
              
              return collectionWithInfo;
            } catch (err) {
              console.error(`Error fetching info for collection ${collection.id}:`, err);
              return collection;
            }
          })
        );
        setCollections(collectionsWithInfo);
        console.log('All Collections:', collectionsWithInfo);
      } catch (error) {
        console.error('Error loading collections:', error);
      }
    };
    loadCollections();
  }, [queryClient]);

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
              onClick={() => setShowModal(false)}
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
        <h1 className="text-2xl font-bold tracking-tighter text-white">XION NFT Collections</h1><br /><br />
        {loading && <div className="text-white">Loading collections...</div>}
        {account?.bech32Address ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {collections.map((collection) => (
              <div key={collection.id} className="py-8 md:pt-4 relative">
                <div className="bg-white rounded-2xl shadow-lg border max-w-4xl w-full gap-0">
                  <div className="flex items-center justify-center p-6">
                    <div className="rounded-l-2xl">
                      <CollectionPreview
                        title={collection.metadata?.name || `Collection ${collection.id}`}
                        price={"$1.00"}
                        imageUrl={collection.metadata?.image || "/ledger-pass.svg"}
                        imageSize={200}
                        imageAlt={collection.metadata?.name || `Collection ${collection.id}`}
                        description={collection.metadata?.description || `Crossmint Collection ${collection.id}`}
                      />
                      <div className="mt-4">
                        <CrossmintHostedCheckout
                          className="w-full"
                          lineItems={[{
                            collectionLocator: `crossmint:${collection.id}`,
                            callData: {
                              totalPrice: "0.003",
                              amount: 1,
                            },
                          }]}
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white text-lg mt-8">Please connect your wallet to view and purchase collections.</div>
        )}
      </main>
    </>
  );
}