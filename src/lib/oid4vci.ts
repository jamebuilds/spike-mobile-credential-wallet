import { preAuthorizedCodeGrantIdentifier } from "@openid4vc/oauth2";
import {
  Openid4vciClient,
  type CredentialOfferObject,
  type CredentialOfferPreAuthorizedCodeGrantTxCode,
  type IssuerMetadataResult,
} from "@openid4vc/openid4vci";
import { callbacks, holderKey } from "./callbacks";
import { decodeMdoc, type DecodedMdoc } from "./decode";

export type StepName =
  | "Credential offer"
  | "Issuer metadata"
  | "Token request"
  | "Nonce"
  | "Proof JWT"
  | "Credential request";

export type OnStep = (name: StepName, detail: unknown) => void;

const client = new Openid4vciClient({ callbacks });

export interface OfferedMdocConfiguration {
  id: string;
  doctype?: string;
  displayName?: string;
}

export interface ResolvedOffer {
  offer: CredentialOfferObject;
  issuerMetadata: IssuerMetadataResult;
  mdocConfigurations: OfferedMdocConfiguration[];
  txCode?: CredentialOfferPreAuthorizedCodeGrantTxCode;
}

/**
 * Phase A of the pre-authorized code flow: resolve the offer and the issuer
 * metadata, then pause so the user can pick a credential / enter the PIN.
 */
export async function resolveOffer(offerUri: string, onStep: OnStep): Promise<ResolvedOffer> {
  const offer = await client.resolveCredentialOffer(offerUri);
  onStep("Credential offer", offer);

  const grant = offer.grants?.[preAuthorizedCodeGrantIdentifier];
  if (!grant) {
    throw new Error(
      "This offer has no pre-authorized code grant (only the pre-authorized flow is implemented)",
    );
  }

  const issuerMetadata = await client.resolveIssuerMetadata(offer.credential_issuer);
  onStep("Issuer metadata", {
    originalDraftVersion: issuerMetadata.originalDraftVersion,
    credential_issuer: issuerMetadata.credentialIssuer.credential_issuer,
    nonce_endpoint: issuerMetadata.credentialIssuer.nonce_endpoint,
    credential_endpoint: issuerMetadata.credentialIssuer.credential_endpoint,
    offered_configurations: offer.credential_configuration_ids,
  });

  const mdocConfigurations = offer.credential_configuration_ids.flatMap((id) => {
    const configuration = issuerMetadata.knownCredentialConfigurations[id];
    if (configuration?.format !== "mso_mdoc") return [];
    return [
      {
        id,
        doctype: configuration.doctype,
        displayName: (configuration.display as { name?: string }[] | undefined)?.[0]?.name,
      },
    ];
  });

  return { offer, issuerMetadata, mdocConfigurations, txCode: grant.tx_code };
}

export interface ReceivedCredential {
  credentialConfigurationId: string;
  rawCredential: string;
  decoded: DecodedMdoc;
  receivedAt: Date;
}

/**
 * Phase B: token request → nonce → key-binding proof → credential request.
 */
export async function requestCredential(options: {
  offer: CredentialOfferObject;
  issuerMetadata: IssuerMetadataResult;
  credentialConfigurationId: string;
  txCode?: string;
  onStep: OnStep;
}): Promise<ReceivedCredential> {
  const { offer, issuerMetadata, credentialConfigurationId, txCode, onStep } = options;

  const { accessTokenResponse, authorizationServer } =
    await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
      credentialOffer: offer,
      issuerMetadata,
      txCode,
    });
  onStep("Token request", { authorizationServer, ...accessTokenResponse });

  // OID4VCI 1.0 provides c_nonce via a dedicated nonce endpoint; older drafts
  // returned it in the token response.
  const nonce = issuerMetadata.credentialIssuer.nonce_endpoint
    ? (await client.requestNonce({ issuerMetadata })).c_nonce
    : (accessTokenResponse.c_nonce as string | undefined);
  onStep("Nonce", { c_nonce: nonce ?? "(none — issuer did not provide a nonce)" });

  const { jwt: proofJwt } = await client.createCredentialRequestJwtProof({
    issuerMetadata,
    credentialConfigurationId,
    signer: { method: "jwk", publicJwk: holderKey.publicJwk, alg: "ES256" },
    nonce,
  });
  onStep("Proof JWT", { jwt: proofJwt });

  const { credentialResponse } = await client.retrieveCredentials({
    issuerMetadata,
    credentialConfigurationId,
    accessToken: accessTokenResponse.access_token,
    proofs: { jwt: [proofJwt] },
  });
  onStep("Credential request", credentialResponse);

  const rawCredential = extractFirstCredential(credentialResponse);
  return {
    credentialConfigurationId,
    rawCredential,
    decoded: decodeMdoc(rawCredential),
    receivedAt: new Date(),
  };
}

function extractFirstCredential(credentialResponse: {
  credentials?: ({ credential: unknown } | unknown)[];
  credential?: unknown;
}): string {
  // 1.0 shape: credentials: [{ credential }]; draft shapes: credentials: [string] or credential
  const first = credentialResponse.credentials?.[0] ?? credentialResponse.credential;
  const credential =
    typeof first === "object" && first !== null && "credential" in first
      ? (first as { credential: unknown }).credential
      : first;
  if (typeof credential !== "string") {
    throw new Error("Credential response did not contain a string (mdoc) credential");
  }
  return credential;
}
