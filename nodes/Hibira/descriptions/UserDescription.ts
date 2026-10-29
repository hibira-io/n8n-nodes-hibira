import type { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{
				name: 'Terminate Connections',
				value: 'terminateConnections',
				description: "Close all of a signed-in user's connections",
				action: 'Terminate a user s connections',
			},
		],
		default: 'terminateConnections',
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID the user signed in with (pusher:signin)',
		displayOptions: { show: { resource: ['user'], operation: ['terminateConnections'] } },
	},
];
