import { Component, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

type Props = { children: ReactNode };
type State = { hasError: boolean };

class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-xl font-bold text-slate-900">Unexpected Error</Text>
          <Text className="mt-2 text-center text-slate-600">
            Something went wrong. Please retry.
          </Text>
          <Pressable className="mt-4 rounded-xl bg-slate-900 px-4 py-2" onPress={() => this.setState({ hasError: false })}>
            <Text className="text-white">Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
