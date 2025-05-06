declare module 'qrcode' {
    interface QRCodeToCanvasOptions {
      width?: number;
      margin?: number;
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  
    const toCanvas: (
      canvas: HTMLCanvasElement,
      text: string,
      options?: QRCodeToCanvasOptions
    ) => Promise<void>;
  
    export { toCanvas };
  }
  