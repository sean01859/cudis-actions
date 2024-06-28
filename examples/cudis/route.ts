import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';

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

import { DONATION_DESTINATION_WALLET } from '../config';

console.log('DONATION_DESTINATION_WALLET', DONATION_DESTINATION_WALLET);
const DONATION_AMOUNT_SOL_OPTIONS = [1, 5, 10];
const DEFAULT_DONATION_AMOUNT_SOL = 1.5;

const app = new OpenAPIHono();

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

    let bindInviteInfoRes = await cudisApi.getBindInviteInfo(account);

    if (bindInviteInfoRes?.invcode) {
      inviteCode = bindInviteInfoRes?.invcode;
    }

    let checkInviteCodeRes = await cudisApi.getCheckInviteCode(inviteCode);

    if (!checkInviteCodeRes) {
      return c.json({ message: 'Invalid invite code' }, 400);
    }

    const parsedAmount = parseFloat(checkInviteCodeRes.real_price);
    const transaction = await prepareDonateTransaction(
      new PublicKey(account),
      new PublicKey(DONATION_DESTINATION_WALLET),
      parsedAmount * LAMPORTS_PER_SOL,
    );
    const response: ActionsSpecPostResponse = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
    };

    if (!bindInviteInfoRes) {
      let bindRes = await cudisApi.getBindInviteCode(account, inviteCode);
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

    return c.json(response, 200);
  },
  // async (result, c) => {
  //   console.error('err', result);
  //   // return c.json({ message: 'Internal Server Error' }, 500);
  // },
);

function getCudisInfo(): Pick<
  ActionsSpecGetResponse,
  'icon' | 'title' | 'description'
> {
  const icon = 'https://static.cudis.xyz/static/Blink.png';
  const title = 'Get The Ring';
  const description =
    'Cybersecurity Enthusiast | Support my research with a donation.';
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
