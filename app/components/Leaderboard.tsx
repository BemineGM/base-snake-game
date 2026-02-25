'use client';

import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

export default function Leaderboard() {
  const { data: leaderboardData, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLeaderboard',
    args: [BigInt(10)],
  });

  const addresses = leaderboardData?.[0] ?? [];
  const points = leaderboardData?.[1] ?? [];

  return (
    <div className="glass-card p-4">
      <h3 className="pixel-text text-sm text-white text-center mb-4">🏆 LEADERS</h3>

      {isLoading ? (
        <div className="text-center pixel-text text-xs text-white/50 py-8">LOADING...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center pixel-text text-xs text-white/50 py-8">NO PLAYERS YET</div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr, index) => (
            <div
              key={addr}
              className={`leaderboard-item ${
                index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="pixel-text text-xs text-white">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span className="pixel-text text-[8px] text-white/80">
                    {addr.slice(0, 4)}..{addr.slice(-3)}
                  </span>
                </div>
                <span className="pixel-text text-xs text-yellow-300">
                  {points[index].toString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}