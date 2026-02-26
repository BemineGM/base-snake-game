'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

const BOOSTERS = [
  { id: 1, multiplier: 'x1.2', color: '#A855F7', shadow: '#7C3AED' },
  { id: 2, multiplier: 'x1.5', color: '#EC4899', shadow: '#BE185D' },
  { id: 3, multiplier: 'x2.0', color: '#FACC15', shadow: '#A16207' },
];

const BOOSTER_PRICE = '0.0001'; // Цена бустера

export default function Boosters() {
  const { address, isConnected } = useAccount();

  const { data: playerData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  const { data: mintHash, writeContract: mintBooster, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Рефетч после успешной покупки
  if (isSuccess) {
    refetch();
  }

  // Логируем ошибку если есть
  if (error) {
    console.error('Booster mint error:', error);
  }

  const ownedNFTs = playerData?.[5] ?? [];

  // Проверяем количество NFT у игрока
  const ownedCount = Array.isArray(ownedNFTs) ? ownedNFTs.length : 0;

  const handleMint = (boosterId: number) => {
    console.log('Minting booster:', boosterId);

    mintBooster({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'mintBoosterNFT',
      args: [BigInt(boosterId)],
      value: parseEther(BOOSTER_PRICE),
    });
  };

  if (!isConnected) return null;

  return (
    <div className="flex flex-col gap-4">
      {BOOSTERS.map((booster) => {
        // Бустер куплен если количество NFT >= id бустера
        const owned = ownedCount >= booster.id;
        const isLoading = isPending || isConfirming;

        return (
          <button
            key={booster.id}
            onClick={() => !owned && !isLoading && handleMint(booster.id)}
            disabled={owned || isLoading}
            className="booster-card"
            style={{
              backgroundColor: owned ? booster.color : '#666',
              boxShadow: owned
                ? `0 6px 0 ${booster.shadow}, inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px ${booster.color}`
                : `0 6px 0 #444, inset 0 -4px 0 rgba(0,0,0,0.2)`,
              cursor: owned ? 'default' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <span className="text-lg">{booster.multiplier}</span>
            <span className="text-[8px] mt-1">
              {isLoading ? '...' : owned ? '✓ OWNED' : 'BOOST'}
            </span>
          </button>
        );
      })}
    </div>
  );
}