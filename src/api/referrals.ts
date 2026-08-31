import { apiRequest } from "./client";
import { ReferralAccount, ReferralWithdrawal } from "../types";

export const referralsApi = {
  getAccount: async () => {
    return apiRequest<ReferralAccount>("/api/referrals");
  },

  getLink: async () => {
    return apiRequest<{ link: string; code: string }>("/api/referrals/link");
  },

  requestWithdrawal: async (req: {
    amount: number;
    paymentMethod: string;
    paymentDetails: string;
    accountName?: string;
    notes?: string;
  }) => {
    return apiRequest("/api/withdrawals", {
      method: "POST",
      body: req,
    });
  },

  getWithdrawals: async () => {
    return apiRequest<ReferralWithdrawal[]>("/api/withdrawals");
  },

  getStats: async () => {
    return apiRequest<any>("/api/referrals/stats");
  },
};

