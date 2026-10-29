import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { hibiraApiRequest } from '../Hibira/GenericFunctions';
import { hmacHex, signatureMatches } from '../Hibira/signature';

const EVENTS = [
	{
		name: 'Cache Miss',
		value: 'cache_miss',
		description: 'A client subscribed to a cache channel with nothing cached',
	},
	{
		name: 'Channel Occupied',
		value: 'channel_occupied',
		description: 'A channel got its first subscriber',
	},
	{
		name: 'Channel Vacated',
		value: 'channel_vacated',
		description: 'A channel lost its last subscriber',
	},
	{
		name: 'Chat Message',
		value: 'chat_message',
		description: 'A message was sent with the Chat API',
	},
	{ name: 'Client Event', value: 'client_event', description: 'A client sent a client-* event' },
	{
		name: 'Member Added',
		value: 'member_added',
		description: "A user's first connection joined a presence channel",
	},
	{
		name: 'Member Removed',
		value: 'member_removed',
		description: "A user's last connection left a presence channel",
	},
	{
		name: 'Subscription Count',
		value: 'subscription_count',
		description: "A channel's subscription count changed",
	},
];

interface HookList {
	webhooks?: Array<{ url: string; events?: string[] }>;
}

export class HibiraTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hibira Trigger',
		name: 'hibiraTrigger',
		icon: { light: 'file:../Hibira/hibira.svg', dark: 'file:../Hibira/hibira.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow on Hibira webhooks: channel occupancy, presence, client events and more',
		defaults: {
			name: 'Hibira Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'hibiraApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: EVENTS,
				default: ['channel_occupied', 'channel_vacated'],
				description: 'Webhook events to start the workflow on',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Channel Prefix',
						name: 'channelPrefix',
						type: 'string',
						default: '',
						placeholder: 'presence-',
						description: 'Only start on events of channels whose name starts with this text',
					},
					{
						displayName: 'Split Into Items',
						name: 'split',
						type: 'boolean',
						default: true,
						description:
							'Whether to output one item per event. Hibira batches events for up to a second; turn this off to get each batch as one item.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const response = (await hibiraApiRequest.call(this, 'GET', '/webhooks')) as HookList;
				const hook = (response.webhooks ?? []).find((h) => h.url === url);
				// Registered with other event types: create() replaces them.
				return !!hook && [...(hook.events ?? [])].sort().join() === [...events].sort().join();
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				await hibiraApiRequest.call(this, 'POST', '/webhooks', { url, events });
				this.getWorkflowStaticData('node').webhookUrl = url;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const url =
					(staticData.webhookUrl as string | undefined) ?? this.getNodeWebhookUrl('default');
				try {
					await hibiraApiRequest.call(this, 'DELETE', '/webhooks', undefined, { url });
				} catch (error) {
					// Already removed in the portal: nothing left to clean up.
					if ((error as { httpCode?: string }).httpCode !== '404') return false;
				}
				delete staticData.webhookUrl;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const credentials = await this.getCredentials('hibiraApi');
		const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
		const res = this.getResponseObject();

		// Hibira signs the raw body with the app secret. During a secret
		// rotation X-Hibira-Previous-Signature carries the HMAC made with the
		// previous secret, so a credential not yet updated still verifies.
		const expected = raw ? hmacHex(credentials.secret as string, raw) : '';
		const verified =
			!!raw &&
			req.header('x-pusher-key') === credentials.key &&
			(signatureMatches(expected, req.header('x-pusher-signature')) ||
				signatureMatches(expected, req.header('x-hibira-previous-signature')));
		if (!verified) {
			res.status(401).json({ error: 'invalid webhook signature' });
			return { noWebhookResponse: true };
		}

		const events = this.getNodeParameter('events') as string[];
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const prefix = (options.channelPrefix as string | undefined) ?? '';
		const body = this.getBodyData() as IDataObject;
		const matched = ((body.events ?? []) as IDataObject[]).filter(
			(e) => events.includes(e.name as string) && String(e.channel ?? '').startsWith(prefix),
		);
		if (matched.length === 0) {
			return { webhookResponse: 'ok', workflowData: [] };
		}

		const timeMs = body.time_ms as number;
		const items =
			options.split === false
				? [{ json: { time_ms: timeMs, events: matched } }]
				: matched.map((e) => ({ json: { ...e, time_ms: timeMs } }));
		return { workflowData: [this.helpers.returnJsonArray(items.map((i) => i.json))] };
	}
}
