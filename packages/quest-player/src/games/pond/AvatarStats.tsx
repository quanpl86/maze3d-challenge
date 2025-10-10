// src/games/pond/AvatarStats.tsx

import React from 'react';
import type { AvatarState } from './types';

const POND_COLOURS = ['#ff8b00', '#c90015', '#166c0b', '#223068'];

interface AvatarStatsProps {
  avatars: AvatarState[];
}

export const AvatarStats: React.FC<AvatarStatsProps> = ({ avatars }) => {
  return (
    <div className="statsContainer">
      {avatars.map((avatar) => {
        const healthPercentage = 100 - avatar.damage;
        const color = POND_COLOURS[avatar.visualizationIndex % POND_COLOURS.length];
        
        return (
          <div key={avatar.id} className="avatarStatCard" style={{ borderColor: color }}>
            <div className="healthBarBackground" />
            <div
              className="healthBar"
              style={{
                width: `${healthPercentage}%`,
                backgroundColor: color,
              }}
            />
            <span className="avatarName">{avatar.name}</span>
          </div>
        );
      })}
    </div>
  );
};