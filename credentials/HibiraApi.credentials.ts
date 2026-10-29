import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';
import { signRequest } from '../nodes/Hibira/signature';

export class HibiraApi implements ICredentialType {
	name = 'hibiraApi';

	displayName = 'Hibira API';

	icon: Icon = {
		light: 'file:../nodes/Hibira/hibira.svg',
		dark: 'file:../nodes/Hibira/hibira.dark.svg',
	};

	documentationUrl = 'https://github.com/hibira-io/n8n-nodes-hibira#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			required: true,
			description: 'Shown on the app page in the Hibira portal',
		},
		{
			displayName: 'Key',
			name: 'key',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://ws.hibira.io',
			description:
				'The Hibira HTTP API endpoint. Change it only for a self-hosted cluster or another Pusher-compatible server.',
		},
	];

	// Requests are signed like the Pusher HTTP API: auth_key, auth_timestamp,
	// auth_version, body_md5 and an HMAC-SHA256 auth_signature in the query.
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		return signRequest(credentials.key as string, credentials.secret as string, requestOptions);
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '=/apps/{{$credentials.appId}}/channels',
			method: 'GET',
		},
	};
}
