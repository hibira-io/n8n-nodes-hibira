import type { INodeProperties } from 'n8n-workflow';

const publish = { resource: ['notification'], operation: ['publishToInterests', 'publishToUsers'] };

export const notificationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['notification'] } },
		options: [
			{
				name: 'Delete User',
				value: 'deleteUser',
				description: 'Remove a user and all of their devices from push',
				action: 'Delete a push user',
			},
			{
				name: 'Publish to Interests',
				value: 'publishToInterests',
				description: 'Send a notification to devices subscribed to interests',
				action: 'Publish a notification to interests',
			},
			{
				name: 'Publish to Users',
				value: 'publishToUsers',
				description: 'Send a notification to the devices of users',
				action: 'Publish a notification to users',
			},
		],
		default: 'publishToInterests',
	},
];

export const notificationFields: INodeProperties[] = [
	{
		displayName: 'Interests',
		name: 'interests',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'news, promo-tw',
		description: 'Interest names, separated by commas (up to 100)',
		displayOptions: { show: { resource: ['notification'], operation: ['publishToInterests'] } },
	},
	{
		displayName: 'User IDs',
		name: 'userIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'user-1, user-2',
		description: 'User IDs, separated by commas (up to 1000)',
		displayOptions: { show: { resource: ['notification'], operation: ['publishToUsers'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['notification'], operation: ['deleteUser'] } },
	},
	{
		displayName: 'Payload',
		name: 'payloadMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Simple', value: 'simple', description: 'Title, body and link for every platform' },
			{ name: 'JSON', value: 'json', description: 'Your own apns, fcm and web payloads' },
		],
		default: 'simple',
		displayOptions: { show: publish },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...publish, payloadMode: ['simple'] } },
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { ...publish, payloadMode: ['simple'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...publish, payloadMode: ['simple'] } },
		options: [
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				default: '{}',
				description: 'Extra key-value data delivered to the app with the notification',
			},
			{
				displayName: 'Link',
				name: 'deepLink',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/orders/1042',
				description: 'Page that opens when a browser notification is clicked',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: [
					{ name: 'Android (FCM)', value: 'fcm' },
					{ name: 'iOS (APNs)', value: 'apns' },
					{ name: 'Web', value: 'web' },
				],
				default: ['apns', 'fcm', 'web'],
			},
		],
	},
	{
		displayName: 'Payload JSON',
		name: 'payloadJson',
		type: 'json',
		required: true,
		default:
			'{\n  "apns": { "aps": { "alert": { "title": "", "body": "" } } },\n  "fcm": { "notification": { "title": "", "body": "" } },\n  "web": { "notification": { "title": "", "body": "" } }\n}',
		description: 'The Beams-compatible publish body without interests or users',
		displayOptions: { show: { ...publish, payloadMode: ['json'] } },
	},
];
