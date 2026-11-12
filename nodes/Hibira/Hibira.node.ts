import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { approvalFields, approvalOperations } from './descriptions/ApprovalDescription';
import { channelFields, channelOperations } from './descriptions/ChannelDescription';
import { chartFields, eventFields, eventOperations } from './descriptions/EventDescription';
import { notificationFields, notificationOperations } from './descriptions/NotificationDescription';
import { userFields, userOperations } from './descriptions/UserDescription';
import { waitingRoomFields, waitingRoomOperations } from './descriptions/WaitingRoomDescription';
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

// chartData builds a live chart update (the chart.update event the Hibira
// MCP server's live chart panel reads): one of value, add or values, plus
// the optional goal, title, subtitle and status.
function chartData(ctx: IExecuteFunctions, i: number): IDataObject {
	const update = ctx.getNodeParameter('chartUpdate', i) as string;
	const data: IDataObject = {};
	if (update === 'reset') {
		data.reset = true;
	} else if (update === 'values') {
		const rows = (ctx.getNodeParameter('chartValues.items', i, []) as IDataObject[]) ?? [];
		const values: IDataObject = {};
		for (const row of rows) {
			const label = String(row.label ?? '').trim();
			if (label) values[label] = Number(row.value);
		}
		if (Object.keys(values).length === 0) {
			throw new NodeOperationError(ctx.getNode(), 'Add at least one label', { itemIndex: i });
		}
		data.values = values;
	} else {
		const value = ctx.getNodeParameter('chartValue', i) as number;
		if (!Number.isFinite(value)) {
			throw new NodeOperationError(ctx.getNode(), 'Number must be a number', { itemIndex: i });
		}
		if (update === 'addLabel') {
			const label = (ctx.getNodeParameter('chartLabel', i) as string).trim();
			if (!label) {
				throw new NodeOperationError(ctx.getNode(), 'Enter a label', { itemIndex: i });
			}
			data.add = { [label]: value };
		} else {
			data[update] = value;
		}
	}
	const options = ctx.getNodeParameter('chartOptions', i, {}) as IDataObject;
	if (options.max !== undefined) data.max = options.max;
	for (const key of ['title', 'subtitle', 'status']) {
		if (options[key]) data[key] = options[key];
	}
	return data;
}

// waitForApproval long-polls the approval (25 s per request, so no timers
// are needed) until it is answered or expires, or Max Wait runs out. The
// output keeps the answer link from the request.
function waitingRoomBody(ctx: IExecuteFunctions, i: number): IDataObject {
	const body: IDataObject = {};
	const rate = ctx.getNodeParameter('admitPerMinute', i, 0) as number;
	if (rate > 0) body.admit_per_minute = rate;
	const fields = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;
	if (fields.state) body.state = fields.state;
	if (fields.title !== undefined) body.title = fields.title;
	if (fields.burst) body.burst = fields.burst;
	if (fields.passTtlSeconds) body.pass_ttl_seconds = fields.passTtlSeconds;
	if (fields.returnUrls !== undefined) body.return_urls = splitList(fields.returnUrls as string);
	if (fields.startsAt !== undefined) {
		const at = String(fields.startsAt);
		const time = new Date(at);
		if (at !== '' && Number.isNaN(time.getTime())) {
			throw new NodeOperationError(ctx.getNode(), 'Starts At must be a date and time', {
				itemIndex: i,
			});
		}
		body.starts_at = at === '' ? '' : time.toISOString().replace(/\.\d{3}Z$/, 'Z');
	}
	return body;
}

async function waitForApproval(
	ctx: IExecuteFunctions,
	i: number,
	approval: IDataObject,
): Promise<IDataObject> {
	if (!ctx.getNodeParameter('waitForAnswer', i, false)) return approval;
	const deadline = Date.now() + (ctx.getNodeParameter('maxWaitMinutes', i, 10) as number) * 60_000;
	let current = approval;
	while (current.status === 'pending') {
		const left = Math.floor((deadline - Date.now()) / 1000);
		if (left <= 0) break;
		const next = await hibiraApiRequest.call(
			ctx,
			'GET',
			`/approvals/${encodeURIComponent(String(approval.approval_id))}`,
			undefined,
			{ wait: Math.min(25, left) },
			{ timeout: 40_000 },
		);
		current = { ...next, url: approval.url };
	}
	if (current.url === undefined) delete current.url;
	return current;
}

export class Hibira implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hibira',
		name: 'hibira',
		icon: { light: 'file:hibira.svg', dark: 'file:hibira.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Publish realtime events and push notifications, and ask people for approval, with Hibira (Pusher-compatible)',
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
				displayOptions: {
					show: { resource: ['approval', 'event', 'channel', 'user', 'waitingRoom'] },
				},
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
					{ name: 'Approval', value: 'approval' },
					{ name: 'Channel', value: 'channel' },
					{ name: 'Event', value: 'event' },
					{ name: 'Push Notification', value: 'notification' },
					{ name: 'User', value: 'user' },
					{ name: 'Waiting Room', value: 'waitingRoom' },
				],
				default: 'event',
			},
			...approvalOperations,
			...approvalFields,
			...eventOperations,
			...eventFields,
			...chartFields,
			...channelOperations,
			...channelFields,
			...userOperations,
			...userFields,
			...notificationOperations,
			...notificationFields,
			...waitingRoomOperations,
			...waitingRoomFields,
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
				} else if (resource === 'event' && operation === 'updateChart') {
					const channel = (this.getNodeParameter('chartChannel', i) as string).trim();
					if (!channel.startsWith('private-')) {
						throw new NodeOperationError(
							this.getNode(),
							'A live chart listens on a private channel, such as private-chart-3f9a1c2b7d4e',
							{ itemIndex: i },
						);
					}
					const data = chartData(this, i);
					const options = this.getNodeParameter('chartOptions', i, {}) as IDataObject;
					const body: IDataObject = {
						name: (options.eventName as string) || 'chart.update',
						channels: [channel],
						data: JSON.stringify(data),
					};
					const response = await hibiraApiRequest.call(this, 'POST', '/events', body);
					results = [{ channel, data, ...response }];
				} else if (resource === 'approval' && operation === 'request') {
					const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						options: splitList(this.getNodeParameter('choices', i, '') as string),
						agent: (extra.agent as string) || 'n8n',
					};
					if (extra.details) body.details = extra.details;
					if (extra.expiresInMinutes) body.expires_in_minutes = extra.expiresInMinutes;
					if (extra.channel) body.channel = extra.channel;
					if (extra.pushInterests) body.push_interests = splitList(extra.pushInterests as string);
					if (extra.pushUsers) body.push_users = splitList(extra.pushUsers as string);
					if ((body.options as string[]).length === 0) delete body.options;
					const created = await hibiraApiRequest.call(this, 'POST', '/approvals', body);
					results = [await waitForApproval(this, i, created)];
				} else if (resource === 'approval' && operation === 'get') {
					const id = (this.getNodeParameter('approvalId', i) as string).trim();
					const current = await hibiraApiRequest.call(
						this,
						'GET',
						`/approvals/${encodeURIComponent(id)}`,
					);
					results = [await waitForApproval(this, i, current)];
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
				} else if (resource === 'waitingRoom') {
					const room = (this.getNodeParameter('room', i) as string).trim();
					const path = `/waiting_rooms/${encodeURIComponent(room)}`;
					if (operation === 'get') {
						results = [await hibiraApiRequest.call(this, 'GET', path)];
					} else if (operation === 'upsert') {
						results = [await hibiraApiRequest.call(this, 'POST', path, waitingRoomBody(this, i))];
					} else if (operation === 'admit') {
						const count = this.getNodeParameter('count', i) as number;
						results = [await hibiraApiRequest.call(this, 'POST', `${path}/admit`, { count })];
					} else if (operation === 'verifyPass') {
						const pass = (this.getNodeParameter('pass', i) as string).trim();
						results = [
							{ room, ...(await hibiraApiRequest.call(this, 'POST', `${path}/verify`, { pass })) },
						];
					} else if (operation === 'delete') {
						results = [{ room, ...(await hibiraApiRequest.call(this, 'DELETE', path)) }];
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported operation ${operation}`, {
							itemIndex: i,
						});
					}
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
