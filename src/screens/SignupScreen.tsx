import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Formik } from "formik";

export default function SignupScreen({ navigation }: any) {
  const { signUp } = useAuth();

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validate = (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    const errors: Record<string, string> = {};
    if (!values.name || !values.name.trim()) {
      errors.name = "Vui lòng nhập họ tên";
    }
    if (!values.email || !values.email.trim()) {
      errors.email = "Vui lòng nhập email";
    } else if (!validateEmail(values.email)) {
      errors.email = "Email không hợp lệ";
    }
    if (!values.password) {
      errors.password = "Vui lòng nhập mật khẩu";
    } else if (values.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (!values.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Mật khẩu không khớp";
    }
    return errors;
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Tạo tài khoản</Text>

            <View style={styles.inputContainer}>
              <Formik
                initialValues={{
                  name: "Khuyen",
                  email: "khuyen5@gmail.com",
                  password: "666666",
                  confirmPassword: "666666",
                }}
                validate={validate}
                onSubmit={async (values, { setSubmitting }) => {
                  try {
                    await signUp(values.email, values.password, values.name);
                    navigation.replace("BudgetSetup", { fromSignup: true });
                  } catch (error: any) {
                    Alert.alert(
                      "Lỗi",
                      error?.message || "Không thể tạo tài khoản"
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  errors,
                  touched,
                  isSubmitting,
                }) => (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Họ và tên</Text>
                      <TextInput
                        value={values.name}
                        onChangeText={handleChange("name")}
                        onBlur={handleBlur("name")}
                        style={styles.input}
                        autoCapitalize="words"
                        editable={!isSubmitting}
                        placeholder="Nguyễn Văn A"
                        placeholderTextColor="#B0B0B0"
                      />
                      {touched.name && errors.name ? (
                        <Text style={styles.errorText}>{errors.name}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        value={values.email}
                        onChangeText={handleChange("email")}
                        onBlur={handleBlur("email")}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                        placeholder="email@vd.com"
                        placeholderTextColor="#B0B0B0"
                      />
                      {touched.email && errors.email ? (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Mật khẩu</Text>
                      <TextInput
                        value={values.password}
                        onChangeText={handleChange("password")}
                        onBlur={handleBlur("password")}
                        style={styles.input}
                        secureTextEntry
                        editable={!isSubmitting}
                        placeholder="Ít nhất 6 ký tự"
                        placeholderTextColor="#B0B0B0"
                      />
                      {touched.password && errors.password ? (
                        <Text style={styles.errorText}>{errors.password}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Xác nhận mật khẩu</Text>
                      <TextInput
                        value={values.confirmPassword}
                        onChangeText={handleChange("confirmPassword")}
                        onBlur={handleBlur("confirmPassword")}
                        style={styles.input}
                        secureTextEntry
                        editable={!isSubmitting}
                        placeholder="Nhập lại mật khẩu"
                        placeholderTextColor="#B0B0B0"
                      />
                      {touched.confirmPassword && errors.confirmPassword ? (
                        <Text style={styles.errorText}>
                          {errors.confirmPassword}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.signUpButton,
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      onPress={handleSubmit as any}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <Text style={styles.signUpButtonText}>Đăng ký</Text>
                      )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                      <Text style={styles.loginText}>Đã có tài khoản? </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate("Login")}
                      >
                        <Text style={styles.loginLink}>Đăng nhập</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Formik>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 12,
  },
  formContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 24,
    // minimal shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#FFFFFF",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#B0B0B0",
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 6,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#0F0F0F",
    color: "#FFFFFF",
  },
  signUpButton: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#333333",
  },
  signUpButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: "#B0B0B0",
  },
  loginLink: {
    fontSize: 14,
    color: "#FFA474",
    fontWeight: "600",
  },
});
