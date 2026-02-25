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

  const { data: multiplier } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerBestMultiplier',
    args: address ? [address] : undefined,
  });

  const handleConnect = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const isRegistered = playerData?.[0] ?? false;
  const totalPoints = playerData?.[1] ?? BigInt(0);
  const currentMultiplier = multiplier ? Number(multiplier) / 100 : 1;

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl pixel-text-outline text-white">🐍 BASE SNAKE</h1>

        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="glass-card px-4 py-2 pixel-text text-xs text-white hover:bg-white/20"
          >
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="pixel-button text-xs"
          >
            CONNECT
          </button>
        )}
      </div>

      {!isConnected ? (
        /* Экран до подключения */
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
          <div className="text-8xl animate-bounce">🐍</div>
          <h2 className="text-3xl pixel-text-outline text-white text-center">BASE SNAKE</h2>
          <p className="glass-card p-4 text-center text-white pixel-text text-xs leading-6 max-w-md">
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
        /* Основной интерфейс */
        <div className="relative">
          <div className="flex justify-center items-start gap-8">

            {/* Левая часть — Boosters */}
            <div className="pt-12">
              <Boosters />
            </div>

            {/* Центр — Игра */}
            <div>
              <Game />
            </div>

            {/* Правая часть — Лидерборд */}
            <div className="w-72 pt-12">
              <Leaderboard />
            </div>
          </div>

          {/* Правый нижний угол — Points и Boost */}
          {isRegistered && (
            <div className="fixed bottom-6 right-6 glass-card p-4">
              <div className="text-center">
                <p className="pixel-text text-[8px] text-white/70">POINTS</p>
                <p className="text-2xl pixel-text text-yellow-300">{totalPoints.toString()}</p>
              </div>
              <div className="text-center mt-3 pt-3 border-t border-white/20">
                <p className="pixel-text text-[8px] text-white/70">BOOST</p>
                <p className="text-xl pixel-text text-green-300">x{currentMultiplier}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}