import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['event'], operation: ['trigger'] };

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['event'] } },
		options: [
			{
				name: 'Trigger',
				value: 'trigger',
				description: 'Publish an event to one or more channels',
				action: 'Trigger an event',
			},
		],
		default: 'trigger',
	},
];

export const eventFields: INodeProperties[] = [
	{
		displayName: 'Channels',
		name: 'channels',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'orders, private-user-42',
		description: 'Channel names, separated by commas (up to 100)',
		displayOptions: { show },
	},
	{
		displayName: 'Event Name',
		name: 'eventName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'order-shipped',
		displayOptions: { show },
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '{}',
		description:
			'The event data. JSON is sent as its text, as the Pusher server libraries do; subscribers receive it parsed.',
		displayOptions: { show },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Exclude Socket ID',
				name: 'socketId',
				type: 'string',
				default: '',
				placeholder: '123.456',
				description:
					'Socket ID of a connection that should not receive the event (usually the sender)',
			},
			{
				displayName: 'Return Channel Info',
				name: 'info',
				type: 'multiOptions',
				options: [
					{ name: 'Subscription Count', value: 'subscription_count' },
					{ name: 'User Count', value: 'user_count' },
				],
				default: [],
				description: 'Attributes of each channel to return with the response',
			},
		],
	},
];
