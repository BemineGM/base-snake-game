'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 12;
const CELL_SIZE = 36;
const GAME_SPEED = 280;

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

  const isRegistered = playerData?.[0] ?? false;
  const lastDailyClaim = playerData?.[3] ?? BigInt(0);
  const currentMultiplier = multiplier ? Number(multiplier) / 100 : 1;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaimDaily = now - lastDailyClaim >= BigInt(86400);

  const { data: registerHash, writeContract: register, isPending: isRegistering } = useWriteContract();
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({ hash: registerHash });

  const { data: submitHash, writeContract: submitGame, isPending: isSubmitting } = useWriteContract();
  const { isLoading: isSubmitConfirming, isSuccess: isSubmitSuccess } = useWaitForTransactionReceipt({ hash: submitHash });

  const { data: dailyHash, writeContract: claimDaily, isPending: isDailyPending } = useWriteContract();
  const { isLoading: isDailyConfirming, isSuccess: isDailySuccess } = useWaitForTransactionReceipt({ hash: dailyHash });

  useEffect(() => {
    if (isRegisterSuccess || isSubmitSuccess || isDailySuccess) {
      refetch();
    }
  }, [isRegisterSuccess, isSubmitSuccess, isDailySuccess, refetch]);

  const generateInitialCrystals = useCallback(() => {
    const newCrystals: Position[] = [];
    const startSnake = { x: 6, y: 6 };

    for (let i = 0; i < 10; i++) {
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
    if (!isRegistered) {
      register({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'registerPlayer',
      });
      return;
    }

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
          setScore(prev => prev + 1);
          setCrystals(prev => {
            const updated = prev.filter((_, i) => i !== crystalIndex);
            if (updated.length === 0) {
              setTimeout(() => {
                setGameOver(true);
                setGameRunning(false);
              }, 100);
            }
            return updated;
          });
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

  const finalPoints = Math.floor(score * currentMultiplier);

  return (
    <div className="flex flex-col items-center">
      {/* Счёт над игрой */}
      <div className="flex gap-4 mb-4">
        <div className="glass-card px-4 py-2">
          <span className="pixel-text text-[8px] text-white/70">CRYSTALS </span>
          <span className="pixel-text text-sm text-cyan-300">{score}/10</span>
        </div>
        <div className="glass-card px-4 py-2">
          <span className="pixel-text text-[8px] text-white/70">POINTS </span>
          <span className="pixel-text text-sm text-green-300">+{finalPoints}</span>
        </div>
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

        {/* Змейка */}
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

        {/* Кристаллы */}
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

        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <p className="pixel-text text-2xl text-white mb-4">
              {score === 10 ? 'YOU WIN!' : 'GAME OVER'}
            </p>
            <p className="pixel-text text-sm text-cyan-300 mb-2">CRYSTALS: {score}/10</p>
            <p className="pixel-text text-lg text-green-300 mb-6">+{finalPoints} POINTS</p>

            <button
              onClick={handleSubmitScore}
              disabled={isSubmitting || isSubmitConfirming || score === 0}
              className="pixel-button pixel-button-green text-xs mb-3"
            >
              {isSubmitting || isSubmitConfirming ? 'SAVING...' : 'SAVE SCORE'}
            </button>

            {isSubmitSuccess && <p className="pixel-text text-xs text-green-300 mb-3">✓ SAVED!</p>}

            <button onClick={startGame} className="pixel-text text-xs text-white/50 hover:text-white">
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Start */}
        {!gameRunning && !gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <p className="pixel-text text-xs text-white mb-2">WASD OR ARROWS</p>
            <p className="pixel-text text-[8px] text-white/50">COLLECT 10 CRYSTALS</p>
          </div>
        )}
      </div>

      {/* Кнопки под игрой */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={startGame}
          disabled={isRegistering || isRegisterConfirming || gameRunning}
          className="pixel-button text-sm"
        >
          {isRegistering || isRegisterConfirming ? 'WAIT...' : '▶ PLAY'}
        </button>

        {isRegistered && (
          <button
            onClick={handleClaimDaily}
            disabled={!canClaimDaily || isDailyPending || isDailyConfirming}
            className="pixel-button pixel-button-yellow text-xs"
          >
            {isDailyPending || isDailyConfirming ? '...' : canClaimDaily ? '🎁 DAILY' : '✓ CLAIMED'}
          </button>
        )}
      </div>
    </div>
  );
}