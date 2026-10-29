import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { channelFields, channelOperations } from './descriptions/ChannelDescription';
import { eventFields, eventOperations } from './descriptions/EventDescription';
import { notificationFields, notificationOperations } from './descriptions/NotificationDescription';
import { userFields, userOperations } from './descriptions/UserDescription';
import { hibiraApiRequest, hibiraPushRequest, splitList } from './GenericFunctions';

// Programmatic rather than declarative: every Channels request carries an
// HMAC signature over its exact body, event data is sent as JSON text,
// channel lists come back as a map to turn into items, presence users page
// with a cursor, and push payloads are built per platform.

function parseJson(ctx: IExecuteFunctions, value: unknown, field: string, i: number): unknown {
	if (typeof value !== 'string') return value;
	if (value.trim() === '') return undefined;
	try {
		return JSON.parse(value);
	} catch {
		throw new NodeOperationError(ctx.getNode(), `${field} must be valid JSON`, { itemIndex: i });
	}
}

function notificationPayload(ctx: IExecuteFunctions, i: number): IDataObject {
	if (ctx.getNodeParameter('payloadMode', i) === 'json') {
		const payload = parseJson(ctx, ctx.getNodeParameter('payloadJson', i), 'Payload JSON', i);
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			throw new NodeOperationError(ctx.getNode(), 'Payload JSON must be an object', {
				itemIndex: i,
			});
		}
		return payload as IDataObject;
	}
	const title = ctx.getNodeParameter('title', i) as string;
	const body = ctx.getNodeParameter('body', i, '') as string;
	const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
	const platforms = (options.platforms as string[] | undefined) ?? ['apns', 'fcm', 'web'];
	const data = parseJson(ctx, options.data, 'Data', i) as IDataObject | undefined;
	const extra = data && Object.keys(data).length > 0 ? { data } : {};
	const payload: IDataObject = {};
	if (platforms.includes('apns')) payload.apns = { aps: { alert: { title, body } }, ...extra };
	if (platforms.includes('fcm')) payload.fcm = { notification: { title, body }, ...extra };
	if (platforms.includes('web')) {
		const notification: IDataObject = { title, body };
		if (options.deepLink) notification.deep_link = options.deepLink;
		payload.web = { notification, ...extra };
	}
	if (Object.keys(payload).length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Choose at least one platform', { itemIndex: i });
	}
	return payload;
}

export class Hibira implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hibira',
		name: 'hibira',
		icon: { light: 'file:hibira.svg', dark: 'file:hibira.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Publish realtime events and push notifications with Hibira (Pusher-compatible)',
		defaults: {
			name: 'Hibira',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hibiraApi',
				required: true,
				displayOptions: { show: { resource: ['event', 'channel', 'user'] } },
			},
			{
				name: 'hibiraPushApi',
				required: true,
				displayOptions: { show: { resource: ['notification'] } },
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Channel', value: 'channel' },
					{ name: 'Event', value: 'event' },
					{ name: 'Push Notification', value: 'notification' },
					{ name: 'User', value: 'user' },
				],
				default: 'event',
			},
			...eventOperations,
			...eventFields,
			...channelOperations,
			...channelFields,
			...userOperations,
			...userFields,
			...notificationOperations,
			...notificationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let results: IDataObject[] = [];

				if (resource === 'event' && operation === 'trigger') {
					const channels = splitList(this.getNodeParameter('channels', i) as string);
					if (channels.length === 0) {
						throw new NodeOperationError(this.getNode(), 'Enter at least one channel', {
							itemIndex: i,
						});
					}
					const raw = this.getNodeParameter('data', i, '');
					const data = typeof raw === 'string' ? raw : JSON.stringify(raw);
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const body: IDataObject = { name: this.getNodeParameter('eventName', i), channels, data };
					if (options.socketId) body.socket_id = options.socketId;
					const info = (options.info as string[] | undefined) ?? [];
					if (info.length > 0) body.info = info.join(',');
					const response = await hibiraApiRequest.call(this, 'POST', '/events', body);
					results = [{ channels, ...response }];
				} else if (resource === 'channel' && operation === 'getAll') {
					const qs: IDataObject = {};
					const prefix = this.getNodeParameter('prefix', i, '') as string;
					const info = this.getNodeParameter('info', i, []) as string[];
					if (prefix) qs.filter_by_prefix = prefix;
					if (info.length > 0) qs.info = info.join(',');
					const response = await hibiraApiRequest.call(this, 'GET', '/channels', undefined, qs);
					const channels = (response.channels ?? {}) as Record<string, IDataObject>;
					results = Object.keys(channels)
						.sort()
						.map((name) => ({ name, ...channels[name] }));
					if (!this.getNodeParameter('returnAll', i)) {
						results = results.slice(0, this.getNodeParameter('limit', i) as number);
					}
				} else if (resource === 'channel' && operation === 'get') {
					const name = this.getNodeParameter('channel', i) as string;
					const info = this.getNodeParameter('info', i, []) as string[];
					const qs: IDataObject = info.length > 0 ? { info: info.join(',') } : {};
					const response = await hibiraApiRequest.call(
						this,
						'GET',
						`/channels/${encodeURIComponent(name)}`,
						undefined,
						qs,
					);
					results = [{ name, ...response }];
				} else if (resource === 'channel' && operation === 'getUsers') {
					const name = this.getNodeParameter('channel', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
					let cursor: string | undefined;
					do {
						const qs: IDataObject = name.startsWith('presence-large-') ? { limit: 1000 } : {};
						if (cursor) qs.cursor = cursor;
						const response = await hibiraApiRequest.call(
							this,
							'GET',
							`/channels/${encodeURIComponent(name)}/users`,
							undefined,
							qs,
						);
						results.push(...((response.users ?? []) as IDataObject[]));
						cursor = response.next_cursor as string | undefined;
					} while (cursor && results.length < limit);
					results = results.slice(0, limit);
				} else if (resource === 'user' && operation === 'terminateConnections') {
					const userId = this.getNodeParameter('userId', i) as string;
					await hibiraApiRequest.call(
						this,
						'POST',
						`/users/${encodeURIComponent(userId)}/terminate_connections`,
						{},
					);
					results = [{ userId, success: true }];
				} else if (resource === 'notification' && operation === 'publishToInterests') {
					const interests = splitList(this.getNodeParameter('interests', i) as string);
					const body = { ...notificationPayload(this, i), interests };
					results = [
						await hibiraPushRequest.call(
							this,
							'POST',
							'/publish_api/v1/instances/{instance}/publishes/interests',
							body,
						),
					];
				} else if (resource === 'notification' && operation === 'publishToUsers') {
					const users = splitList(this.getNodeParameter('userIds', i) as string);
					const body = { ...notificationPayload(this, i), users };
					results = [
						await hibiraPushRequest.call(
							this,
							'POST',
							'/publish_api/v1/instances/{instance}/publishes/users',
							body,
						),
					];
				} else if (resource === 'notification' && operation === 'deleteUser') {
					const userId = this.getNodeParameter('userId', i) as string;
					await hibiraPushRequest.call(
						this,
						'DELETE',
						`/customer_api/v1/instances/{instance}/users/${encodeURIComponent(userId)}`,
					);
					results = [{ userId, success: true }];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation ${operation} for ${resource}`,
						{
							itemIndex: i,
						},
					);
				}

				returnData.push(...results.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
