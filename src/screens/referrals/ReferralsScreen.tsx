import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  CreditCard,
  Users,
  Clock,
  ArrowUpRight,
  HelpCircle,
  X,
  Wallet,
  Building2,
  DollarSign,
  AlertCircle,
} from "lucide-react-native";
import { referralsApi } from "../../api/referrals";
import { ReferralAccount, ReferralWithdrawal } from "../../types";
import { useAuth } from "../../context/AuthContext";

type PaymentMethodType = "bKash" | "Nagad" | "Rocket" | "Bank";

export default function ReferralsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();

  // Primary State
  const defaultCode = user?.employeeCode || "REF-" + (user?.id?.slice(-4) || "2026");
  const [account, setAccount] = useState<ReferralAccount>({
    referralCode: defaultCode,
    referralLink: `https://smartattendance.io/signup?ref=${defaultCode}`,
    commissionRate: 20.0,
    availableBalance: 0.0,
    pendingCommission: 0.0,
    totalClicks: 0,
    totalRegistrations: 0,
    totalPaidCustomers: 0,
    totalEarnings: 0.0,
  });

  const [withdrawals, setWithdrawals] = useState<ReferralWithdrawal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Withdrawal Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>("bKash");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState<boolean>(false);

  // Load Referral and Withdrawal Data from Backend API
  const fetchReferralData = async () => {
    try {
      const [accRes, linkRes, withRes, statsRes] = await Promise.allSettled([
        referralsApi.getAccount(),
        referralsApi.getLink(),
        referralsApi.getWithdrawals(),
        referralsApi.getStats(),
      ]);

      let refCode = defaultCode;
      let refLink = `https://smartattendance.io/signup?ref=${defaultCode}`;

      // 1. Check referral link endpoint
      if (linkRes.status === "fulfilled" && linkRes.value?.success && linkRes.value.data) {
        if (linkRes.value.data.link) refLink = linkRes.value.data.link;
        if (linkRes.value.data.code) refCode = linkRes.value.data.code;
      }

      // 2. Check referral account endpoint
      let accData: Partial<ReferralAccount> = {};
      if (accRes.status === "fulfilled" && accRes.value?.success && accRes.value.data) {
        accData = accRes.value.data;
      }

      // 3. Check stats endpoint
      let statsData: any = {};
      if (statsRes.status === "fulfilled" && statsRes.value?.success && statsRes.value.data) {
        statsData = statsRes.value.data;
      }

      // 4. Check withdrawals history
      if (withRes.status === "fulfilled" && withRes.value?.success && Array.isArray(withRes.value.data)) {
        setWithdrawals(withRes.value.data);
      } else if (accData.withdrawals && Array.isArray(accData.withdrawals)) {
        setWithdrawals(accData.withdrawals);
      }

      const available = Number(accData.availableBalance ?? statsData.availableBalance ?? 0);
      const pending = Number(accData.pendingCommission ?? statsData.pendingCommission ?? 0);
      const earned = Number(accData.totalEarnings ?? statsData.totalEarnings ?? (available + pending));

      setAccount({
        referralCode: accData.referralCode || refCode,
        referralLink: accData.referralLink || refLink,
        commissionRate: Number(accData.commissionRate ?? statsData.commissionRate ?? 20.0),
        availableBalance: available,
        pendingCommission: pending,
        totalClicks: Number(accData.totalClicks ?? statsData.totalClicks ?? 0),
        totalRegistrations: Number(accData.totalRegistrations ?? statsData.totalRegistrations ?? 0),
        totalPaidCustomers: Number(accData.totalPaidCustomers ?? statsData.totalPaidCustomers ?? 0),
        totalEarnings: earned,
      });
    } catch (e) {
      console.log("Referrals data fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReferralData();
  }, []);

  // Copy Handlers
  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(account.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      Alert.alert("Referral Code", account.referralCode);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(account.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      Alert.alert("Referral Link", account.referralLink);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: "Smart Attendance Partner Invite",
        message: `Use Smart Attendance for GPS & Biometric attendance tracking!\n\nSign up with my partner code "${account.referralCode}" or click the link to get 30 days trial:\n${account.referralLink}`,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  // Open Withdraw Modal
  const openWithdrawModal = () => {
    if (account.availableBalance <= 0) {
      Alert.alert(
        "No Balance Available",
        "You currently have no withdrawable balance. Share your referral link with businesses to start earning."
      );
      return;
    }
    setWithdrawAmount(account.availableBalance > 0 ? account.availableBalance.toString() : "");
    setModalVisible(true);
  };

  // Submit Withdrawal Request
  const handleSubmitWithdrawal = async () => {
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid withdrawal amount.");
      return;
    }

    if (amountNum > account.availableBalance) {
      Alert.alert(
        "Insufficient Balance",
        `Your maximum withdrawable balance is $${account.availableBalance.toFixed(2)}`
      );
      return;
    }

    if (!accountNumber.trim()) {
      Alert.alert(
        "Account Details Required",
        `Please enter your ${selectedMethod} mobile number or account details.`
      );
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res: any = await referralsApi.requestWithdrawal({
        amount: amountNum,
        paymentMethod: selectedMethod,
        paymentDetails: accountNumber.trim(),
        accountName: accountName.trim() || user?.fullName || "Employee",
      });

      if (res?.success || res?.status === 200 || res?.message?.includes("success")) {
        Alert.alert(
          "Withdrawal Request Submitted",
          `Your payout request of $${amountNum.toFixed(2)} to ${selectedMethod} (${accountNumber.trim()}) has been submitted for processing.`
        );
        setModalVisible(false);
        setAccountNumber("");
        setAccountName("");
        fetchReferralData();
      } else {
        Alert.alert("Notice", res?.message || "Withdrawal request submitted successfully.");
        setModalVisible(false);
        fetchReferralData();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit withdrawal request. Please try again.");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Refer & Earn Rewards</Text>
          <Text style={styles.headerSubtitle}>Partner & Affiliate Program</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={fetchReferralData}
          activeOpacity={0.7}
        >
          <Sparkles size={18} color="#00B050" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B050" />
          <Text style={styles.loadingText}>Loading referral data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00B050"
              colors={["#00B050"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Main Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.commissionBadge}>
                <Sparkles size={13} color="#4ADE80" />
                <Text style={styles.commissionBadgeText}>
                  {account.commissionRate}% Lifetime Commission
                </Text>
              </View>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>Active Partner</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Earn 20% Recurring Monthly Income</Text>
            <Text style={styles.heroDesc}>
              Share your partner code or link with organizations. Earn 20% recurring monthly payout on every active paid business.
            </Text>

            {/* Referral Code Container */}
            <View style={styles.codeContainer}>
              <View style={styles.codeDetails}>
                <Text style={styles.codeLabel}>YOUR PARTNER CODE</Text>
                <Text style={styles.codeValue}>{account.referralCode}</Text>
              </View>
              <TouchableOpacity
                style={[styles.copyCodeBtn, copiedCode && styles.copiedBtn]}
                onPress={handleCopyCode}
                activeOpacity={0.8}
              >
                {copiedCode ? (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={styles.copyBtnText}>Copied!</Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color="#FFFFFF" />
                    <Text style={styles.copyBtnText}>Copy Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.shareFullBtn}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.copyLinkBtn, copiedLink && styles.copiedLinkBtn]}
                onPress={handleCopyLink}
                activeOpacity={0.85}
              >
                {copiedLink ? (
                  <>
                    <Check size={15} color="#00B050" />
                    <Text style={[styles.copyLinkBtnText, { color: "#00B050" }]}>Copied!</Text>
                  </>
                ) : (
                  <>
                    <Copy size={15} color="#0F172A" />
                    <Text style={styles.copyLinkBtnText}>Copy Link</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallet / Earnings Section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Wallet size={18} color="#00B050" />
              <Text style={styles.sectionTitle}>Earnings Wallet</Text>
            </View>
          </View>

          <View style={styles.walletGrid}>
            {/* Available Balance Card */}
            <View style={[styles.walletCard, styles.walletCardAvailable]}>
              <View style={styles.walletCardTop}>
                <Text style={styles.walletCardLabel}>Available Balance</Text>
                <View style={styles.walletIconWrap}>
                  <DollarSign size={16} color="#00B050" />
                </View>
              </View>
              <Text style={styles.walletCardAmount}>
                ${account.availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.withdrawActionBtn,
                  account.availableBalance <= 0 && styles.withdrawActionBtnDisabled,
                ]}
                onPress={openWithdrawModal}
                activeOpacity={0.8}
              >
                <CreditCard size={13} color="#FFFFFF" />
                <Text style={styles.withdrawActionBtnText}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            {/* Pending Commission Card */}
            <View style={styles.walletCard}>
              <View style={styles.walletCardTop}>
                <Text style={styles.walletCardLabel}>Pending Clearance</Text>
                <View style={[styles.walletIconWrap, { backgroundColor: "#FEF3C7" }]}>
                  <Clock size={16} color="#D97706" />
                </View>
              </View>
              <Text style={[styles.walletCardAmount, { color: "#D97706" }]}>
                ${account.pendingCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.pendingHintText}>7-14 days clearance hold</Text>
            </View>
          </View>

          {/* Partner Metrics / Stats Section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <TrendingUp size={18} color="#0284C7" />
              <Text style={styles.sectionTitle}>Partner Metrics</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <View style={[styles.statIconBox, { backgroundColor: "#F0F9FF" }]}>
                  <TrendingUp size={16} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Link Clicks</Text>
                  <Text style={styles.statSub}>Total visitors through your link</Text>
                </View>
              </View>
              <Text style={styles.statValue}>{account.totalClicks} Visits</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statLeft}>
                <View style={[styles.statIconBox, { backgroundColor: "#F3E8FF" }]}>
                  <Building2 size={16} color="#9333EA" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Registered Organizations</Text>
                  <Text style={styles.statSub}>Companies registered via your referral</Text>
                </View>
              </View>
              <Text style={styles.statValue}>{account.totalRegistrations} Orgs</Text>
            </View>

            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <View style={styles.statLeft}>
                <View style={[styles.statIconBox, { backgroundColor: "#DCFCE7" }]}>
                  <CheckCircle2 size={16} color="#00B050" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Paid Subscriptions</Text>
                  <Text style={styles.statSub}>Active premium subscribing accounts</Text>
                </View>
              </View>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>{account.totalPaidCustomers} Active</Text>
              </View>
            </View>
          </View>

          {/* Withdrawals History List (If Any) */}
          {withdrawals.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <CreditCard size={18} color="#0F172A" />
                  <Text style={styles.sectionTitle}>Withdrawal History</Text>
                </View>
              </View>

              <View style={styles.historyCard}>
                {withdrawals.slice(0, 5).map((w, idx) => {
                  const isSuccess = w.status === "PAID" || w.status === "COMPLETED" || w.status === "APPROVED";
                  const isPending = w.status === "PENDING";
                  return (
                    <View
                      key={w.id || idx}
                      style={[
                        styles.historyItem,
                        idx === Math.min(withdrawals.length, 5) - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.historyLeft}>
                        <View
                          style={[
                            styles.historyIconBox,
                            {
                              backgroundColor: isSuccess
                                ? "#DCFCE7"
                                : isPending
                                ? "#FEF3C7"
                                : "#FEE2E2",
                            },
                          ]}
                        >
                          <ArrowUpRight
                            size={16}
                            color={isSuccess ? "#00B050" : isPending ? "#D97706" : "#DC2626"}
                          />
                        </View>
                        <View>
                          <Text style={styles.historyMethod}>
                            {w.paymentMethod} • {w.paymentDetails}
                          </Text>
                          <Text style={styles.historyDate}>
                            {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "Recent"}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.historyAmount}>${w.amount?.toFixed(2)}</Text>
                        <Text
                          style={[
                            styles.historyStatus,
                            {
                              color: isSuccess ? "#00B050" : isPending ? "#D97706" : "#DC2626",
                            },
                          ]}
                        >
                          {isSuccess ? "Paid" : isPending ? "Processing" : "Cancelled"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* How It Works Guide */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <HelpCircle size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>
          </View>

          <View style={styles.guideCard}>
            <View style={styles.guideStep}>
              <View style={styles.stepNumberBox}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code or Link</Text>
                <Text style={styles.stepDesc}>
                  Share your unique referral link or partner code with companies, shops, or offices.
                </Text>
              </View>
            </View>

            <View style={styles.guideStep}>
              <View style={styles.stepNumberBox}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Organizations Subscribe</Text>
                <Text style={styles.stepDesc}>
                  They receive a 30-day free trial and activate a recurring business subscription.
                </Text>
              </View>
            </View>

            <View style={[styles.guideStep, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={[styles.stepNumberBox, { backgroundColor: "#00B050" }]}>
                <Text style={[styles.stepNumber, { color: "#FFFFFF" }]}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Receive Monthly Payouts</Text>
                <Text style={styles.stepDesc}>
                  Earn 20% recurring monthly commissions directly into your wallet and withdraw via bKash, Nagad, or Bank.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Withdrawal Bottom Sheet / Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Withdrawal Request</Text>
                <Text style={styles.modalSubtitle}>
                  Available: ${account.availableBalance.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.inputLabel}>Select Payment Method</Text>
            <View style={styles.methodSelector}>
              {(["bKash", "Nagad", "Rocket", "Bank"] as PaymentMethodType[]).map((method) => {
                const isSelected = selectedMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodBtn, isSelected && styles.methodBtnActive]}
                    onPress={() => setSelectedMethod(method)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.methodBtnText,
                        isSelected && styles.methodBtnTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account / Mobile Number Input */}
            <Text style={styles.inputLabel}>
              {selectedMethod === "Bank" ? "Bank Name, Account & Branch Details" : `${selectedMethod} Account Number`}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={selectedMethod === "Bank" ? "Bank Name, Account Number, Branch" : "017XXXXXXXX"}
              placeholderTextColor="#94A3B8"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType={selectedMethod === "Bank" ? "default" : "phone-pad"}
            />

            {/* Account Holder Name (Optional) */}
            <Text style={styles.inputLabel}>Account Holder Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your Full Name"
              placeholderTextColor="#94A3B8"
              value={accountName}
              onChangeText={setAccountName}
            />

            {/* Amount Input */}
            <Text style={styles.inputLabel}>Withdrawal Amount ($ USD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />

            {/* Quick Amount Button */}
            <TouchableOpacity
              style={styles.fullAmountBtn}
              onPress={() => setWithdrawAmount(account.availableBalance.toString())}
            >
              <Text style={styles.fullAmountText}>
                Withdraw Full Balance (${account.availableBalance.toFixed(2)})
              </Text>
            </TouchableOpacity>

            {/* Submit Action */}
            <TouchableOpacity
              style={[
                styles.submitWithdrawBtn,
                submittingWithdraw && { opacity: 0.7 },
              ]}
              onPress={handleSubmitWithdrawal}
              disabled={submittingWithdraw}
              activeOpacity={0.85}
            >
              {submittingWithdraw ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitWithdrawBtnText}>Submit Payout Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#00B050",
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  heroBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  commissionBadgeText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "800",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  activePillText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },

  // Code Container
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderStyle: "dashed",
    marginBottom: 14,
  },
  codeDetails: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 16,
    color: "#38BDF8",
    fontWeight: "900",
    letterSpacing: 1,
  },
  copyCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copiedBtn: {
    backgroundColor: "#00B050",
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // Action Buttons
  actionBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareFullBtn: {
    flex: 1.4,
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  copyLinkBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  copiedLinkBtn: {
    backgroundColor: "#DCFCE7",
  },
  copyLinkBtnText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Wallet Cards
  walletGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  walletCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    justifyContent: "space-between",
  },
  walletCardAvailable: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  walletCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  walletIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  walletCardAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#00B050",
    marginVertical: 8,
  },
  withdrawActionBtn: {
    flexDirection: "row",
    backgroundColor: "#00B050",
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  withdrawActionBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  withdrawActionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  pendingHintText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },

  // Stats Card
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  statSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  paidBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    color: "#00B050",
    fontSize: 11,
    fontWeight: "800",
  },

  // History Card
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  historyMethod: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  historyDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },

  // Guide Card
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  guideStep: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepNumberBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },

  // Modal / Withdrawal Form
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#00B050",
    fontWeight: "700",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 8,
  },
  methodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnActive: {
    backgroundColor: "#00B050",
    borderColor: "#00B050",
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  methodBtnTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 8,
  },
  fullAmountBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 4,
  },
  fullAmountText: {
    fontSize: 11,
    color: "#00B050",
    fontWeight: "800",
  },
  submitWithdrawBtn: {
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
    marginTop: 4,
  },
  submitWithdrawBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
