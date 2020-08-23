import { CSSProperties } from 'react';

export interface IGimbalEvent {
  after: string;
  before: string;
}

export interface IGimbalProps {
  anchorElement?: HTMLElement | null;
  className?: string;
  direction?:
    | 'horizontal'
    | 'horizontal-reverse'
    | 'vertical'
    | 'vertical-reverse';
  default?: Partial<IGimbalRule>;
  maximum?: Partial<IGimbalRule>;
  minimum?: Partial<IGimbalRule>;
  mouseTimeout?: number;
  onResize: (event: IGimbalEvent) => void;
  resizeCursor?: CSSProperties['cursor'];
}

export interface IGimbalRule {
  percent: number;
  pixels: number;
  prefer: 'percent' | 'pixels';
}
