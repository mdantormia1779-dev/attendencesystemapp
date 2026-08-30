import { apiRequest } from "./client";
import { ReferralAccount } from "../types";

export const referralsApi = {
  getAccount: async () => {
    return apiRequest<ReferralAccount>("/api/referrals");
  },

  getLink: async () => {
    return apiRequest<{ link: string; code: string }>("/api/referrals/link");
  },

  requestWithdrawal: async (req: { amount: number; paymentMethod: string; paymentDetails: string }) => {
    return apiRequest("/api/withdrawals", {
      method: "POST",
      body: req,
    });
  },
};
