import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import mixpanel from 'mixpanel';

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../openapi';
import {
  ActionsSpecGetResponse,
  ActionsSpecPostRequestBody,
  ActionsSpecPostResponse,
} from '../../spec/actions-spec';
import { prepareTransaction } from '../transaction-utils';
import cudisApi from './cudis-api';

import { DONATION_DESTINATION_WALLET, mixpanel_id } from '../config';

mixpanel.init(
  mixpanel_id,
  {
    host: "api-eu.mixpanel.com",
  },
);

// console.log('DONATION_DESTINATION_WALLET', DONATION_DESTINATION_WALLET);
const DONATION_AMOUNT_SOL_OPTIONS = [1, 5, 10];
const DEFAULT_DONATION_AMOUNT_SOL = 1.5;

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const response = { message: 'Server is healthy' };
    return c.json(response, 200);
  },
);

app.openapi(
  createRoute({
    method: 'get',
    path: '/buy',
    tags: ['Cudis'],
    responses: actionsSpecOpenApiGetResponse,
  }),
  (c) => {
    const { icon, title, description } = getCudisInfo();
    const inviteCodeParameterName = 'inviteCode';
    const response: ActionsSpecGetResponse = {
      icon,
      label: `${DEFAULT_DONATION_AMOUNT_SOL} SOL`,
      title,
      description,
      links: {
        actions: [
          // ...DONATION_AMOUNT_SOL_OPTIONS.map((amount) => ({
          //   label: `${amount} SOL`,
          //   href: `/api/cudis/${amount}`,
          // })),
          {
            href: `/api/cudis/buy/{${inviteCodeParameterName}}`,
            label: 'Buy',
            parameters: [
              {
                name: inviteCodeParameterName,
                label: 'Enter a invite code',
              },
            ],
          },
          // {
          //   href: `/api/cudis/{${amountParameterName}}`,
          //   label: 'Buy',
          //   parameters: [
          //     {
          //       name: amountParameterName,
          //       label: 'Enter a custom SOL amount',
          //     },
          //   ],
          // },
        ],
      },
    };
    return c.json(response, 200);
  },
);

app.openapi(
  createRoute({
    method: 'get',
    path: '/buy/{inviteCode}',
    tags: ['Cudis'],
    request: {
      params: z.object({
        inviteCode: z.string().openapi({
          param: {
            name: 'inviteCode',
            in: 'path',
          },
          type: 'string',
          example: 'flylol',
        }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const inviteCode = c.req.param('inviteCode');
    let checkInviteCodeRes = await cudisApi.getCheckInviteCode(inviteCode);

    const { discount_switch, real_price, discount_percent } =
      checkInviteCodeRes || {
        discount_switch: false,
        real_price: DEFAULT_DONATION_AMOUNT_SOL,
        discount_percent: 100,
      };
    const { icon, title, description } = getCudisInfo();
    const response: ActionsSpecGetResponse = {
      icon,
      label: `Buy with ${real_price || DEFAULT_DONATION_AMOUNT_SOL} SOL ${discount_switch ? `(${discount_percent}% off)` : ''}`,
      title,
      description,
    };
    return c.json(response, 200);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/buy/{inviteCode}',
    tags: ['Cudis'],
    request: {
      params: z.object({
        inviteCode: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'inviteCode',
              in: 'path',
              required: false,
            },
            type: 'string',
            example: 'flylol',
          }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    let inviteCode = c.req.param('inviteCode');

    const { account } = (await c.req.json()) as ActionsSpecPostRequestBody;

    mixpanel.track('dialect-buy', {
      action: account,
    });
    let bindInviteInfoRes = await cudisApi.getBindInviteInfo(account);

    console.log('bindInviteInfoRes--------', bindInviteInfoRes);

    if (bindInviteInfoRes?.invcode) {
      inviteCode = bindInviteInfoRes?.invcode;
    }

    let checkInviteCodeRes = await cudisApi.getCheckInviteCode(inviteCode);
    console.log('checkInviteCodeRes---------', checkInviteCodeRes);

    if (!checkInviteCodeRes) {
      // return c.json({ message: 'Invalid invite code' }, 400);
      checkInviteCodeRes = {
        inv_pubkey: 'dialect Invalid invite code',
        discount_switch: false,
        real_price: DEFAULT_DONATION_AMOUNT_SOL,
        discount_percent: 100,
      };
    }

    const parsedAmount = parseFloat(checkInviteCodeRes.real_price);
    const transaction = await prepareDonateTransaction(
      new PublicKey(account),
      new PublicKey(DONATION_DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );
    console.log('transaction--------', transaction);
    const response: ActionsSpecPostResponse = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    };
    console.log('response txhash', response);

    if (!bindInviteInfoRes && checkInviteCodeRes.inv_pubkey) {
      let bindRes = await cudisApi.getBindInviteCode(account, inviteCode);
      console.log('bindRes------', bindRes);
    }
    let reportRes = await cudisApi.getReportBuyOrder(
      checkInviteCodeRes.inv_pubkey,
      account,
      1,
      checkInviteCodeRes.discount_switch
        ? checkInviteCodeRes.discount_percent
        : 100,
      checkInviteCodeRes.real_price,
      1,
      response.transaction,
    );
    console.log('reportRes-------', reportRes);

    return c.json(response, 200);
  },
);

function getCudisInfo(): Pick<
  ActionsSpecGetResponse,
  'icon' | 'title' | 'description'
> {
  const icon = 'https://static.cudis.xyz/static/cudis_logo_new.jpg';
  const title = 'Get the CUDIS Ring!';
  const description =
    'The first stage sold out in 10 days, and now we’re in stage two. Join us—you’re still early! (Enter shipping address on cudis.xyz/dashboard 10 mins after purchase.)';
  return { icon, title, description };
}

async function prepareDonateTransaction(
  sender: PublicKey,
  recipient: PublicKey,
  lamports: number,
): Promise<VersionedTransaction> {
  const payer = new PublicKey(sender);
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(recipient),
      lamports: lamports,
    }),
  ];
  return prepareTransaction(instructions, payer);
}

export default app;
