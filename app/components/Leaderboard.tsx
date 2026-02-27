'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

export default function Leaderboard() {
  const { address } = useAccount();

  const { data: leaderboardData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLeaderboard',
    args: [BigInt(25)],
  });

  const addresses = leaderboardData?.[0] ?? [];
  const points = leaderboardData?.[1] ?? [];

  // Найти позицию текущего игрока
  const myIndex = addresses.findIndex(
    (addr: string) => addr.toLowerCase() === address?.toLowerCase()
  );

  // Проверить, находится ли игрок в топ-25
  const isInTop25 = myIndex >= 0 && myIndex < 25;

  return (
    <div className="glass-card p-4 h-full">
      <h3 className="pixel-text text-sm text-white text-center mb-4">🏆 LEADERS</h3>

      <div
        className="space-y-2 overflow-y-auto"
        style={{ maxHeight: '400px' }}
      >
        {addresses.length === 0 ? (
          <p className="pixel-text text-[8px] text-white/50 text-center py-4">NO PLAYERS YET</p>
        ) : (
          <>
            {addresses.map((addr: string, index: number) => {
              const isMe = addr.toLowerCase() === address?.toLowerCase();
              const isTop10 = index < 10;

              return (
                <div
                  key={addr}
                  className="flex justify-between items-center px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: isMe
                      ? 'rgba(34, 197, 94, 0.3)'
                      : isTop10
                        ? 'rgba(250, 204, 21, 0.15)'
                        : 'rgba(255,255,255,0.05)',
                    border: isMe ? '2px solid #22C55E' : isTop10 ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="pixel-text text-[10px] text-white/70 w-6">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="pixel-text text-[8px] text-white">
                      {addr.slice(0, 4)}...{addr.slice(-4)}
                      {isMe && ' (YOU)'}
                    </span>
                  </div>
                  <span
                    className="pixel-text text-[10px]"
                    style={{ color: isTop10 ? '#FACC15' : '#fff' }}
                  >
                    {points[index]?.toString() ?? '0'}
                  </span>
                </div>
              );
            })}

            {/* Показать игрока внизу если он не в топ-25 */}
            {address && !isInTop25 && (
              <>
                <div className="text-center py-2">
                  <span className="pixel-text text-[8px] text-white/30">• • •</span>
                </div>
                <div
                  className="flex justify-between items-center px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    border: '2px solid #22C55E',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="pixel-text text-[10px] text-white/70 w-6">?</span>
                    <span className="pixel-text text-[8px] text-white">
                      {address.slice(0, 4)}...{address.slice(-4)} (YOU)
                    </span>
                  </div>
                  <span className="pixel-text text-[10px] text-white">
                    Play to rank!
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}