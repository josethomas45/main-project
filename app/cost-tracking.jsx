import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CostTracking() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Fuel",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const categories = ["All", "Fuel", "Maintenance", "Repair", "Insurance", "Other"];
  const categoryIcons = {
    Fuel: "water",
    Maintenance: "build",
    Repair: "hammer",
    Insurance: "shield-checkmark",
    Other: "card",
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const response = await fetch(`${BACKEND_URL}/vehicle/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      Alert.alert("Error", "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!formData.title.trim() || !formData.amount.trim()) {
      Alert.alert("Error", "Please fill in title and amount");
      return;
    }

    try {
      const token = await getToken();
      
      const response = await fetch(`${BACKEND_URL}/vehicle/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Expense added successfully");
        setModalVisible(false);
        resetForm();
        fetchExpenses();
      } else {
        Alert.alert("Error", "Failed to add expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      Alert.alert("Error", "Failed to add expense");
    }
  };

  const deleteExpense = async (expenseId) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              
              const response = await fetch(
                `${BACKEND_URL}/vehicle/expenses/${expenseId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                fetchExpenses();
              } else {
                Alert.alert("Error", "Failed to delete expense");
              }
            } catch (error) {
              console.error("Error deleting expense:", error);
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      category: "Fuel",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const filteredExpenses = expenses.filter(
    (expense) => selectedCategory === "All" || expense.category === selectedCategory
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

  const categoryTotals = expenses.reduce((acc, expense) => {
    if (expense.category !== "All") {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    }
    return acc;
  }, {});

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseIconContainer}>
          <Ionicons
            name={categoryIcons[item.category] || "card"}
            size={24}
            color="#27374D"
          />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Text style={styles.expenseDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>₹{item.amount.toFixed(2)}</Text>
          <TouchableOpacity
            onPress={() => deleteExpense(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
      {item.notes ? (
        <Text style={styles.expenseNotes}>{item.notes}</Text>
      ) : null}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{item.category}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#27374D" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cost Tracking</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Expenses</Text>
        <Text style={styles.summaryAmount}>₹{totalExpenses.toFixed(2)}</Text>
        <Text style={styles.summaryPeriod}>
          {selectedCategory === "All" ? "All Categories" : selectedCategory}
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
            {category !== "All" && categoryTotals[category] && (
              <Text
                style={[
                  styles.categoryChipAmount,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                ₹{categoryTotals[category].toFixed(0)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expenses List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : filteredExpenses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="wallet-outline" size={64} color="#9DB2BF" />
          <Text style={styles.emptyText}>No expenses found</Text>
          <Text style={styles.emptySubtext}>
            Tap + to add your first expense
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.expensesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Expense Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#27374D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholder="e.g., Oil Change"
                placeholderTextColor="#9DB2BF"
              />

              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9DB2BF"
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelector}
              >
                {categories.filter((c) => c !== "All").map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categorySelectorItem,
                      formData.category === category &&
                        styles.categorySelectorItemActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category })
                    }
                  >
                    <Ionicons
                      name={categoryIcons[category]}
                      size={20}
                      color={
                        formData.category === category ? "#fff" : "#27374D"
                      }
                    />
                    <Text
                      style={[
                        styles.categorySelectorText,
                        formData.category === category &&
                          styles.categorySelectorTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) =>
                  setFormData({ ...formData, date: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9DB2BF"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="Add notes..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#9DB2BF"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={addExpense}
              >
                <Text style={styles.submitBtnText}>Add Expense</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#27374D",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#27374D",
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#9DB2BF",
    fontSize: 14,
    marginBottom: 8,
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryPeriod: {
    color: "#9DB2BF",
    fontSize: 12,
  },
  categoryFilter: {
    maxHeight: 60,
    marginBottom: 8,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: "#27374D",
  },
  categoryChipText: {
    color: "#27374D",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  categoryChipAmount: {
    fontSize: 12,
    color: "#666",
  },
  expensesList: {
    padding: 16,
    paddingTop: 8,
  },
  expenseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  expenseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: "#666",
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#27374D",
    marginBottom: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  expenseNotes: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#27374D",
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#27374D",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27374D",
  },
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27374D",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#27374D",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    marginVertical: 8,
  },
  categorySelectorItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    gap: 6,
  },
  categorySelectorItemActive: {
    backgroundColor: "#27374D",
  },
  categorySelectorText: {
    fontSize: 14,
    color: "#27374D",
    fontWeight: "500",
  },
  categorySelectorTextActive: {
    color: "#fff",
  },
  submitBtn: {
    backgroundColor: "#27374D",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});