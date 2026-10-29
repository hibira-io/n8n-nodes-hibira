import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type Context = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

function baseUrl(url: unknown): string {
	return String(url || 'https://ws.hibira.io').replace(/\/+$/, '');
}

/** Calls the Channels HTTP API of the app in the Hibira API credential. */
export async function hibiraApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('hibiraApi');
	const options: IHttpRequestOptions = {
		method,
		baseURL: baseUrl(credentials.baseUrl),
		url: `/apps/${encodeURIComponent(String(credentials.appId))}${resource}`,
		qs,
		body,
		json: true,
	};
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'hibiraApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** Calls the Beams-compatible push API of the Hibira Push API credential. */
export async function hibiraPushRequest(
	this: Context,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('hibiraPushApi');
	const instance = encodeURIComponent(String(credentials.instanceId));
	const options: IHttpRequestOptions = {
		method,
		baseURL: baseUrl(credentials.baseUrl),
		url: resource.replace('{instance}', instance),
		body,
		json: true,
	};
	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'hibiraPushApi',
			options,
		);
		return (response ?? {}) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** Splits a comma or newline separated list, dropping empty entries. */
export function splitList(value: string | string[]): string[] {
	const list = Array.isArray(value) ? value : String(value).split(/[,\n]/);
	return list.map((s) => String(s).trim()).filter((s) => s !== '');
}
