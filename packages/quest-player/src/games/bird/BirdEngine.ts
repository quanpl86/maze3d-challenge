// src/games/bird/BirdEngine.ts

import Interpreter from 'js-interpreter';
import type { IGameEngine, GameConfig, GameState, BirdConfig } from '../../types';
import type { BirdGameState, ResultType, Line, Coordinate } from './types';

const EXECUTION_TIMEOUT_TICKS = 100000;
const BIRD_ACCURACY = 5; // Corresponds to 0.5 * ICON_SIZE / MAP_SIZE * 100
const WALL_ACCURACY = 2; // Corresponds to 0.2 * ICON_SIZE / MAP_SIZE * 100

export class BirdEngine implements IGameEngine {
  public readonly gameType = 'bird';

  private readonly start: Coordinate;
  private readonly startAngle: number;
  private readonly worm: Coordinate | null;
  private readonly nest: Coordinate;
  private readonly walls: Line[];

  private currentState!: BirdGameState;
  private log!: BirdGameState[];

  constructor(gameConfig: GameConfig) {
    const config = gameConfig as BirdConfig;
    this.start = config.start;
    this.startAngle = config.startAngle;
    this.worm = config.worm;
    this.nest = config.nest;
    this.walls = config.walls.map(wall => ({ // Chuyển đổi để có phương thức distance
        ...wall,
        distance: function(p: Coordinate) {
            const a = p.x - this.x0;
            const b = p.y - this.y0;
            const c = this.x1 - this.x0;
            const d = this.y1 - this.y0;
            const dot = a * c + b * d;
            const lenSq = c * c + d * d;
            const param = lenSq ? dot / lenSq : -1;
            let closestX, closestY;
            if (param < 0) {
                closestX = this.x0;
                closestY = this.y0;
            } else if (param > 1) {
                closestX = this.x1;
                closestY = this.y1;
            } else {
                closestX = this.x0 + param * c;
                closestY = this.y0 + param * d;
            }
            const dx = p.x - closestX;
            const dy = p.y - closestY;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }));
  }

  getInitialState(): BirdGameState {
    return {
      x: this.start.x,
      y: this.start.y,
      angle: this.startAngle,
      hasWorm: !this.worm,
      result: 'unset',
      isFinished: false,
    };
  }

  execute(userCode: string): GameState[] {
    this.currentState = this.getInitialState();
    this.log = [this.getInitialState()];

    const initApi = (interpreter: any, globalObject: any) => {
      const wrap = (func: (...args: any[]) => any, isAction: boolean) => 
        interpreter.createNativeFunction((...args: any[]) => {
          if (isAction) this.highlight(args.pop());
          return func.apply(this, args);
        });

      interpreter.setProperty(globalObject, 'heading', wrap(this.heading, true));
      interpreter.setProperty(globalObject, 'noWorm', wrap(() => !this.currentState.hasWorm, false));
      interpreter.setProperty(globalObject, 'getX', wrap(() => this.currentState.x, false));
      interpreter.setProperty(globalObject, 'getY', wrap(() => this.currentState.y, false));
    };

    let result: ResultType = 'unset';
    const interpreter = new Interpreter(`while(true){${userCode}}`, initApi);

    try {
      let ticks = EXECUTION_TIMEOUT_TICKS;
      while (interpreter.step()) {
        if (ticks-- <= 0) {
          result = 'timeout';
          break;
        }
      }
      if (result === 'unset') {
        result = 'failure';
      }
    } catch (e) {
      if (e === true) {
        result = 'success';
      } else if (e === false) {
        result = 'failure';
      } else {
        result = 'error';
        console.error("Bird execution error:", e);
      }
    }
    
    this.currentState.isFinished = true;
    this.currentState.result = result;
    this.logState();
    
    return this.log;
  }

  private highlight(id?: string) {
    if (id && id.startsWith('block_id_')) {
      // In batch mode, we log the highlighted block with the state
      this.currentState.highlightedBlockId = id.replace('block_id_', '');
    }
  }

  private logState(): void {
    this.log.push(JSON.parse(JSON.stringify(this.currentState)));
    this.currentState.highlightedBlockId = undefined; // Reset after logging
  }

  private heading(angle: number): void {
    const angleRadians = angle * Math.PI / 180;
    this.currentState.x += Math.cos(angleRadians);
    this.currentState.y += Math.sin(angleRadians);
    this.currentState.angle = angle;
    this.logState();

    if (this.intersectWall()) {
      throw false; // Failure
    }
    if (!this.currentState.hasWorm && this.worm && this.distance(this.currentState, this.worm) < BIRD_ACCURACY) {
      this.currentState.hasWorm = true;
      this.logState();
    }
    if (this.currentState.hasWorm && this.distance(this.currentState, this.nest) < BIRD_ACCURACY) {
      throw true; // Success
    }
  }

  private intersectWall(): boolean {
    for (const wall of this.walls) {
      if (wall.distance(this.currentState) < WALL_ACCURACY) {
        return true;
      }
    }
    return false;
  }

  private distance(p1: Coordinate, p2: Coordinate): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  checkWinCondition(finalState: GameState): boolean {
    const state = finalState as BirdGameState;
    return state.result === 'success';
  }
}