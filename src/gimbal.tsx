import React, {
  SFC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getAbsoluteBounds,
  getOffsets,
  getPixelsFromPercentage,
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

export const ResizeGimbal: SFC<IGimbalProps> = ({
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
  const limit = useRef<number>(0);
  const mouse = useRef<MouseState>(MouseState.IDLE);

  // Memoize the direcion of movement for the Gimbal
  const { isVertical, isReverse } = useMemo(
    () => ({
      isVertical: ['vertical', 'vertical-reverse'].includes(direction),
      isReverse: ['horizontal-reverse', 'vertical-reverse'].includes(direction),
    }),
    [],
  );

  // Secondary function defined because of reference loss
  const getResizedValues = (position: number) => {
    const [max, min, factor] = bound.current;
    const values = getOffsets(limit.current, position, max, min, factor);

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

  const getHeightOf = useCallback(
    (element: HTMLElement | null) =>
      element !== null
        ? isVertical
          ? element.clientHeight
          : element.clientWidth
        : 0,
    [isVertical],
  );

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
            limit.current,
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
    limit.current = getHeightOf(anchorElement);
  };

  // On first render (or Anchor Ready), set current dimension property
  useEffect(handleWindowResize, [!anchorElement]);

  // Handles the calculation of the Min and Max bounds of the gimbal
  useEffect(() => {
    const maxPreferred =
      maximum.prefer || (maximum.pixels === undefined ? 'percent' : 'pixels');

    const minPreferred =
      minimum.prefer || (minimum.pixels === undefined ? 'percent' : 'pixels');

    bound.current = getAbsoluteBounds(
      isReverse,
      limit.current,
      maximum.pixels,
      minimum.pixels,
      maximum.percent,
      minimum.percent,
      maxPreferred,
      minPreferred,
      getHeightOf(divEl.current),
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
