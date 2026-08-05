import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

let openModalCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockPageScroll() {
  if (openModalCount === 0) {
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  openModalCount += 1;
}

function unlockPageScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}

export default function ModalPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);

  return createPortal(children, document.body);
}
