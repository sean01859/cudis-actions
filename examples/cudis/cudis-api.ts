interface CudisRequestApplyCodeRes {
  message: string;
  code: number;
  data: any;
}

export const createCudisApi = () => {
  const getCheckInviteCode = async (inviteCode: string) => {
    const url = `https://devtest.cudis.xyz/x/invite/code?invcode=${inviteCode}`;
    const response = await fetch(url);
    const parsedResponse = (await response.json()) as CudisRequestApplyCodeRes;
    return parsedResponse.data;
  };

  const getReportBuyOrder = async (
    inv_pubkey: string,
    pubkey: string,
    amount: number,
    discount: number | string,
    real_price: number,
    token_symbol: number,
    tx: string,
  ) => {
    const url = `https://devtest.cudis.xyz/x/invite/buy/report`;

    const params = {
      inv_pubkey: inv_pubkey,
      pubkey: pubkey,
      amount: amount,
      discount: discount,
      real_price: real_price,
      token_symbol: token_symbol,
      tx: tx,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const parsedResponse = (await response.json()) as CudisRequestApplyCodeRes;
    return parsedResponse.data;
  };

  const getBindInviteInfo = async (pubkey: string) => {
    const url = `https://devtest.cudis.xyz/x/inviteby?pubkey=${pubkey}`;
    const response = await fetch(url);
    const parsedResponse = (await response.json()) as CudisRequestApplyCodeRes;
    return parsedResponse.data;
  };

  const getBindInviteCode = async (pubkey: string, invcode: string) => {
    const params: { pubkey: string; invcode: string; sign: string } = {
      pubkey: pubkey,
      invcode: invcode,
      sign: 'dialect',
    };

    const formBody = Object.keys(params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key as keyof typeof params])}`,
      )
      .join('&');

    // console.log('params getBindInviteCode', params);

    const url = `https://devtest.cudis.xyz/x/inviteby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });
    // console.log('response getBindInviteCode', response);
    const parsedResponse = (await response.json()) as CudisRequestApplyCodeRes;
    return parsedResponse.data;
  };

  //   // promote
  // export const requestPromote = (
  //   params: requestPromoteReq
  // ): Promise<requestPromoteRes> => request.post("/v1/x/get/promotion", params);

  // // update promotion
  // export const requestUpdatePromotion = (
  //   params: requestUpdatePromotionReq
  // ): Promise<requestUpdatePromotionRes> =>
  //   request.post("/v1/x/update/promotion", params);

  return {
    getCheckInviteCode,
    getBindInviteInfo,
    getBindInviteCode,
    getReportBuyOrder,
  };
};

const jupiterApi = createCudisApi();

export default jupiterApi;
