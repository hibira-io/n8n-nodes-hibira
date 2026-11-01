import type { INodeProperties } from 'n8n-workflow';

export const approvalOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['approval'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the status and answer of an approval request',
				action: 'Get an approval',
			},
			{
				name: 'Request',
				value: 'request',
				description:
					'Ask a person to approve or choose through a Hibira-hosted link, and optionally wait for the answer',
				action: 'Request an approval',
			},
		],
		default: 'request',
	},
];

export const approvalFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Refund order #1042 for $89?',
		description: 'What needs a decision, as a short question (at most 200 characters)',
		displayOptions: { show: { resource: ['approval'], operation: ['request'] } },
	},
	{
		displayName: 'Options',
		name: 'choices',
		type: 'string',
		default: 'Approve, Reject',
		description:
			'2 to 4 choices, separated by commas. The first one approves; any other rejects. Write them in the person’s language.',
		displayOptions: { show: { resource: ['approval'], operation: ['request'] } },
	},
	{
		displayName: 'Wait for Answer',
		name: 'waitForAnswer',
		type: 'boolean',
		default: true,
		description:
			'Whether to keep the workflow at this node until the person answers or the time below runs out',
		displayOptions: { show: { resource: ['approval'], operation: ['request'] } },
	},
	{
		displayName: 'Max Wait (Minutes)',
		name: 'maxWaitMinutes',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 60 },
		default: 10,
		description:
			'Stop waiting after this long and output the request as still pending. For longer waits, send the link, then check later with Get.',
		displayOptions: {
			show: { resource: ['approval'], operation: ['request'], waitForAnswer: [true] },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['approval'], operation: ['request'] } },
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'private-hibira-approvals.ops',
				description:
					'Channel to announce the request and its answer on, for the @hibira-io/approvals inbox components',
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Context shown to the person: what will happen and why (at most 4000 characters)',
			},
			{
				displayName: 'Expires In (Minutes)',
				name: 'expiresInMinutes',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 10080 },
				default: 60,
				description: 'How long the link can be answered (at most 7 days)',
			},
			{
				displayName: 'Push to Interests',
				name: 'pushInterests',
				type: 'string',
				default: '',
				description:
					'Send the link as a push notification to these interests, separated by commas (the app needs Push enabled)',
			},
			{
				displayName: 'Push to User IDs',
				name: 'pushUsers',
				type: 'string',
				default: '',
				description: 'Send the link as a push notification to these user IDs instead of interests',
			},
			{
				displayName: 'Requester Name',
				name: 'agent',
				type: 'string',
				default: 'n8n',
				description: 'Who is asking, shown in the approvals inbox',
			},
		],
	},
	{
		displayName: 'Approval ID',
		name: 'approvalId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'apr_...',
		description: 'The approval_id output by Request',
		displayOptions: { show: { resource: ['approval'], operation: ['get'] } },
	},
	{
		displayName: 'Wait for Answer',
		name: 'waitForAnswer',
		type: 'boolean',
		default: false,
		description:
			'Whether to keep the workflow at this node until the person answers or the time below runs out',
		displayOptions: { show: { resource: ['approval'], operation: ['get'] } },
	},
	{
		displayName: 'Max Wait (Minutes)',
		name: 'maxWaitMinutes',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 60 },
		default: 10,
		description:
			'Stop waiting after this long and output the request as still pending. For longer waits, send the link, then check later with Get.',
		displayOptions: {
			show: { resource: ['approval'], operation: ['get'], waitForAnswer: [true] },
		},
	},
];
