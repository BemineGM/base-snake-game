'use client';

import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import Boosters from './components/Boosters';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contracts/abi';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find(c => c.id === 'injected') || connectors[0];

  const { data: playerData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  const handleConnect = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const isRegistered = playerData?.[0] ?? false;
  const totalPoints = playerData?.[1] ?? BigInt(0);

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl pixel-text-outline text-white" style={{ letterSpacing: '0.15em' }}>🐍 BASE SNAKE</h1>

        <div className="flex items-center gap-6">
          {isConnected && isRegistered && (
            <div className="glass-card px-4 py-2">
              <span className="pixel-text text-[10px] text-white">POINTS: </span>
              <span className="pixel-text text-lg text-yellow-300">{totalPoints.toString()}</span>
            </div>
          )}

          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="glass-card px-3 py-2 pixel-text text-[8px] text-white hover:bg-white/20"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="pixel-button text-sm"
            >
              CONNECT
            </button>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
          <div className="text-6xl">🐍</div>
          <h2 className="text-2xl pixel-text-outline text-white text-center" style={{ letterSpacing: '0.15em' }}>BASE SNAKE</h2>
          <p className="glass-card p-4 text-center text-white pixel-text text-[10px]" style={{ letterSpacing: '0.05em' }}>
            Collect crystals, earn points, buy boosters and compete!
          </p>
          <button
            onClick={handleConnect}
            className="pixel-button text-lg"
          >
            ▶ PLAY
          </button>
        </div>
      ) : (
        <div className="flex justify-center items-start gap-16">
          {/* Boosters - слева с отступом */}
          <div className="pt-10">
            <Boosters />
          </div>

          {/* Game - центр */}
          <div>
            <Game />
          </div>

          {/* Leaderboard - справа с отступом */}
          <div className="w-64 pt-10">
            <Leaderboard />
          </div>
        </div>
      )}
    </main>
  );
}