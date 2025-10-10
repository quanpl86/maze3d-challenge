// src/games/turtle/TurtleRenderer.tsx

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { IGameRenderer, TurtleConfig } from '../../types';
import type { TurtleGameState, DrawingCommand } from './types';
import './Turtle.css';

const HEIGHT = 400;
const WIDTH = 400;

export interface TurtleRendererHandle {
  getCanvasData: () => {
    userImageData: ImageData | null;
    solutionImageData: ImageData | null;
  };
}

// Mở rộng props để nhận onActionComplete
type TurtleRendererProps = Parameters<IGameRenderer>[0] & {
  solutionCommands: DrawingCommand[] | null;
  onActionComplete?: () => void;
};

const executeDrawingCommands = (ctx: CanvasRenderingContext2D, commands: DrawingCommand[]) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    
    for (const cmd of commands) {
        switch (cmd.command) {
            case 'moveTo': ctx.moveTo(cmd.x, cmd.y); break;
            case 'lineTo': ctx.lineTo(cmd.x, cmd.y); break;
            case 'penWidth': ctx.lineWidth = cmd.width; break;
            case 'penColour': ctx.strokeStyle = cmd.colour; ctx.fillStyle = cmd.colour; break;
            case 'stroke': ctx.stroke(); ctx.beginPath(); break;
        }
    }
};

export const TurtleRenderer = forwardRef<TurtleRendererHandle, TurtleRendererProps>(
  ({ gameState, gameConfig, solutionCommands, onActionComplete = () => {} }, ref) => {
    const state = gameState as TurtleGameState;
    const config = gameConfig as TurtleConfig;

    const displayRef = useRef<HTMLCanvasElement>(null);
    const answerRef = useRef<HTMLCanvasElement>(null);
    const scratchRef = useRef<HTMLCanvasElement>(null);

    // THÊM MỚI: Gọi callback sau mỗi lần render để báo cho game loop tiếp tục
    useEffect(() => {
      onActionComplete();
    }, [gameState, onActionComplete]);

    useImperativeHandle(ref, () => ({
      getCanvasData: () => {
        const scratchCtx = scratchRef.current?.getContext('2d');
        const answerCtx = answerRef.current?.getContext('2d');
        if (scratchCtx && answerCtx) {
          return {
            userImageData: scratchCtx.getImageData(0, 0, WIDTH, HEIGHT),
            solutionImageData: answerCtx.getImageData(0, 0, WIDTH, HEIGHT),
          };
        }
        return { userImageData: null, solutionImageData: null };
      },
    }));

    useEffect(() => {
      const answerCtx = answerRef.current?.getContext('2d');
      if (answerCtx && solutionCommands) {
        executeDrawingCommands(answerCtx, solutionCommands);
      }
    }, [solutionCommands]);

    useEffect(() => {
      if (!state || !config) return;

      const displayCtx = displayRef.current?.getContext('2d');
      const scratchCtx = scratchRef.current?.getContext('2d');
      const answerCanvas = answerRef.current;

      if (!displayCtx || !scratchCtx || !answerCanvas) return;
      
      executeDrawingCommands(scratchCtx, state.commands);

      displayCtx.clearRect(0, 0, WIDTH, HEIGHT);
      displayCtx.fillStyle = '#000';
      displayCtx.fillRect(0, 0, WIDTH, HEIGHT);

      displayCtx.globalAlpha = 0.2;
      displayCtx.drawImage(answerCanvas, 0, 0);
      displayCtx.globalAlpha = 1;

      displayCtx.drawImage(scratchRef.current!, 0, 0);

      if (state.turtle.visible) {
        const { x, y, heading } = state.turtle;
        
        displayCtx.strokeStyle = scratchCtx.strokeStyle;
        displayCtx.fillStyle = scratchCtx.fillStyle;
        displayCtx.lineWidth = 3;

        const radius = scratchCtx.lineWidth / 2 + 10;
        displayCtx.beginPath();
        displayCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
        displayCtx.stroke();
    
        const WIDTH_FACTOR = 0.3;
        const HEAD_TIP = 10;
        const ARROW_TIP = 4;
        const BEND = 6;
        let radians = (heading * Math.PI) / 180;
        const tipX = x + (radius + HEAD_TIP) * Math.sin(radians);
        const tipY = y - (radius + HEAD_TIP) * Math.cos(radians);
        radians -= WIDTH_FACTOR;
        const leftX = x + (radius + ARROW_TIP) * Math.sin(radians);
        const leftY = y - (radius + ARROW_TIP) * Math.cos(radians);
        radians += WIDTH_FACTOR / 2;
        const leftControlX = x + (radius + BEND) * Math.sin(radians);
        const leftControlY = y - (radius + BEND) * Math.cos(radians);
        radians += WIDTH_FACTOR;
        const rightControlX = x + (radius + BEND) * Math.sin(radians);
        const rightControlY = y - (radius + BEND) * Math.cos(radians);
        radians += WIDTH_FACTOR / 2;
        const rightX = x + (radius + ARROW_TIP) * Math.sin(radians);
        const rightY = y - (radius + ARROW_TIP) * Math.cos(radians);
        displayCtx.beginPath();
        displayCtx.moveTo(tipX, tipY);
        displayCtx.lineTo(leftX, leftY);
        displayCtx.bezierCurveTo(leftControlX, leftControlY, rightControlX, rightControlY, rightX, rightY);
        displayCtx.closePath();
        displayCtx.fill();
      }

    }, [state, config, solutionCommands]);

    return (
      <div className="turtleContainer">
        <canvas id="displayCanvas" ref={displayRef} width={WIDTH} height={HEIGHT}></canvas>
        <canvas id="answerCanvas" ref={answerRef} width={WIDTH} height={HEIGHT} style={{ display: 'none' }}></canvas>
        <canvas id="scratchCanvas" ref={scratchRef} width={WIDTH} height={HEIGHT} style={{ display: 'none' }}></canvas>
      </div>
    );
  }
);