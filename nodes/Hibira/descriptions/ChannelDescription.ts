import type { INodeProperties } from 'n8n-workflow';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['channel'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the state of a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List occupied channels',
				action: 'Get many channels',
			},
			{
				name: 'Get Users',
				value: 'getUsers',
				description: 'List the users on a presence channel',
				action: 'Get users of a presence channel',
			},
		],
		default: 'getAll',
	},
];

export const channelFields: INodeProperties[] = [
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'presence-room-1',
		displayOptions: { show: { resource: ['channel'], operation: ['get', 'getUsers'] } },
	},
	{
		displayName: 'Info',
		name: 'info',
		type: 'multiOptions',
		options: [
			{ name: 'Subscription Count', value: 'subscription_count' },
			{ name: 'User Count', value: 'user_count', description: 'Presence channels only' },
		],
		default: [],
		description: 'Attributes to return for the channel',
		displayOptions: { show: { resource: ['channel'], operation: ['get', 'getAll'] } },
	},
	{
		displayName: 'Filter by Prefix',
		name: 'prefix',
		type: 'string',
		default: '',
		placeholder: 'presence-',
		description: 'Only return channels whose name starts with this text',
		displayOptions: { show: { resource: ['channel'], operation: ['getAll'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['channel'], operation: ['getAll', 'getUsers'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['channel'], operation: ['getAll', 'getUsers'], returnAll: [false] },
		},
	},
];
