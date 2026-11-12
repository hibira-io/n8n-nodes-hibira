import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['event'], operation: ['trigger'] };
const chart = { resource: ['event'], operation: ['updateChart'] };

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
			{
				name: 'Update Live Chart',
				value: 'updateChart',
				description:
					'Update a live chart or poll opened through the Hibira MCP server; it redraws at once',
				action: 'Update a live chart',
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

export const chartFields: INodeProperties[] = [
	{
		displayName: 'Channel',
		name: 'chartChannel',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'private-chart-3f9a1c2b7d4e',
		description: 'The private channel the chart listens on, shown when the chart is opened',
		displayOptions: { show: chart },
	},
	{
		displayName: 'Update',
		name: 'chartUpdate',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Add to Label',
				value: 'addLabel',
				description: 'Add to one bar or funnel step, such as one vote or one order in a region',
			},
			{
				name: 'Add to Number',
				value: 'add',
				description: 'Add to a KPI or progress number (use a negative amount to subtract)',
			},
			{
				name: 'Reset',
				value: 'reset',
				description: 'Clear the chart',
			},
			{
				name: 'Set Labels',
				value: 'values',
				description: 'Set bars or funnel steps, or one point per line series',
			},
			{
				name: 'Set Number',
				value: 'value',
				description: 'Set a KPI or progress number, or add a point to a line',
			},
		],
		default: 'value',
		displayOptions: { show: chart },
	},
	{
		displayName: 'Number',
		name: 'chartValue',
		type: 'number',
		default: 0,
		description: 'The number to set or to add',
		displayOptions: { show: { ...chart, chartUpdate: ['value', 'add', 'addLabel'] } },
	},
	{
		displayName: 'Label',
		name: 'chartLabel',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'North',
		description: 'The bar or funnel step to add to; a new label is added at the end',
		displayOptions: { show: { ...chart, chartUpdate: ['addLabel'] } },
	},
	{
		displayName: 'Labels',
		name: 'chartValues',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Label',
		default: {},
		displayOptions: { show: { ...chart, chartUpdate: ['values'] } },
		options: [
			{
				displayName: 'Label',
				name: 'items',
				values: [
					{ displayName: 'Label', name: 'label', type: 'string', default: '' },
					{ displayName: 'Number', name: 'value', type: 'number', default: 0 },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'chartOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: chart },
		options: [
			{
				displayName: 'Event Name',
				name: 'eventName',
				type: 'string',
				default: 'chart.update',
				description: 'Only change this if the chart was opened with another event name',
			},
			{
				displayName: 'Goal',
				name: 'max',
				type: 'number',
				default: 100,
				description: 'The goal of a progress bar, or a fixed top for a line or bar chart',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'A short status line shown on the chart',
			},
			{
				displayName: 'Subtitle',
				name: 'subtitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
];
