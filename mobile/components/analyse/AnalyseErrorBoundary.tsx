/**
 * Port of web components/analyse/analyse-result-error-boundary.tsx — catches
 * render errors on Result / Fix Plan, logs them, and offers "Start again".
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class AnalyseErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[${this.props.label ?? "AnalyseErrorBoundary"}]`,
      error.message,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable
            onPress={() => {
              this.setState({ error: null });
              router.replace("/analyse/form");
            }}
            style={styles.btn}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Start again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
  btn: {
    marginTop: 24,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
  },
  btnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
