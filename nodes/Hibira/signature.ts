import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

/** Hex HMAC-SHA256 of data keyed with secret. */
export function hmacHex(secret: string, data: string | Buffer): string {
	return createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time comparison of two hex signatures. */
export function signatureMatches(expected: string, given: string | undefined): boolean {
	if (!given || given.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(given.toLowerCase()));
}

function requestPath(options: IHttpRequestOptions): string {
	const base = (options.baseURL ?? '').replace(/\/$/, '');
	return new URL(base + options.url, 'http://placeholder').pathname;
}

/**
 * Signs a request for the Pusher-compatible HTTP API: the auth_* query
 * parameters and an HMAC-SHA256 of "METHOD\nPATH\nsorted query" with the
 * app secret. A JSON body is serialized here so that body_md5 covers the
 * exact bytes sent.
 */
export function signRequest(
	key: string,
	secret: string,
	options: IHttpRequestOptions,
	now: number = Date.now(),
): IHttpRequestOptions {
	const method = (options.method ?? 'GET').toUpperCase();
	const qs: IDataObject = { ...(options.qs ?? {}) };
	qs.auth_key = key;
	qs.auth_timestamp = Math.floor(now / 1000).toString();
	qs.auth_version = '1.0';
	delete qs.auth_signature;

	let body = options.body;
	const headers = { ...(options.headers ?? {}) };
	if (body !== undefined && body !== null && body !== '') {
		if (typeof body !== 'string') body = JSON.stringify(body);
		qs.body_md5 = createHash('md5')
			.update(body as string)
			.digest('hex');
		headers['Content-Type'] = 'application/json';
	} else {
		body = undefined;
	}

	const canonical = Object.keys(qs)
		.map((k) => [k.toLowerCase(), String(qs[k])] as const)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([k, v]) => `${k}=${v}`)
		.join('&');
	qs.auth_signature = hmacHex(secret, `${method}\n${requestPath(options)}\n${canonical}`);

	return { ...options, method: options.method, qs, body, headers, json: true };
}
