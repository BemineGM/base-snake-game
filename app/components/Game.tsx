'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 12;
const CELL_SIZE = 36;
const GAME_SPEED = 280;
const MAX_CRYSTALS = 10;

export default function Game() {
  const { address, isConnected } = useAccount();

  const [snake, setSnake] = useState<Position[]>([{ x: 6, y: 6 }]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [crystals, setCrystals] = useState<Position[]>([]);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const { data: playerData, refetch } = useReadContract({
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

  const lastDailyClaim = playerData?.[3] ?? BigInt(0);
  const currentMultiplier = multiplier ? Number(multiplier) / 100 : 1;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaimDaily = now - lastDailyClaim >= BigInt(86400);

  const { data: submitHash, writeContract: submitGame, isPending: isSubmitting } = useWriteContract();
  const { isLoading: isSubmitConfirming, isSuccess: isSubmitSuccess } = useWaitForTransactionReceipt({ hash: submitHash });

  const { data: dailyHash, writeContract: claimDaily, isPending: isDailyPending } = useWriteContract();
  const { isLoading: isDailyConfirming, isSuccess: isDailySuccess } = useWaitForTransactionReceipt({ hash: dailyHash });

  useEffect(() => {
    if (isSubmitSuccess || isDailySuccess) {
      refetch();
    }
  }, [isSubmitSuccess, isDailySuccess, refetch]);

  const generateInitialCrystals = useCallback(() => {
    const newCrystals: Position[] = [];
    const startSnake = { x: 6, y: 6 };

    for (let i = 0; i < MAX_CRYSTALS; i++) {
      let crystal: Position;
      let attempts = 0;
      do {
        crystal = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts++;
      } while (
        (newCrystals.some(c => c.x === crystal.x && c.y === crystal.y) ||
        (crystal.x === startSnake.x && crystal.y === startSnake.y)) &&
        attempts < 100
      );
      newCrystals.push(crystal);
    }
    return newCrystals;
  }, []);

  const startGame = () => {
    setSnake([{ x: 6, y: 6 }]);
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setScore(0);
    setGameOver(false);
    setCrystals(generateInitialCrystals());
    setGameRunning(true);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameRunning) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'ArrowDown': case 's': case 'S':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameRunning, direction]);

  useEffect(() => {
    if (!gameRunning || gameOver) return;

    const gameLoop = setInterval(() => {
      setDirection(nextDirection);

      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };

        switch (nextDirection) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true);
          setGameRunning(false);
          return prevSnake;
        }

        if (prevSnake.length > 1 && prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          setGameRunning(false);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];
        const crystalIndex = crystals.findIndex(c => c.x === head.x && c.y === head.y);

        if (crystalIndex !== -1) {
          // Увеличиваем счёт только если меньше MAX_CRYSTALS
          setScore(prev => {
            const newScore = prev + 1;
            // Если собрали все — конец игры
            if (newScore >= MAX_CRYSTALS) {
              setTimeout(() => {
                setGameOver(true);
                setGameRunning(false);
              }, 100);
            }
            return Math.min(newScore, MAX_CRYSTALS);
          });
          setCrystals(prev => prev.filter((_, i) => i !== crystalIndex));
          return newSnake;
        } else {
          newSnake.pop();
          return newSnake;
        }
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [gameRunning, gameOver, nextDirection, crystals]);

  const handleSubmitScore = () => {
    submitGame({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'submitGame',
      args: [BigInt(score)],
    });
  };

  const handleClaimDaily = () => {
    claimDaily({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimDailyReward',
    });
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isEven = (x + y) % 2 === 0;
        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: x * CELL_SIZE,
              top: y * CELL_SIZE,
              backgroundColor: isEven ? '#90EE90' : '#7CCD7C',
              borderRight: '1px solid rgba(0,0,0,0.1)',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
            }}
          />
        );
      }
    }
    return cells;
  };

  // Ограничиваем score максимумом
  const displayScore = Math.min(score, MAX_CRYSTALS);
  const finalPoints = Math.floor(displayScore * currentMultiplier);

  return (
    <div className="flex flex-col items-center">
      {/* Счёт над игрой */}
      <div className="glass-card px-6 py-3 mb-6">
        <span className="pixel-text text-[10px] text-white">CRYSTALS: </span>
        <span className="pixel-text text-lg text-cyan-300">{displayScore}/{MAX_CRYSTALS}</span>
        {currentMultiplier > 1 && (
          <span className="pixel-text text-[10px] text-green-300 ml-4">
            (x{currentMultiplier} = +{finalPoints})
          </span>
        )}
      </div>

      {/* Игровое поле */}
      <div
        className="game-field relative overflow-hidden"
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
        }}
      >
        {renderGrid()}

        {snake.map((segment, index) => (
          <div
            key={`snake-${index}`}
            className={index === 0 ? 'snake-head' : 'snake-segment'}
            style={{
              position: 'absolute',
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              left: segment.x * CELL_SIZE + 2,
              top: segment.y * CELL_SIZE + 2,
              borderRadius: '4px',
              zIndex: 10,
            }}
          />
        ))}

        {crystals.map((crystal, index) => (
          <div
            key={`crystal-${index}`}
            style={{
              position: 'absolute',
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: crystal.x * CELL_SIZE,
              top: crystal.y * CELL_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <div className="crystal" />
          </div>
        ))}

        {/* Start Screen */}
        {!gameRunning && !gameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
            <p className="pixel-text text-[10px] text-white mb-2">WASD OR ARROWS</p>
            <p className="pixel-text text-[8px] text-white/50">COLLECT {MAX_CRYSTALS} CRYSTALS</p>
          </div>
        )}
      </div>

      {/* Кнопки под игрой */}
      <div className="flex gap-6 mt-8">
        <button
          onClick={startGame}
          disabled={gameRunning}
          className="pixel-button text-sm"
        >
          ▶ PLAY
        </button>

        <button
          onClick={handleClaimDaily}
          disabled={!canClaimDaily || isDailyPending || isDailyConfirming}
          className="pixel-button text-[10px]"
          style={{
            backgroundColor: canClaimDaily ? '#FACC15' : '#666',
            borderColor: canClaimDaily ? '#A16207' : '#444',
            boxShadow: canClaimDaily ? '0 6px 0 #A16207' : '0 6px 0 #444',
            color: canClaimDaily ? '#000' : '#999',
          }}
        >
          {isDailyPending || isDailyConfirming ? '...' : canClaimDaily ? '🎁 DAILY' : 'CLAIMED ✓'}
        </button>
      </div>

      {/* Game Over Modal - ФИКСИРОВАННЫЙ ПО ЦЕНТРУ ЭКРАНА */}
      {gameOver && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="flex flex-col items-center p-8"
            style={{
              background: 'linear-gradient(180deg, #2D3748 0%, #1A202C 100%)',
              border: '4px solid #4A5568',
              borderRadius: '16px',
              boxShadow: '0 10px 0 #1A202C, 0 15px 30px rgba(0,0,0,0.5)',
              minWidth: '300px',
            }}
          >
            {/* Заголовок */}
            <div
              className="px-8 py-3 -mt-12 mb-6"
              style={{
                background: displayScore === MAX_CRYSTALS ? '#48BB78' : '#E53E3E',
                border: '4px solid #000',
                borderRadius: '8px',
                boxShadow: '0 4px 0 #000',
              }}
            >
              <p className="pixel-text text-base text-white">
                {displayScore === MAX_CRYSTALS ? '🎉 YOU WIN!' : '💀 GAME OVER'}
              </p>
            </div>

            {/* Результаты */}
            <div className="text-center mb-4">
              <p className="pixel-text text-[10px] text-gray-400 mb-2">CRYSTALS</p>
              <p className="pixel-text text-2xl text-cyan-300">{displayScore}/{MAX_CRYSTALS}</p>
            </div>

            <div
              className="text-center mb-6 px-8 py-4"
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
              }}
            >
              <p className="pixel-text text-[10px] text-gray-400 mb-2">POINTS EARNED</p>
              <p className="pixel-text text-3xl text-green-400">+{finalPoints}</p>
            </div>

            {/* Кнопки */}
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={handleSubmitScore}
                disabled={isSubmitting || isSubmitConfirming || displayScore === 0}
                className="pixel-button pixel-button-green text-xs w-full"
                style={{ padding: '14px 20px' }}
              >
                {isSubmitting || isSubmitConfirming ? '⏳ SAVING...' : '💾 SAVE SCORE'}
              </button>

              {isSubmitSuccess && (
                <p className="pixel-text text-[10px] text-green-400 text-center">✓ SAVED!</p>
              )}

              <button
                onClick={startGame}
                className="pixel-button text-xs w-full"
                style={{ padding: '14px 20px' }}
              >
                🔄 PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}