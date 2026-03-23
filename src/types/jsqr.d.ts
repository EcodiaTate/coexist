declare module 'jsqr' {
  interface QRCode {
    binaryData: number[]
    data: string
    chunks: Array<{ type: string; text?: string; bytes?: number[] }>
    version: number
    location: {
      topRightCorner: Point
      topLeftCorner: Point
      bottomRightCorner: Point
      bottomLeftCorner: Point
      topRightFinderPattern: Point
      topLeftFinderPattern: Point
      bottomLeftFinderPattern: Point
      bottomRightAlignmentPattern?: Point
    }
  }

  interface Point {
    x: number
    y: number
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    providedOptions?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCode | null

  export default jsQR
}
