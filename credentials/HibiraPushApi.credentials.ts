import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class HibiraPushApi implements ICredentialType {
	name = 'hibiraPushApi';

	displayName = 'Hibira Push API';

	icon: Icon = {
		light: 'file:../nodes/Hibira/hibira.svg',
		dark: 'file:../nodes/Hibira/hibira.dark.svg',
	};

	documentationUrl = 'https://github.com/hibira-io/n8n-nodes-hibira#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Instance ID',
			name: 'instanceId',
			type: 'string',
			default: '',
			required: true,
			description: 'Shown in the Push section of the app page in the Hibira portal',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
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
				'The Hibira Push endpoint. Change it only for a self-hosted cluster or another Beams-compatible server.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.secretKey}}',
			},
		},
	};

	// Deleting a user ID that never had devices changes nothing and answers
	// 200 only for a valid secret key.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '=/customer_api/v1/instances/{{$credentials.instanceId}}/users/n8n-credential-check',
			method: 'DELETE',
		},
	};
}
