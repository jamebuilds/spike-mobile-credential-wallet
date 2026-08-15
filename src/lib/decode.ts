import { decode as cborDecode, Tag } from "cbor-x";
import { base64UrlToBytes } from "./crypto";

export interface MdocClaim {
  namespace: string;
  elementIdentifier: string;
  elementValue: string;
}

export interface DecodedMdoc {
  doctype?: string;
  claims: MdocClaim[];
}

function displayValue(value: unknown): string {
  if (value instanceof Tag) return displayValue(value.value);
  if (value instanceof Uint8Array) return `<bytes, ${value.length}>`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return displayValue(Object.fromEntries(value));
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

/**
 * Display-only decoding of an OID4VCI mso_mdoc credential: a base64url-encoded
 * CBOR IssuerSigned structure (ISO 18013-5). No signature/COSE verification.
 */
export function decodeMdoc(credential: string): DecodedMdoc {
  const issuerSigned = toPlain(cborDecode(base64UrlToBytes(credential))) as {
    nameSpaces?: Record<string, unknown[]>;
    issuerAuth?: unknown[];
  };

  const claims: MdocClaim[] = [];
  for (const [namespace, items] of Object.entries(issuerSigned.nameSpaces ?? {})) {
    for (const item of items) {
      // Each item is Tag 24 (encoded CBOR data item) wrapping an IssuerSignedItem
      const bytes = item instanceof Tag ? (item.value as Uint8Array) : (item as Uint8Array);
      const signedItem = toPlain(cborDecode(bytes)) as {
        elementIdentifier: string;
        elementValue: unknown;
      };
      claims.push({
        namespace,
        elementIdentifier: signedItem.elementIdentifier,
        elementValue: displayValue(signedItem.elementValue),
      });
    }
  }

  return { doctype: extractDoctype(issuerSigned.issuerAuth), claims };
}

/**
 * Best-effort docType extraction from the Mobile Security Object inside
 * issuerAuth (COSE_Sign1 = [protected, unprotected, payload, signature]).
 */
function extractDoctype(issuerAuth: unknown[] | undefined): string | undefined {
  try {
    const payload = issuerAuth?.[2];
    if (!(payload instanceof Uint8Array)) return undefined;
    let mso = toPlain(cborDecode(payload));
    if (mso instanceof Tag) mso = toPlain(cborDecode(mso.value as Uint8Array));
    return (mso as { docType?: string }).docType;
  } catch {
    return undefined;
  }
}

function toPlain(value: unknown): unknown {
  return value instanceof Map ? Object.fromEntries(value) : value;
}
