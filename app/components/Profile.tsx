'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

export default function Profile() {
  const { address, isConnected } = useAccount();

  // Читаем данные игрока
  const { data: playerData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  // Читаем множитель
  const { data: multiplier } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerBestMultiplier',
    args: address ? [address] : undefined,
  });

  // Регистрация
  const { data: registerHash, writeContract: register, isPending: isRegistering } = useWriteContract();
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({ hash: registerHash });

  // Daily Reward
  const { data: dailyHash, writeContract: claimDaily, isPending: isDailyPending } = useWriteContract();
  const { isLoading: isDailyConfirming, isSuccess: isDailySuccess } = useWaitForTransactionReceipt({ hash: dailyHash });

  // Bonus
  const { data: bonusHash, writeContract: claimBonus, isPending: isBonusPending } = useWriteContract();
  const { isLoading: isBonusConfirming, isSuccess: isBonusSuccess } = useWaitForTransactionReceipt({ hash: bonusHash });

  // Рефетч после успешных транзакций
  if (isRegisterSuccess || isDailySuccess || isBonusSuccess) {
    refetch();
  }

  if (!isConnected) {
    return (
      <div className="game-card text-center">
        <p className="text-gray-400">Connect wallet to view profile</p>
      </div>
    );
  }

  const isRegistered = playerData?.[0] ?? false;
  const totalPoints = playerData?.[1] ?? BigInt(0);
  const gamesPlayed = playerData?.[2] ?? BigInt(0);
  const lastDailyClaim = playerData?.[3] ?? BigInt(0);
  const lastBonusClaim = playerData?.[4] ?? BigInt(0);
  const ownedNFTs = playerData?.[5] ?? [];

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaimDaily = now - lastDailyClaim >= BigInt(86400); // 24 часа
  const canClaimBonus = now - lastBonusClaim >= BigInt(43200); // 12 часов

  const handleRegister = () => {
    register({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'registerPlayer',
    });
  };

  const handleClaimDaily = () => {
    claimDaily({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimDailyReward',
    });
  };

  const handleClaimBonus = () => {
    claimBonus({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimBonus',
    });
  };

  if (!isRegistered) {
    return (
      <div className="game-card text-center">
        <h3 className="text-xl font-bold mb-4 neon-text">👤 PROFILE</h3>
        <p className="text-gray-400 mb-4">You need to register first!</p>
        <button
          onClick={handleRegister}
          disabled={isRegistering || isRegisterConfirming}
          className="game-button"
        >
          {isRegistering ? '⏳ Confirm...' : isRegisterConfirming ? '⏳ Registering...' : '📝 REGISTER'}
        </button>
      </div>
    );
  }

  return (
    <div className="game-card">
      <h3 className="text-xl font-bold mb-4 neon-text">👤 PROFILE</h3>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Wallet:</span>
          <span className="text-blue-400 font-mono text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Total Points:</span>
          <span className="text-green-400 font-bold">{totalPoints.toString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Games Played:</span>
          <span className="text-purple-400 font-bold">{gamesPlayed.toString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Multiplier:</span>
          <span className="text-yellow-400 font-bold">
            {multiplier ? `${Number(multiplier) / 100}x` : '1x'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">NFT Boosters:</span>
          <span className="text-pink-400 font-bold">{ownedNFTs.length}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleClaimDaily}
          disabled={!canClaimDaily || isDailyPending || isDailyConfirming}
          className="game-button w-full"
        >
          {isDailyPending ? '⏳ Confirm...' : isDailyConfirming ? '⏳ Claiming...' : canClaimDaily ? '🎁 CLAIM DAILY (+1 pt)' : '⏰ Daily claimed'}
        </button>

        <button
          onClick={handleClaimBonus}
          disabled={!canClaimBonus || isBonusPending || isBonusConfirming}
          className="game-button w-full bg-purple-600 hover:bg-purple-700"
        >
          {isBonusPending ? '⏳ Confirm...' : isBonusConfirming ? '⏳ Claiming...' : canClaimBonus ? '⭐ CLAIM BONUS (+1 pt)' : '⏰ Bonus in 12h'}
        </button>
      </div>
    </div>
  );
}