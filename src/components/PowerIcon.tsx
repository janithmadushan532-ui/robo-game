import React from 'react';
import {
  Atom,
  Clock,
  CloudLightning,
  CloudRain,
  Crosshair,
  Flame,
  Gauge,
  Ghost,
  Hand,
  HeartPulse,
  Mountain,
  Navigation,
  Orbit,
  Rocket,
  Shield,
  Snowflake,
  Sparkles,
  Sun,
  Swords,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { PowerIconType } from '../types/game';

interface PowerIconProps {
  type: PowerIconType;
  className?: string;
}

export const PowerIcon: React.FC<PowerIconProps> = ({ type, className = 'h-4 w-4' }) => {
  switch (type) {
    case 'flame':
      return <Flame className={className} />;
    case 'snowflake':
      return <Snowflake className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'cloud_lightning':
      return <CloudLightning className={className} />;
    case 'mountain':
      return <Mountain className={className} />;
    case 'wind':
      return <Wind className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'fist':
      return <Hand className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'orbit':
      return <Orbit className={className} />;
    case 'crosshair':
      return <Crosshair className={className} />;
    case 'rocket':
      return <Rocket className={className} />;
    case 'gauge':
      return <Gauge className={className} />;
    case 'atom':
      return <Atom className={className} />;
    case 'waves':
      return <Waves className={className} />;
    case 'meteor':
      return <Sun className={className} />;
    case 'heart':
      return <HeartPulse className={className} />;
    case 'cloud_rain':
      return <CloudRain className={className} />;
    case 'ghost':
      return <Ghost className={className} />;
    case 'clock':
      return <Clock className={className} />;
    case 'navigation':
      return <Navigation className={className} />;
    case 'swords':
      return <Swords className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};
