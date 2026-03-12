import { useState, useCallback, useRef, useEffect } from 'react';

const useModalClose = (closeFn) => {
  const [closing, setClosing] = useState(false);
  const closeFnRef = useRef(closeFn);
  useEffect(() => { closeFnRef.current = closeFn; });

  const handleClose = useCallback(() => {
    const delay = document.body.classList.contains('no-animations') ? 0 : 500;
    setClosing(true);
    setTimeout(() => { setClosing(false); closeFnRef.current(); }, delay);
  }, []);

  return [closing, handleClose];
};

export default useModalClose;
