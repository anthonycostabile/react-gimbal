import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAbsoluteBounds,
  getOffsets,
  getPixelsFromPercentage,
  getSizeAndOffset,
} from './utils';
import { IGimbalProps, IGimbalRule } from './types';

enum MouseState {
  ACTIVE,
  IDLE,
  GIMBAL_DOWN,
  GLOBAL_DOWN,
  GLOBAL_UP,
}

enum DragState {
  DRAG,
  IDLE,
  WAIT,
}

export const Gimbal: FC<IGimbalProps> = ({
  anchorElement = document.documentElement,
  children,
  className,
  default: defaultPosition = {} as IGimbalRule,
  direction = 'horizontal',
  maximum = {} as IGimbalRule,
  minimum = {} as IGimbalRule,
  mouseTimeout = 100,
  onResize,
  resizeCursor,
}) => {
  // Create references for tracking Gimbal Click, Limit and its Active Status
  const bound = useRef<[number, number, number]>([0, 0, 0]);
  const click = useRef<DragState>(DragState.IDLE);
  const divEl = useRef<HTMLDivElement | null>(null);
  const limit = useRef<[number, number]>([0, 0]);
  const mouse = useRef<MouseState>(MouseState.IDLE);

  // Memoize the direcion of movement for the Gimbal
  const { isReverse, isVertical } = useMemo(
    () => ({
      isReverse: ['horizontal-reverse', 'vertical-reverse'].includes(direction),
      isVertical: ['vertical', 'vertical-reverse'].includes(direction),
    }),
    [],
  );

  // Secondary function defined because of reference loss
  const getResizedValues = (position: number) => {
    const [max, min, factor] = bound.current;
    const values = getOffsets(
      limit.current[0],
      position - limit.current[0],
      max,
      min,
      factor,
    );

    return values;
  };

  // Memoize the classnames for both ACTIVE and IDLE states
  const [activeClass, idleClass] = useMemo(
    () =>
      className
        ? [`${className} active`, `${className} idle`]
        : ['active', 'idle'],
    [className],
  );

  // Classname handled by state for performance reasons
  const [currentClass, setCurrentClass] = useState(idleClass);

  // Sets the Gimbal to actively track the user's mouse
  const setActive = () => {
    if (resizeCursor) {
      document.documentElement.style.cursor = resizeCursor;
    }

    click.current = DragState.WAIT;
    mouse.current = MouseState.ACTIVE;

    setCurrentClass(activeClass);
    setTimeout(() => {
      if (click.current === DragState.WAIT) {
        click.current = DragState.IDLE;
      }
    }, mouseTimeout);
  };

  // Returns the gimbal to a ready, yet idle, state
  // Note: `setTimeout` is used here for performance reasons
  const setIdle = () => {
    if (resizeCursor) {
      document.documentElement.style.cursor = 'auto';
    }

    mouse.current = MouseState.IDLE;
    setTimeout(() => setCurrentClass(idleClass), 10);
  };

  // Returns a memoized function for retrieving the size and offset
  // of the target element.
  const getSizeOf = useMemo(() => getSizeAndOffset(isVertical), [isVertical]);

  // Handlers
  const handleDoubleClick = () => {
    click.current = DragState.IDLE;

    if (!(defaultPosition.percent || defaultPosition.pixels)) {
      return;
    }

    const position =
      defaultPosition.pixels !== undefined
        ? defaultPosition.pixels
        : getPixelsFromPercentage(
            defaultPosition.percent !== undefined
              ? defaultPosition.percent
              : 50,
            limit.current[0],
          );

    return onResize(getResizedValues(position));
  };

  // Handle Mouse Down and Mouse Up events to toggle active state
  const handleMouseEvent = (mouseEvent: MouseState, event?: any) => {
    switch (mouseEvent) {
      case MouseState.GIMBAL_DOWN:
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }

        if (mouse.current === MouseState.IDLE) {
          setActive();
        }

        return;

      case MouseState.GLOBAL_UP:
        if (mouse.current !== MouseState.ACTIVE) {
          return;
        }

        if (click.current === DragState.WAIT) {
          click.current = DragState.DRAG;
        } else {
          setIdle();
        }

        return;

      case MouseState.GLOBAL_DOWN:
        if (mouse.current === MouseState.ACTIVE) {
          setIdle();
        }
    }
  };

  // Handle movement while Gimbal is active
  const handleMouseMovement = (event: any) => {
    if (mouse.current === MouseState.IDLE) {
      return;
    }

    const values = getResizedValues(isVertical ? event.clientY : event.clientX);

    requestAnimationFrame(() => onResize(values));
  };

  // Handle calculating the dimension on a window resizing
  const handleWindowResize = () => {
    limit.current = getSizeOf(anchorElement);
  };

  // On first render (or Anchor Ready), set current dimension property
  useEffect(handleWindowResize, [!anchorElement]);

  // Handles the calculation of the Min and Max bounds of the gimbal
  useEffect(() => {
    const maxPreferred =
      maximum.prefer || (maximum.pixels === undefined ? 'percent' : 'pixels');

    const minPreferred =
      minimum.prefer || (minimum.pixels === undefined ? 'percent' : 'pixels');

    const divElOffset = getSizeOf(divEl.current)[0];
    const gimbalOffset = Math.floor(divElOffset ? divElOffset / 2 : 0);

    bound.current = getAbsoluteBounds(
      isReverse,
      limit.current[0] + gimbalOffset,
      gimbalOffset,
      maximum.pixels,
      minimum.pixels,
      maximum.percent,
      minimum.percent,
      maxPreferred,
      minPreferred,
    );
  }, [
    divEl.current,
    isReverse,
    limit.current,
    maximum.percent,
    maximum.pixels,
    maximum.prefer,
    minimum.percent,
    minimum.pixels,
    minimum.prefer,
  ]);

  // Handle setting and unsetting of mouse move handler
  useEffect(() => {
    const onMouseDown = () => handleMouseEvent(MouseState.GLOBAL_DOWN);
    const onMouseMove = handleMouseMovement;
    const onMouseUp = () => handleMouseEvent(MouseState.GLOBAL_UP);
    const onWindowResize = () => handleWindowResize();

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  // Render Gimbal
  return (
    <div
      className={currentClass}
      onDoubleClick={handleDoubleClick}
      onMouseDown={(event) => handleMouseEvent(MouseState.GIMBAL_DOWN, event)}
      ref={divEl}
      style={{ cursor: resizeCursor, zIndex: 999 }}
    >
      {children}
    </div>
  );
};

export default Gimbal;
