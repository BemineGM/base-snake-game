import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = '74060f4f160bed73b4728b0f44d9c471';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});