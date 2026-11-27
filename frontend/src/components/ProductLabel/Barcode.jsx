import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, height = 26, fontSize = 8 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: fontSize > 0,
        fontSize,
        height,
        margin: 0,
        width: 1.3,
      });
    } catch (_) {
      // Código no válido para código de barras: dejar el SVG vacío
    }
  }, [value, height, fontSize]);

  if (!value) return null;
  return <svg ref={svgRef} className="product-label-barcode" />;
};

export default Barcode;
