import { IGimbalEvent } from './types';

/* ==================== +/
    TYPES / INTERFACES
/+ ==================== */

type CalculateFunction = (
  limit: number,
  position: number,
  maximum: number,
  minimum: number,
  factor?: number,
) => IGimbalEvent;

type CreateOptimisedLimits = (
  isReverse: boolean,
  absoluteLimit: number,
  absoluteMaxPx?: number,
  absoluteMinPx?: number,
  relativeMaxPc?: number,
  relativeMinPc?: number,
  preferredMax?: 'percent' | 'pixels',
  preferredMin?: 'percent' | 'pixels',
  gimbalOffset?: number,
) => [number, number, number];

// Returns value respecting the maximum and minimum limits
const getRangedValue = (value: number, maximum: number, minimum: number) =>
  value > minimum ? (value < maximum ? value : maximum) : minimum;

/* ================== +/
    EXTERNAL HELPERS
/+ ================== */

export const getPercentageFromPixels = (pixels: number, limit: number) =>
  Math.round((pixels / limit) * 1000) / 10;

export const getPixelsFromPercentage = (percentage: number, limit: number) =>
  Math.round(limit * (percentage / 100));

export const getPreferredValue = (
  valueA: number,
  valueB: number,
  preferLarger: boolean,
) =>
  preferLarger
    ? valueA > valueB
      ? valueA
      : valueB
    : valueA > valueB
    ? valueB
    : valueA;

export const getAbsoluteBounds: CreateOptimisedLimits = (
  isReverse,
  absoluteLimit,
  absoluteMaxPx = absoluteLimit,
  absoluteMinPx = 0,
  relativeMaxPc = 100,
  relativeMinPc = 0,
  preferredMax,
  preferredMin,
  gimbalOffset,
) => {
  // Calculate absolutes based on them being a proportion of the Limit
  const absoluteMaxPc = getPixelsFromPercentage(relativeMaxPc, absoluteLimit);
  const absoluteMinPc = getPixelsFromPercentage(relativeMinPc, absoluteLimit);

  // Derive actual Minimum and Maximum values perferring pixels or percentage
  const maximum = getPreferredValue(
    absoluteMaxPc,
    absoluteMaxPx,
    preferredMax === 'pixels',
  );

  const minimum = getPreferredValue(
    absoluteMinPc,
    absoluteMinPx,
    preferredMin === 'percent',
  );

  // Return Minimum and Maximum values, validated against true limits
  const validatedMaximum = maximum > absoluteLimit ? absoluteLimit : maximum;
  const validatedMinimum = minimum > 0 ? minimum : 0;

  // Return Minimum and Maximum values, validated against true limits
  return [
    isReverse ? absoluteLimit - validatedMinimum : validatedMaximum,
    isReverse ? absoluteLimit - validatedMaximum : validatedMinimum,
    gimbalOffset ? gimbalOffset / 2 : 0,
  ];
};

/* ======================= +/
    VALUE CALCULATORS
/+ ======================= */

// Returns the Before and After sizes as discrete values totalling the limit
export const getOffsets: CalculateFunction = (
  limit,
  position,
  maximum,
  minimum,
  factor = 0,
) => {
  const offset = getRangedValue(position, maximum, minimum) - factor;

  return {
    after: `${limit - offset}px`,
    before: `${offset}px`,
  };
};
