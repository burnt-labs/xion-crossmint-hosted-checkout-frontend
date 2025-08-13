"use client";
import { Inter } from 'next/font/google'
import './globals.css'
import {AbstraxionProvider} from "@burnt-labs/abstraxion";
import { CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import { Abstraxion } from "@burnt-labs/abstraxion";

import "@burnt-labs/abstraxion/dist/index.css";
import "@burnt-labs/ui/dist/index.css";

const inter = Inter({ subsets: ['latin'] })

const treasuryConfig = {
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: process.env.NEXT_PUBLIC_REST_URL || "https://api.xion-testnet-2.burnt.com",
};

const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {crossmintApiKey ? (
          <CrossmintProvider apiKey={crossmintApiKey}>
            <AbstraxionProvider config={treasuryConfig}>
              <Abstraxion onClose={() => {}} />
              {children}
            </AbstraxionProvider>
          </CrossmintProvider>
        ) : (
          <AbstraxionProvider config={treasuryConfig}>
            <Abstraxion onClose={() => {}} />
            {children}
          </AbstraxionProvider>
        )}
      </body>
    </html>
  )
}
