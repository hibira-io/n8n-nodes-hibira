import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ show: { resource: ['waitingRoom'], operation } });

export const waitingRoomOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['waitingRoom'] } },
		options: [
			{
				name: 'Admit',
				value: 'admit',
				description: 'Let the next visitors in the queue through now',
				action: 'Admit visitors from a waiting room',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a waiting room',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a waiting room and its queue',
				action: 'Delete a waiting room',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the settings and queue counts of a waiting room',
				action: 'Get a waiting room',
			},
			{
				name: 'Verify Pass',
				value: 'verifyPass',
				description: 'Check a pass a visitor brought back from the waiting room',
				action: 'Verify a waiting room pass',
			},
		],
		default: 'get',
	},
];

export const waitingRoomFields: INodeProperties[] = [
	{
		displayName: 'Room',
		name: 'room',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'presale',
		description: "The waiting room's name: 1 to 64 letters, digits, '-' or '_'",
		displayOptions: { show: { resource: ['waitingRoom'] } },
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		required: true,
		typeOptions: { minValue: 1 },
		default: 100,
		description: 'How many visitors to admit, on top of the steady rate',
		displayOptions: show(['admit']),
	},
	{
		displayName: 'Pass',
		name: 'pass',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		description:
			'The hibira_pass query parameter or the hibira_wr_&lt;room&gt; cookie value. The output has valid: true and the queue number when the pass is good.',
		displayOptions: show(['verifyPass']),
	},
	{
		displayName: 'Admit per Minute',
		name: 'admitPerMinute',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description:
			'How many visitors to let through each minute. Needed when the room is created; 0 keeps the current rate of an existing room.',
		displayOptions: show(['upsert']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['upsert']),
		options: [
			{
				displayName: 'Burst',
				name: 'burst',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'How many visitors may be admitted at once when the queue starts moving',
			},
			{
				displayName: 'Pass Lifetime (Seconds)',
				name: 'passTtlSeconds',
				type: 'number',
				typeOptions: { minValue: 60, maxValue: 86400 },
				default: 1800,
				description: 'How long an admitted visitor stays in before they have to queue again',
			},
			{
				displayName: 'Return URLs',
				name: 'returnUrls',
				type: 'string',
				default: '',
				placeholder: 'https://shop.example.com/drop',
				description:
					'Comma-separated https addresses visitors may be sent back to (http only for localhost). Up to 10.',
			},
			{
				displayName: 'Starts At',
				name: 'startsAt',
				type: 'dateTime',
				default: '',
				description: 'When admission starts. Visitors can join the queue before then.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open', description: 'Visitors join and are admitted' },
					{ name: 'Paused', value: 'paused', description: 'Visitors join but nobody is admitted' },
					{ name: 'Closed', value: 'closed', description: 'Nobody can join' },
				],
				default: 'open',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Shown on the waiting page. Up to 120 characters.',
			},
		],
	},
];
