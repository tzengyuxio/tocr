/**
 * edtf.js ships no TypeScript declarations. Only the parts used by
 * lib/edtf.ts are declared here.
 */
declare module "edtf" {
  interface EdtfValue {
    type: string;
    /** Start of the range the value covers, as a timestamp. */
    min: number;
    /** End of the range the value covers, as a timestamp. */
    max: number;
    edtf: string;
  }

  /** Throws when the value is not valid EDTF. */
  export default function edtf(value: string): EdtfValue;
}
