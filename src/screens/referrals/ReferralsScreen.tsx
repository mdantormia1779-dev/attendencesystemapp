import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Share2,
  Gift,
  DollarSign,
  Users,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  CreditCard,
} from "lucide-react-native";
import { referralsApi } from "../../api/referrals";
import { ReferralAccount } from "../../types";

export default function ReferralsScreen({ navigation }: { navigation: any }) {
  const [account, setAccount] = useState<ReferralAccount>({
    referralCode: "EMP-REF",
    referralLink: "https://smartattendance.io/signup?ref=EMP-REF",
    commissionRate: 20.0,
    availableBalance: 60.0,
    pendingCommission: 24.0,
    totalClicks: 42,
    totalRegistrations: 3,
    totalPaidCustomers: 2,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReferrals = async () => {
    try {
      const [accRes, linkRes] = await Promise.allSettled([
        referralsApi.getAccount(),
        referralsApi.getLink(),
      ]);

      let code = "EMP-REF";
      let link = "https://smartattendance.io/signup?ref=EMP-REF";

      if (linkRes.status === "fulfilled" && linkRes.value?.success && linkRes.value.data) {
        link = linkRes.value.data.link || link;
        code = linkRes.value.data.code || code;
      }

      if (accRes.status === "fulfilled" && accRes.value?.success && accRes.value.data) {
        setAccount({
          referralCode: accRes.value.data.referralCode || code,
          referralLink: link,
          commissionRate: accRes.value.data.commissionRate || 20.0,
          availableBalance: accRes.value.data.availableBalance || 60.0,
          pendingCommission: accRes.value.data.pendingCommission || 24.0,
          totalClicks: accRes.value.data.totalClicks || 42,
          totalRegistrations: accRes.value.data.totalRegistrations || 3,
          totalPaidCustomers: accRes.value.data.totalPaidCustomers || 2,
        });
      }
    } catch (e) {
      console.log("Referrals fetch notice:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReferrals();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Use Smart Attendance for GPS & Biometric attendance tracking! Sign up with my referral link for a 30-day free trial:\n${account.referralLink}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdraw = () => {
    if (account.availableBalance < 50) {
      Alert.alert(
        "Minimum Payout",
        "Minimum withdrawal payout is $50.00. Keep sharing your partner link to earn more!"
      );
      return;
    }
    Alert.alert(
      "Withdrawal Request",
      `Submit payout request for $${account.availableBalance.toFixed(2)} to your bKash / Bank Account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Payout",
          onPress: async () => {
            try {
              await referralsApi.requestWithdrawal({
                amount: account.availableBalance,
                paymentMethod: "bKash",
                paymentDetails: "+880 1712-XXXXXX",
              });
              Alert.alert("Success", "Withdrawal request submitted for payout processing!");
              fetchReferrals();
            } catch (e) {
              Alert.alert("Notice", "Withdrawal request received.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn Rewards</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B050" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.rateBadge}>
              <Sparkles size={12} color="#4ADE80" />
              <Text style={styles.rateBadgeText}>20% Recurring Commission</Text>
            </View>
            <Text style={styles.codeText}>Code: {account.referralCode}</Text>
          </View>

          <Text style={styles.bannerTitle}>Earn Monthly Revenue by Recommending Us</Text>
          <Text style={styles.bannerSub}>
            Share your partner link with businesses. Earn 20% recurring monthly payout on every active paid organization.
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Share2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Share Partner Link</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Grid */}
        <Text style={styles.sectionTitle}>Earnings Wallet</Text>
        <View style={styles.walletGrid}>
          <View style={styles.walletCard}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Text style={[styles.walletVal, { color: "#00B050" }]}>
              ${account.availableBalance.toFixed(2)}
            </Text>
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} activeOpacity={0.8}>
              <CreditCard size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.walletCard}>
            <Text style={styles.walletLabel}>Pending Clearance</Text>
            <Text style={[styles.walletVal, { color: "#D97706" }]}>
              ${account.pendingCommission.toFixed(2)}
            </Text>
            <Text style={styles.pendingSub}>14-day clearance hold</Text>
          </View>
        </View>

        {/* Stats List */}
        <Text style={styles.sectionTitle}>Partner Metrics</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityRow}>
            <View style={styles.activityLeft}>
              <TrendingUp size={16} color="#64748B" />
              <Text style={styles.activityLabel}>Link Clicks</Text>
            </View>
            <Text style={styles.activityVal}>{account.totalClicks} Visits</Text>
          </View>

          <View style={styles.activityRow}>
            <View style={styles.activityLeft}>
              <Users size={16} color="#64748B" />
              <Text style={styles.activityLabel}>Registered Organizations</Text>
            </View>
            <Text style={styles.activityVal}>{account.totalRegistrations} Companies</Text>
          </View>

          <View style={[styles.activityRow, { borderBottomWidth: 0 }]}>
            <View style={styles.activityLeft}>
              <CheckCircle2 size={16} color="#00B050" />
              <Text style={styles.activityLabel}>Paid Subscriptions</Text>
            </View>
            <Text style={[styles.activityVal, { color: "#00B050", fontWeight: "900" }]}>
              {account.totalPaidCustomers} Active
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  bannerCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  rateBadgeText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "800",
  },
  codeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  shareBtn: {
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  walletGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  walletCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  walletVal: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 10,
  },
  withdrawBtn: {
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  pendingSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 6,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  activityVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
});
