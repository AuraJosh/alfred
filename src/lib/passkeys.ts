/**
 * Utility for handling WebAuthn (Passkeys) for local biometric locking.
 * This helper simplifies the complex ArrayBuffer/Binary conversions required 
 * for the navigator.credentials API.
 */

export const isPasskeySupported = (): boolean => {
    return !!(window.PublicKeyCredential &&
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
};

export async function createPasskey(userId: string, userName: string) {
    if (!isPasskeySupported()) throw new Error("Passkeys not supported on this device");

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userHandle = new TextEncoder().encode(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: "Alfred",
            id: window.location.hostname,
        },
        user: {
            id: userHandle,
            name: userName,
            displayName: userName,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required"
        }
    };

    const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
    }) as any;

    return {
        id: credential.id,
        rawId: b64encode(credential.rawId)
    };
}

export async function verifyPasskey() {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const options: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
    };

    const assertion = await navigator.credentials.get({
        publicKey: options
    }) as any;

    return assertion;
}

// Helpers for encoding
function b64encode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
