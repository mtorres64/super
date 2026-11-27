import React from 'react';
import Barcode from './Barcode';
import { getLabelSize } from './labelSizes';

const formatPrecio = (precio) => `$${Number(precio || 0).toFixed(2)}`;

const Label = ({ producto, sizeId, mostrarPrecio, mostrarCodigoBarras }) => {
  const size = getLabelSize(sizeId);

  return (
    <div
      className="product-label"
      style={{
        width: `${size.widthMm}mm`,
        height: `${size.heightMm}mm`,
      }}
    >
      {size.categoriaFontSize > 0 && producto.categoria_nombre && (
        <div className="product-label-categoria" style={{ fontSize: size.categoriaFontSize }}>
          {producto.categoria_nombre}
        </div>
      )}
      <div
        className="product-label-nombre"
        style={{
          fontSize: size.nombreFontSize,
          WebkitLineClamp: size.nombreLineas,
        }}
      >
        {producto.nombre}
      </div>
      {mostrarPrecio && (
        <div className="product-label-precio" style={{ fontSize: size.precioFontSize }}>
          {formatPrecio(producto.precio)}
        </div>
      )}
      {mostrarCodigoBarras && producto.codigo_barras && (
        <Barcode value={producto.codigo_barras} height={size.barcodeHeight} fontSize={size.codigoFontSize} />
      )}
    </div>
  );
};

export default Label;
