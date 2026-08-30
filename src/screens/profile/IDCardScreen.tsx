import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ShieldCheck,
  QrCode,
  Sparkles,
  Share2,
  Building,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { OFFICE_TIMINGS } from "../../services/attendanceService";

export default function IDCardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();

  const employeeName = user?.fullName || user?.name || "Arif Chowdhury";
  const employeeCode = user?.employeeCode || "EMP-1029";
  const designation = user?.designation || "Senior Software Engineer";
  const department = user?.department || "Engineering & AI Tech";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Digital Employee ID Card\nName: ${employeeName}\nID: ${employeeCode}\nDesignation: ${designation}\nOrganization: Vertex Tech / Smart Attendance Portal\nVerified Biometric ID`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Employee ID</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={18} color="#00B050" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Lanyard Clip Top Simulation */}
        <View style={styles.lanyardTop}>
          <View style={styles.lanyardStrap} />
          <View style={styles.lanyardClip} />
        </View>

        {/* Digital ID Card */}
        <View style={styles.idCard}>
          {/* Card Header */}
          <View style={styles.cardTopBanner}>
            <View style={styles.corpLogoRow}>
              <View style={styles.corpLogo}>
                <Text style={styles.corpLogoText}>SA</Text>
              </View>
              <View>
                <Text style={styles.corpName}>SMART ATTENDANCE</Text>
                <Text style={styles.corpSub}>ENTERPRISE BIOMETRIC ACCESS</Text>
              </View>
            </View>
            <View style={styles.chipGraphic}>
              <ShieldCheck size={22} color="#00B050" />
            </View>
          </View>

          {/* Holographic Chip Bar */}
          <View style={styles.chipBar}>
            <View style={styles.nfcChip}>
              <View style={styles.nfcLines} />
              <Text style={styles.nfcText}>NFC ACCESS</Text>
            </View>
            <View style={styles.securityBadge}>
              <Sparkles size={11} color="#059669" />
              <Text style={styles.securityText}>ENCRYPTED BIOMETRICS</Text>
            </View>
          </View>

          {/* Photo & Main Details */}
          <View style={styles.profileSection}>
            <View style={styles.photoContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {employeeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.verifiedIcon}>
                <CheckCircle2 size={16} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.nameText}>{employeeName}</Text>
            <Text style={styles.designationText}>{designation}</Text>

            <View style={styles.empIdBadge}>
              <Text style={styles.empIdLabel}>EMP CODE:</Text>
              <Text style={styles.empIdVal}>{employeeCode}</Text>
            </View>
          </View>

          {/* Grid Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DEPARTMENT</Text>
              <Text style={styles.infoValue}>{department}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>SHIFT HOURS</Text>
              <Text style={styles.infoValue}>{OFFICE_TIMINGS.shiftStart} - {OFFICE_TIMINGS.shiftEnd}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>JOIN DATE</Text>
              <Text style={styles.infoValue}>15 Jan 2024</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VALID THRU</Text>
              <Text style={[styles.infoValue, { color: "#00B050" }]}>DEC 2028</Text>
            </View>
          </View>

          {/* Digital QR Code & Barcode Section */}
          <View style={styles.barcodeSection}>
            <View style={styles.qrBox}>
              <QrCode size={46} color="#0F172A" />
            </View>
            <View style={styles.barcodeLinesCol}>
              <View style={styles.barcodeGraphic}>
                {[1, 3, 2, 4, 1, 2, 4, 3, 2, 1, 3, 2, 4, 2, 1, 3, 4, 2].map((w, i) => (
                  <View
                    key={i}
                    style={{
                      width: w * 2,
                      height: 28,
                      backgroundColor: "#0F172A",
                      marginRight: 2,
                    }}
                  />
                ))}
              </View>
              <Text style={styles.barcodeDigits}>* {employeeCode}-2026-BIO *</Text>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>OFFICIAL CORPORATE PROPERTY · ISSUED BY HR</Text>
            <View style={styles.footerDot} />
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityBox}>
          <ShieldCheck size={18} color="#00B050" />
          <Text style={styles.securityBoxText}>
            This digital credential is tied to your facial biometrics and GPS office radius. Always present this card during office entry.
          </Text>
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
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: "center",
  },
  lanyardTop: {
    alignItems: "center",
    marginBottom: -8,
    zIndex: 10,
  },
  lanyardStrap: {
    width: 22,
    height: 30,
    backgroundColor: "#00B050",
    borderRadius: 4,
  },
  lanyardClip: {
    width: 36,
    height: 12,
    backgroundColor: "#94A3B8",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#64748B",
  },
  idCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
  cardTopBanner: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  corpLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  corpLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#00B050",
    alignItems: "center",
    justifyContent: "center",
  },
  corpLogoText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  corpName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  corpSub: {
    color: "#94A3B8",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chipGraphic: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
  },
  chipBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  nfcChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nfcLines: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  nfcText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  securityText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#00B050",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ECFDF5",
    shadowColor: "#00B050",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  verifiedIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#00B050",
    borderRadius: 10,
    padding: 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  designationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  empIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  empIdLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  empIdVal: {
    fontSize: 12,
    fontWeight: "900",
    color: "#00B050",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoItem: {
    width: "50%",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  barcodeSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  qrBox: {
    padding: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  barcodeLinesCol: {
    alignItems: "flex-end",
  },
  barcodeGraphic: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  barcodeDigits: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 4,
    letterSpacing: 1,
  },
  cardFooter: {
    backgroundColor: "#0F172A",
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00B050",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 20,
    width: "100%",
  },
  securityBoxText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    fontWeight: "500",
  },
});
