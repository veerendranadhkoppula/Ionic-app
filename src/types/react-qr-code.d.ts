declare module 'react-qr-code' {
  import * as React from 'react';
  type QRCodeProps = {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    bgColor?: string;
    fgColor?: string;
    title?: string;
    viewBox?: string;
    renderAs?: 'svg' | 'canvas';
  } & React.SVGProps<SVGSVGElement>;
  const QRCode: React.FC<QRCodeProps>;
  export default QRCode;
}
